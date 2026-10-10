import { pool } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { redactExpiredEvidence } from "./hiring-privacy";
import { DomainError } from "./hiring-model";

// Expiry and verified email deletion use the same purge path. Never edit evidence for any other reason.
export async function expireRecordings(targetId?: string, objectStore = new ObjectStorageService()) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(837265)");
    const rows = (await c.query(`SELECT * FROM hiring_uploads WHERE data->>'kind'='audio'
      AND (data->>'deletedAt' IS NULL OR data->>'stagingPath' IS NOT NULL) AND (($1::text IS NOT NULL AND id=$1) OR
      ($1::text IS NULL AND data->>'expiresAt' IS NOT NULL AND (data->>'expiresAt')::timestamptz<=now()))
      ORDER BY created_at LIMIT 20`, [targetId ?? null])).rows;
    for (const row of rows) {
      // Match worker's lock order; invalidate in-flight results before removing content.
      await c.query("SELECT id FROM hiring_jobs WHERE upload_id=$1 FOR UPDATE", [row.id]);
      await c.query("SELECT id FROM hiring_uploads WHERE id=$1 FOR UPDATE", [row.id]);
      const deletedAt = new Date().toISOString();
      await c.query("UPDATE hiring_jobs SET state='failed',lease_token=NULL,updated_at=now() WHERE upload_id=$1", [row.id]);
      for (const path of new Set([row.object_path, row.data.stagingPath].filter(Boolean))) {
        try {
          const file = await objectStore.getObjectEntityFile(path as string);
          await file.delete({ ignoreNotFound: true });
        } catch (error) {
          // A previous attempt may already have deleted one copy before another failed.
          if (!(error instanceof ObjectNotFoundError)) throw error;
        }
      }
      // Scrub every embedded copy, including replay caches, while preserving outcome/history metadata.
      const scrub = (v: any): any => {
        if (Array.isArray(v)) return v.map(scrub);
        if (!v || typeof v !== "object") return v;
        const copy = Object.fromEntries(Object.entries(v).map(([k, item]) => [k, scrub(item)]));
        if (copy.artifactId === row.id || (copy.id === row.id && copy.data)) {
          if (copy.data) copy.data = redactExpiredEvidence({ ...copy.data, deletedAt });
          else return redactExpiredEvidence({ ...copy, deletedAt });
        }
        return copy;
      };
      for (const table of ["hiring_records", "hiring_requests"]) {
        const column = table === "hiring_records" ? "data" : "result";
        const candidates = (await c.query(`SELECT id,${column} AS content FROM ${table} WHERE ${column}::text LIKE $1`, [`%${row.id}%`])).rows;
        for (const record of candidates) {
          await c.query(`UPDATE ${table} SET ${column}=$2${table === "hiring_records" ? ",revision=revision+1" : ""} WHERE id=$1`, [record.id, scrub(record.content)]);
        }
      }
      const data = redactExpiredEvidence({ ...row.data, deletedAt, status: "deleted" });
      delete data.stagingPath;
      await c.query("UPDATE hiring_uploads SET data=$2,revision=revision+1 WHERE id=$1", [row.id, data]);
    }
    await c.query("COMMIT");
    return rows.length;
  } catch (error) { await c.query("ROLLBACK"); throw error; } finally { c.release(); }
}

export async function requestRecordingDeletion(ownerId: string, uploadId: string) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(837265)");
    const upload = (await c.query(
      "SELECT id,data FROM hiring_uploads WHERE id=$1 AND owner_id=$2 FOR UPDATE",
      [uploadId, ownerId],
    )).rows[0];
    if (!upload || upload.data.kind !== "audio") throw new DomainError(404, "recording_not_found");
    if (upload.data.deletedAt) {
      await c.query("COMMIT");
      return { id: uploadId, uploadId, state: "completed", sauceDeleted: true, providerRetentionNote: "ElevenLabs provider-side retention is separate." };
    }
    const prior = (await c.query(
      "SELECT id,state FROM hiring_deletion_requests WHERE owner_id=$1 AND upload_id=$2 AND state<>'completed' LIMIT 1",
      [ownerId, uploadId],
    )).rows[0];
    if (prior) { await c.query("COMMIT"); return { ...prior, uploadId, sauceDeleted: false, providerRetentionNote: "ElevenLabs provider-side retention is separate." }; }
    const id = crypto.randomUUID();
    await c.query("INSERT INTO hiring_deletion_requests(id,owner_id,upload_id) VALUES($1,$2,$3)", [id, ownerId, uploadId]);
    await c.query("COMMIT");
    return { id, uploadId, state: "requested", sauceDeleted: false, providerRetentionNote: "ElevenLabs provider-side retention is separate." };
  } catch (error) { await c.query("ROLLBACK"); throw error; } finally { c.release(); }
}

export async function processDeletionRequest(id: string, store = new ObjectStorageService()) {
  const request = (await pool.query("SELECT * FROM hiring_deletion_requests WHERE id=$1", [id])).rows[0];
  if (!request || request.state === "completed") return request;
  await pool.query("UPDATE hiring_deletion_requests SET state='processing',attempts=attempts+1,updated_at=now() WHERE id=$1", [id]);
  try {
    await expireRecordings(request.upload_id, store);
    await pool.query("UPDATE hiring_deletion_requests SET state='completed',error_code=NULL,updated_at=now() WHERE id=$1", [id]);
  } catch (error) {
    // Durable and visible, but deliberately not retried on every poll. The expiry worker retries later.
    await pool.query("UPDATE hiring_deletion_requests SET state='retrying',error_code='storage_delete_failed',updated_at=now() WHERE id=$1", [id]);
    throw error;
  }
  return (await pool.query("SELECT * FROM hiring_deletion_requests WHERE id=$1", [id])).rows[0];
}

export async function retryPendingDeletionRequests() {
  const due = (await pool.query(`SELECT id FROM hiring_deletion_requests
    WHERE state IN ('requested','retrying') AND updated_at<now()-interval '1 minute'
    ORDER BY requested_at LIMIT 10`)).rows;
  for (const request of due) {
    try { await processDeletionRequest(request.id); }
    catch { /* State and last attempt remain visible for the next backoff interval. */ }
  }
}
