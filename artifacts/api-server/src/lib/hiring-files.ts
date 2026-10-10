import { randomUUID, createHash } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pool } from "@workspace/db";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import { insist } from "./hiring-model";

const storage = new ObjectStorageService();
const exec = promisify(execFile);
const media = new Set(["audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a"]);
export async function reserveUpload(actor: string, input: any) {
  insist(input.testDataConfirmed === true, "internal_test_data_confirmation_required");
  const mime = input.contentType.split(";")[0].trim();
  insist(input.kind === "audio" ? media.has(mime) : ["text/plain", "text/markdown"].includes(mime), "unsupported_content_type");
  insist(input.size <= (input.kind === "audio" ? 20 * 1024 * 1024 : 256 * 1024), "file_too_large");
  if (input.kind === "markdown") insist(/\.(md|txt)$/i.test(input.name), "unsupported_extension");
  const count = await pool.query("SELECT count(*)::int n FROM hiring_uploads WHERE owner_id=$1 AND created_at>now()-interval '1 hour'", [actor]);
  insist(count.rows[0].n < 60, "upload_limit_reached", 429);
  const uploadUrl = await storage.getObjectEntityUploadURL();
  const id = randomUUID();
  await pool.query("INSERT INTO hiring_uploads(id,owner_id,object_path,data) VALUES($1,$2,$3,$4)", [
    id, actor, storage.normalizeObjectEntityPath(uploadUrl),
    { ...input, contentType: mime, status: "reserved", processingState: "not_requested", originalAsr: null, words: [], provider: null },
  ]);
  return { id, uploadUrl };
}
export async function inspectBytes(bytes: Buffer, kind: string, mime: string) {
  if (kind === "markdown") {
    insist(bytes.length <= 256 * 1024 && !bytes.includes(0), "invalid_text");
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new Error("invalid_utf8"); }
    insist(text.trim().length, "empty_text");
    return { text };
  }
  const dir = await mkdtemp(join(tmpdir(), "sauce-audio-"));
  try {
    const file = join(dir, "recording");
    await writeFile(file, bytes);
    const { stdout } = await exec("ffprobe", ["-v", "error", "-protocol_whitelist", "file,pipe", "-show_format", "-show_streams", "-of", "json", file], { timeout: 15000, maxBuffer: 256 * 1024 });
    const probe = JSON.parse(stdout);
    const audio = probe.streams?.filter((s: any) => s.codec_type === "audio") || [];
    insist(audio.length === 1 && probe.streams.length === 1, "audio_only_required");
    insist(["opus", "vorbis", "mp3", "aac", "pcm_s16le", "pcm_s24le", "pcm_f32le"].includes(audio[0].codec_name), "unsupported_audio_codec");
    const formats: Record<string, string> = { "audio/webm": "webm", "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mp4": "mov", "audio/x-m4a": "mov" };
    insist(probe.format.format_name.split(",").includes(formats[mime]), "audio_mime_mismatch");
    // Decode to a bounded PCM stream: validates full audio and measures duration for browser WebM lacking duration headers.
    const decoded = await exec("ffmpeg", ["-v", "error", "-protocol_whitelist", "file,pipe", "-i", file, "-t", "181", "-f", "s16le", "-ac", "1", "-ar", "8000", "pipe:1"], { encoding: "buffer", timeout: 20000, maxBuffer: 3 * 1024 * 1024 });
    const durationSeconds = decoded.stdout.length / 16000;
    insist(durationSeconds >= 0.1 && durationSeconds <= 180, "audio_duration_out_of_range");
    return { durationSeconds, codec: audio[0].codec_name };
  } finally { await rm(dir, { recursive: true, force: true }); }
}
export async function finalizeUpload(actor: string, id: string) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const row = (await c.query("SELECT * FROM hiring_uploads WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, actor])).rows[0];
    insist(row, "not_found", 404);
    if (row.data.status === "ready") { await c.query("COMMIT"); return { id, revision: row.revision, data: row.data }; }
    const source = await storage.getObjectEntityFile(row.object_path);
    const [metadata] = await source.getMetadata();
    insist(Number(metadata.size) === row.data.size && Number(metadata.size) <= 20 * 1024 * 1024, "upload_size_mismatch");
    // Pin the generation before reading. Reusing a signed URL can never replace verified evidence.
    const pinned = objectStorageClient.bucket(source.bucket.name).file(source.name, { generation: metadata.generation });
    const [bytes] = await pinned.download();
    const details = await inspectBytes(bytes, row.data.kind, row.data.contentType);
    const sealedName = source.name.replace(/uploads\/[^/]+$/, `sealed/${id}`);
    const sealed = objectStorageClient.bucket(source.bucket.name).file(sealedName);
    await sealed.save(bytes, { resumable: false, contentType: row.data.contentType, preconditionOpts: { ifGenerationMatch: 0 } }).catch((e: any) => { if (e.code !== 412) throw e; });
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    // If a prior attempt copied before rollback, only reuse an identical sealed object.
    const [sealedBytes] = await sealed.download();
    insist(createHash("sha256").update(sealedBytes).digest("hex") === sha256, "source_hash_conflict", 409);
    const data = { ...row.data, ...details, sha256, status: "ready", processingState: row.data.kind === "audio" ? "queued" : "not_requested" };
    await c.query("UPDATE hiring_uploads SET data=$2,object_path=$3,revision=revision+1 WHERE id=$1", [id, data, `/objects/sealed/${id}`]);
    if (row.data.kind === "audio") await c.query("INSERT INTO hiring_jobs(id,upload_id,input_hash) VALUES($1,$2,$3) ON CONFLICT(upload_id) DO NOTHING", [randomUUID(), id, sha256]);
    await c.query("COMMIT");
    return { id, revision: row.revision + 1, data };
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}
export async function authorizedFile(actor: string, id: string) {
  const row = (await pool.query("SELECT * FROM hiring_uploads WHERE id=$1", [id])).rows[0];
  insist(row?.data.status === "ready", "not_found", 404);
  let allowed = row.owner_id === actor;
  if (!allowed) {
    // Publishing explicitly shares the manager's vision with authenticated applicants.
    const published = await pool.query("SELECT id FROM hiring_records WHERE kind='Opportunity' AND data->>'status'='published' AND data->'managerVision'->>'artifactId'=$1 LIMIT 1", [id]);
    allowed = published.rowCount === 1;
  }
  if (!allowed) {
    const records = await pool.query("SELECT data FROM hiring_records WHERE kind='Opportunity' AND owner_id=$1", [actor]);
    allowed = records.rows.some(r => r.data.applications.some((a: any) => a.status !== "draft" && (
      a.submittedAnswers?.some((t: any) => t.artifactId === id) ||
      [a.submittedProfile?.credentialArtifactId, a.submittedProfile?.proposalArtifactId].includes(id)
    )));
  }
  insist(allowed, "not_found", 404);
  const file = await storage.getObjectEntityFile(row.object_path);
  return { file, row };
}
