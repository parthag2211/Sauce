import { pool } from "@workspace/db";
import { expireRecordings } from "./lib/hiring-retention";

// Operator-only procedure: first verify the email requester owns this recording.
const [uploadId, verifiedOwnerId, confirmation] = process.argv.slice(2);
try {
  if (!uploadId || !verifiedOwnerId || confirmation !== "--confirm-verified-request") throw Error("Usage: tsx src/delete-hiring-recording.ts UPLOAD_ID VERIFIED_OWNER_ID --confirm-verified-request");
  const row = (await pool.query("SELECT id FROM hiring_uploads WHERE id=$1 AND owner_id=$2 AND data->>'kind'='audio'", [uploadId, verifiedOwnerId])).rows[0];
  if (!row) throw Error("Recording does not belong to verified requester");
  await expireRecordings(uploadId);
  console.log("Recording and stored transcript copies deleted from Sauce. Provider retention is separate.");
} finally { await pool.end(); }
