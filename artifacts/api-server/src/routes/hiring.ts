import { Router } from "express";
import { getAuth } from "@clerk/express";
import { pool } from "@workspace/db";
import { RunHiringCommandBody, RequestHiringUploadBody } from "@workspace/api-zod";
import { DomainError, insist, visibleRecord } from "../lib/hiring-model";
import { executeCommand } from "../lib/hiring-service";
import { reserveUpload, finalizeUpload, authorizedFile } from "../lib/hiring-files";

const router = Router();
router.use((req, res, next) => {
  if (!getAuth(req).userId) { res.status(401).json({ error: "sign_in_required" }); return; }
  // Cookies are the browser auth transport; reject cross-origin writes.
  const origin = req.get("origin");
  const host = req.get("x-forwarded-host") || req.get("host");
  if (!["GET", "HEAD"].includes(req.method) && origin && new URL(origin).host !== host) {
    res.status(403).json({ error: "cross_origin_write_rejected" }); return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  next();
});
router.get("/workspace", async (req, res) => {
  const actor = getAuth(req).userId!;
  const records = (await pool.query("SELECT * FROM hiring_records WHERE owner_id=$1 OR (kind='Opportunity' AND data->>'status'='published') ORDER BY created_at DESC LIMIT 500", [actor])).rows;
  const uploads = (await pool.query("SELECT id,revision,data FROM hiring_uploads WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 300", [actor])).rows;
  const ofKind = (kind: string) => records.filter(r => r.kind === kind && r.owner_id === actor).map(r => visibleRecord(r, actor));
  res.json({ userId: actor, mode: "internal_test", organizations: ofKind("Organization"), hiringManagers: ofKind("HiringManager"), applicant: ofKind("Applicant")[0] || null, opportunities: records.filter(r => r.kind === "Opportunity").map(r => visibleRecord(r, actor)), uploads });
});
router.get("/opportunities/:id", async (req, res) => {
  const row = (await pool.query("SELECT * FROM hiring_records WHERE id=$1 AND kind='Opportunity'", [req.params.id])).rows[0];
  insist(row, "not_found", 404);
  res.json(visibleRecord(row, getAuth(req).userId!));
});
router.post("/commands", async (req, res) => {
  const parsed = RunHiringCommandBody.safeParse(req.body);
  insist(parsed.success, "invalid_command");
  res.json(await executeCommand(getAuth(req).userId!, parsed.data));
});
router.post("/uploads", async (req, res) => {
  const parsed = RequestHiringUploadBody.safeParse(req.body);
  insist(parsed.success, "invalid_upload_metadata");
  res.json(await reserveUpload(getAuth(req).userId!, parsed.data));
});
router.post("/uploads/:id/finalize", async (req, res) => {
  res.json(await finalizeUpload(getAuth(req).userId!, String(req.params.id)));
});
router.get("/uploads/:id", async (req, res) => {
  const { file, row } = await authorizedFile(getAuth(req).userId!, String(req.params.id));
  res.setHeader("Content-Type", row.data.contentType);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", row.data.kind === "audio" ? "inline" : "attachment");
  file.createReadStream().on("error", () => res.destroy()).pipe(res);
});
router.use((err: any, req: any, res: any, _next: any) => {
  if (!(err instanceof DomainError)) req.log.error({ errorName: err?.name }, "Hiring request failed");
  res.status(err instanceof DomainError ? err.status : 400).json({ error: err instanceof DomainError ? err.code : "request_failed_check_file_and_retry" });
});
export default router;
