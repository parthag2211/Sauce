import { pool } from "@workspace/db";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { redactExpiredEvidence } from "./hiring-privacy";

// Expiry and verified email deletion use the same purge path. Never edit evidence for any other reason.
export async function expireRecordings(targetId?: string) {
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
      const storage = new ObjectStorageService();
      for (const path of new Set([row.object_path, row.data.stagingPath].filter(Boolean))) {
        try {
          const file = await storage.getObjectEntityFile(path as string);
          await file.delete({ ignoreNotFound: true });
        } catch (error) { if (!(error instanceof ObjectNotFoundError)) throw error; }
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
