import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { logger } from "./logger";
import { CONSENT_VERSION, isExpired } from "./hiring-privacy";
import { createElevenLabsTranscriber } from "./hiring-transcriber";
import { expireRecordings } from "./hiring-retention";

export type VoiceResult = {
  uploadId: string; sourceHash: string; provider: string; model: string;
  verbatim: true; text: string;
  words: Array<{ text: string; start: number; end: number }>;
  rawProviderOutput?: unknown; providerOutputHash?: string; options?: unknown;
};
export type Transcriber = (input: { uploadId: string; sourceHash: string; objectPath: string }) => Promise<VoiceResult>;

// Tests inject fixtures; the live worker additionally requires the current per-upload consent.
export async function processVoiceJob(transcribe?: Transcriber, options: { requireConsent?: boolean; timeoutMs?: number; uploadId?: string } = {}) {
  const c = await pool.connect();
  let job: any;
  let upload: any;
  const lease = randomUUID();
  try {
    await c.query("BEGIN");
    job = (await c.query(`SELECT * FROM hiring_jobs WHERE
      ((state='queued' AND updated_at<=now()) OR (state='processing' AND updated_at<now()-interval '2 minutes'))
      AND (attempts<3 OR state='processing') AND ($1::text IS NULL OR upload_id=$1)
      ORDER BY updated_at FOR UPDATE SKIP LOCKED LIMIT 1`, [options.uploadId ?? null])).rows[0];
    if (!job) { await c.query("COMMIT"); return false; }
    upload = (await c.query("SELECT * FROM hiring_uploads WHERE id=$1 FOR UPDATE", [job.upload_id])).rows[0];
    await c.query("UPDATE hiring_jobs SET state='processing',lease_token=$2,attempts=attempts+1,updated_at=now() WHERE id=$1", [job.id, lease]);
    if (upload) {
      upload.data.processingState = "processing";
      await c.query("UPDATE hiring_uploads SET data=$2,revision=revision+1 WHERE id=$1", [upload.id, upload.data]);
    }
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }

  let result: VoiceResult | null = null;
  let state = "unavailable";
  let errorCode: string | null = "transcription_provider_not_enabled";
  if (job.attempts >= 3) {
    state = "failed"; errorCode = "retry_limit_reached";
  } else if (!upload || upload.data.sha256 !== job.input_hash || isExpired(upload.data)) {
    state = "failed"; errorCode = "source_hash_mismatch";
  } else if (options.requireConsent && (upload.data.consentVersion !== CONSENT_VERSION || !upload.data.consentedAt)) {
    state = "unavailable"; errorCode = "transcription_consent_required";
  } else if (transcribe) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      result = await Promise.race([
        transcribe({ uploadId: upload.id, sourceHash: job.input_hash, objectPath: upload.object_path }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Error("timeout")), options.timeoutMs ?? 60000); }),
      ]);
      if (!result || result.uploadId !== upload.id || result.sourceHash !== job.input_hash || result.verbatim !== true ||
          typeof result.provider !== "string" || !result.provider || typeof result.model !== "string" || !result.model || typeof result.text !== "string" || !result.text.trim() ||
          !Number.isFinite(upload.data.durationSeconds) ||
          !Array.isArray(result.words) || !result.words.length || result.words.some((w, i, words) => !w || typeof w.text !== "string" || !w.text.length ||
            !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.start < 0 || w.end < w.start || w.end > upload.data.durationSeconds + 1 || (i > 0 && w.start < words[i - 1].start))) {
        throw Error("invalid_provider_result");
      }
      state = "completed"; errorCode = null;
    } catch (error) {
      result = null;
      state = job.attempts + 1 >= 3 ? "failed" : "queued";
      errorCode = error instanceof Error && error.message === "timeout" ? "transcription_timeout" : "transcription_failed";
    } finally { if (timer) clearTimeout(timer); }
  }
  const tx = await pool.connect();
  try {
    await tx.query("BEGIN");
    const current = (await tx.query("SELECT * FROM hiring_jobs WHERE id=$1 FOR UPDATE", [job.id])).rows[0];
    if (current?.lease_token !== lease || current.state !== "processing") { await tx.query("COMMIT"); return true; }
    const fresh = (await tx.query("SELECT * FROM hiring_uploads WHERE id=$1 FOR UPDATE", [job.upload_id])).rows[0];
    if (fresh && fresh.data.sha256 === job.input_hash && !isExpired(fresh.data)) {
      Object.assign(fresh.data, {
        processingState: state, errorCode,
        originalAsr: result?.text ?? fresh.data.originalAsr ?? null, words: result?.words ?? fresh.data.words ?? [],
        provider: result?.provider ?? fresh.data.provider ?? null, model: result?.model ?? fresh.data.model ?? null,
        asrRevision: result ? 1 : fresh.data.asrRevision ?? null, sourceHash: job.input_hash,
        rawProviderOutput: result?.rawProviderOutput ?? fresh.data.rawProviderOutput ?? null,
        providerOutputHash: result?.providerOutputHash ?? fresh.data.providerOutputHash ?? null,
        options: result?.options ?? fresh.data.options ?? null,
      });
      // No Opportunity writes: late ASR cannot replace reviews, selection, or submitted snapshots.
      await tx.query("UPDATE hiring_uploads SET data=$2,revision=revision+1 WHERE id=$1", [fresh.id, fresh.data]);
    }
    await tx.query("UPDATE hiring_jobs SET state=$2,updated_at=now()+($4 * interval '1 second') WHERE id=$1 AND lease_token=$3",
      [job.id, state, lease, state === "queued" ? 5 * 2 ** job.attempts : 0]);
    await tx.query("COMMIT");
  } catch (e) { await tx.query("ROLLBACK"); throw e; } finally { tx.release(); }
  return true;
}
export function startVoiceWorker() {
  let active = false;
  const transcribe = createElevenLabsTranscriber();
  const timer = setInterval(async () => {
    if (active) return;
    active = true;
    try {
      await expireRecordings();
      await processVoiceJob(transcribe, { requireConsent: true });
    } catch { logger.error("Voice processing or retention cleanup failed; retry scheduled"); }
    finally { active = false; }
  }, 1500);
  timer.unref();
  return timer;
}
