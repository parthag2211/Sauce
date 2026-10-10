import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { logger } from "./logger";

export type VoiceResult = {
  uploadId: string; sourceHash: string; provider: string; model: string;
  verbatim: true; text: string;
  words: Array<{ text: string; start: number; end: number }>;
};
export type Transcriber = (input: { uploadId: string; sourceHash: string; objectPath: string }) => Promise<VoiceResult>;

// The external adapter is intentionally NOT enabled before provider/retention consent.
// Tests inject an explicitly labeled fixture adapter; user audio never receives fabricated ASR.
export async function processVoiceJob(transcribe?: Transcriber) {
  const c = await pool.connect();
  let job: any;
  let upload: any;
  const lease = randomUUID();
  try {
    await c.query("BEGIN");
    job = (await c.query(`SELECT * FROM hiring_jobs WHERE
      (state='queued' OR (state='processing' AND updated_at<now()-interval '2 minutes'))
      AND (attempts<3 OR state='processing') ORDER BY updated_at FOR UPDATE SKIP LOCKED LIMIT 1`)).rows[0];
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
  } else if (!upload || upload.data.sha256 !== job.input_hash) {
    state = "failed"; errorCode = "source_hash_mismatch";
  } else if (transcribe) {
    try {
      result = await Promise.race([
        transcribe({ uploadId: upload.id, sourceHash: job.input_hash, objectPath: upload.object_path }),
        new Promise<never>((_, reject) => { const t = setTimeout(() => reject(Error("timeout")), 60000); t.unref(); }),
      ]);
      if (result.uploadId !== upload.id || result.sourceHash !== job.input_hash || result.verbatim !== true ||
          !result.provider || !result.model || typeof result.text !== "string" || !result.text.trim() ||
          !Array.isArray(result.words) || result.words.some(w => !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.start < 0 || w.end < w.start || w.end > upload.data.durationSeconds + 1)) {
        throw Error("invalid_provider_result");
      }
      state = "completed"; errorCode = null;
    } catch {
      result = null;
      state = job.attempts + 1 >= 3 ? "failed" : "queued";
      errorCode = "transcription_failed";
    }
  }
  const tx = await pool.connect();
  try {
    await tx.query("BEGIN");
    const current = (await tx.query("SELECT * FROM hiring_jobs WHERE id=$1 FOR UPDATE", [job.id])).rows[0];
    if (current?.lease_token !== lease || current.state !== "processing") { await tx.query("COMMIT"); return true; }
    const fresh = (await tx.query("SELECT * FROM hiring_uploads WHERE id=$1 FOR UPDATE", [job.upload_id])).rows[0];
    if (fresh && fresh.data.sha256 === job.input_hash) {
      Object.assign(fresh.data, {
        processingState: state, errorCode,
        originalAsr: result?.text ?? null, words: result?.words ?? [],
        provider: result?.provider ?? null, model: result?.model ?? null,
        asrRevision: result ? 1 : null, sourceHash: job.input_hash,
      });
      // No Opportunity writes: late ASR cannot replace reviews, selection, or submitted snapshots.
      await tx.query("UPDATE hiring_uploads SET data=$2,revision=revision+1 WHERE id=$1", [fresh.id, fresh.data]);
    }
    await tx.query("UPDATE hiring_jobs SET state=$2,updated_at=now() WHERE id=$1 AND lease_token=$3", [job.id, state, lease]);
    await tx.query("COMMIT");
  } catch (e) { await tx.query("ROLLBACK"); throw e; } finally { tx.release(); }
  return true;
}
export function startVoiceWorker() {
  let active = false;
  const timer = setInterval(async () => {
    if (active) return;
    active = true;
    try { await processVoiceJob(); } catch { logger.error("Voice job failed; durable lease permits restart recovery"); }
    finally { active = false; }
  }, 1500);
  timer.unref();
  return timer;
}
