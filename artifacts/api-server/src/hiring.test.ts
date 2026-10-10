import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pool } from "@workspace/db";
import { executeCommand } from "./lib/hiring-service";
import { visibleRecord } from "./lib/hiring-model";
import { reserveUpload, finalizeUpload, authorizedFile, inspectBytes } from "./lib/hiring-files";
import { processVoiceJob } from "./lib/hiring-worker";
import { ASR_OPTIONS, createElevenLabsTranscriber, normalizeAsr } from "./lib/hiring-transcriber";
import { CONSENT_VERSION, redactExpiredEvidence, RETENTION_MS } from "./lib/hiring-privacy";
import { expireRecordings } from "./lib/hiring-retention";
import { ObjectStorageService } from "./lib/objectStorage";

const nonce = process.argv[2];
if (nonce) {
  const rows = (await pool.query("SELECT * FROM hiring_records WHERE owner_id=$1 AND kind='Opportunity'", [nonce])).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].data.applications[0].status, "hired");
  assert.equal(rows[0].data.applications[0].submittedProfile.name, "Test Applicant");
  await pool.end();
  process.exit(0);
}
const actors = ["manager", "applicant", "outsider"].map(s => `test-${s}-${randomUUID()}`);
const [manager, applicant, outsider] = actors as [string, string, string];
let checks = 0;
function ok(value: unknown, label: string) { assert.ok(value, label); checks++; process.stdout.write(`PASS ${label}\n`); }
async function rejects(fn: () => Promise<unknown>, label: string) { await assert.rejects(fn); checks++; process.stdout.write(`PASS ${label}\n`); }
const command = (actor: string, action: string, payload: any, record?: any, key = randomUUID()) =>
  executeCommand(actor, { action, payload, targetId: record?.id, expectedRevision: record?.revision, idempotencyKey: key });
const get = async (id: string) => (await pool.query("SELECT * FROM hiring_records WHERE id=$1", [id])).rows[0];
const fixtureResult = (input: { uploadId: string; sourceHash: string }) => {
  const rawProviderOutput = { text: "Explicit synthetic adapter fixture.", words: [{ text: "Fixture", type: "word", start: 0, end: 0.8 }] };
  return {
    uploadId: input.uploadId, sourceHash: input.sourceHash, provider: "test_fixture_not_live_asr",
    model: "fixture-v1", verbatim: true as const, text: rawProviderOutput.text,
    words: [{ text: "Fixture", start: 0, end: 0.8 }], rawProviderOutput,
    providerOutputHash: createHash("sha256").update(JSON.stringify(rawProviderOutput)).digest("hex"),
    options: { fixture: true },
  };
};
const wav = Buffer.alloc(44 + 16000);
wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(16000, 40);
for (let i = 0; i < 8000; i++) wav.writeInt16LE(Math.round(Math.sin(i * 0.1) * 1000), 44 + i * 2);
async function upload(actor: string, bytes: Buffer, kind: string, consent = false) {
  const r = await reserveUpload(actor, { name: kind === "audio" ? "test.wav" : "test.md", size: bytes.length, contentType: kind === "audio" ? "audio/wav" : "text/markdown", kind,
    testDataConfirmed: !consent, transcriptionConsent: consent, consentVersion: consent ? CONSENT_VERSION : undefined });
  const put = await fetch(r.uploadUrl, { method: "PUT", body: bytes, headers: { "Content-Type": kind === "audio" ? "audio/wav" : "text/markdown" } });
  assert.equal(put.ok, true);
  const result = await finalizeUpload(actor, r.id);
  return { ...result, uploadUrl: r.uploadUrl };
}
try {
  await rejects(() => reserveUpload(manager, { name: "real.wav", size: 1, contentType: "audio/wav", kind: "audio", testDataConfirmed: false }), "consent gate");
  const explicitConsentReservation = await reserveUpload(manager, {
    name: "consented.wav", size: 1, contentType: "audio/wav", kind: "audio",
    transcriptionConsent: true, consentVersion: CONSENT_VERSION,
  });
  const consentData = (await pool.query("SELECT data FROM hiring_uploads WHERE id=$1", [explicitConsentReservation.id])).rows[0].data;
  ok(consentData.consentVersion === CONSENT_VERSION && consentData.consentedAt && !consentData.testDataConfirmed, "real-applicant audio can be reserved only with recorded consent");
  await rejects(() => reserveUpload(manager, { name: "wrong-policy.wav", size: 1, contentType: "audio/wav", kind: "audio", transcriptionConsent: true, consentVersion: "old-policy" }), "unknown transcription consent version blocked");
  await rejects(() => reserveUpload(manager, { name: "x.pdf", size: 1, contentType: "application/pdf", kind: "markdown", testDataConfirmed: true }), "unsupported upload");
  await rejects(() => inspectBytes(Buffer.from("not audio"), "audio", "audio/wav"), "malformed audio");
  await rejects(() => inspectBytes(wav, "audio", "audio/ogg"), "MIME mismatch");
  await rejects(() => inspectBytes(Buffer.from([0xff, 0xfe]), "markdown", "text/plain"), "invalid UTF8");
  const orgFile = await upload(manager, Buffer.from("# Synthetic test organization\nInternal testing only."), "markdown");
  const jd = await upload(manager, Buffer.from("# Synthetic role\nCoordinate projects."), "markdown");
  const vision = await upload(manager, wav, "audio");
  const voice = await upload(applicant, wav, "audio");
  ok(voice.data.sha256 && voice.data.durationSeconds === 1, "private upload hash and duration");
  ok(Math.abs(Date.parse(voice.data.expiresAt) - Date.now() - RETENTION_MS) < 10_000, "audio receives a 30-day expiry from reservation");
  ok(ASR_OPTIONS.model_id === "scribe_v2" && ASR_OPTIONS.no_verbatim === false && ASR_OPTIONS.timestamps_granularity === "word", "pinned verbatim Scribe model and word timestamps");
  await rejects(async () => normalizeAsr({ text: "bad", words: [{ text: "bad", type: "word", start: 2, end: 1 }] }, { uploadId: voice.id, sourceHash: voice.data.sha256 }), "malformed provider timestamps rejected");
  ok((await finalizeUpload(applicant, voice.id)).revision === voice.revision, "duplicate finalize is idempotent");
  await rejects(() => finalizeUpload(outsider, voice.id), "foreign finalize blocked");
  await rejects(() => authorizedFile(outsider, voice.id), "foreign private file blocked");
  await rejects(() => authorizedFile(manager, voice.id), "manager cannot read draft applicant evidence");
  // Reusing still-valid staging URL cannot modify sealed evidence.
  await fetch(voice.uploadUrl, { method: "PUT", body: Buffer.from("replaced staging") });
  const frozen = await authorizedFile(applicant, voice.id);
  ok((await frozen.file.download())[0].equals(wav), "sealed evidence survives staging overwrite");
  for (let i = 0; i < 8; i++) if (!await processVoiceJob()) break;
  const before = (await pool.query("SELECT data FROM hiring_uploads WHERE id=$1", [voice.id])).rows[0].data;
  ok(before.processingState === "unavailable" && before.originalAsr === null, "missing provider is explicit, never fabricated ASR");
  await pool.query("UPDATE hiring_jobs SET state='queued',attempts=0,lease_token=NULL,updated_at=now() WHERE upload_id=$1", [voice.id]);
  let consentCalls = 0;
  await processVoiceJob(async () => { consentCalls++; return fixtureResult({ uploadId: voice.id, sourceHash: voice.data.sha256 }); }, { requireConsent: true, uploadId: voice.id });
  ok(consentCalls === 0 && (await pool.query("SELECT data FROM hiring_uploads WHERE id=$1", [voice.id])).rows[0].data.errorCode === "transcription_consent_required", "synthetic upload without applicant transcription consent is never sent");
  const org = await command(manager, "createOrganization", { name: "Synthetic Org", markdownArtifactId: orgFile.id, managerName: "Test Manager" });
  await rejects(() => command(outsider, "createOpportunity", { organizationId: org.id, title: "Test", jdArtifactId: jd.id, visionArtifactId: vision.id, questions: ["Why?"] }), "foreign organization rejected");
  await rejects(() => command(manager, "createOpportunity", { organizationId: org.id, title: "Test", jdArtifactId: jd.id, visionArtifactId: vision.id, questions: ["1", "2", "3", "4"] }), "four questions rejected");
  const opPayload = { organizationId: org.id, title: "Synthetic Role", jdArtifactId: jd.id, visionArtifactId: vision.id, questions: ["Experience?", "Approach?", "Availability?"] };
  let op = await command(manager, "createOpportunity", opPayload);
  await rejects(async () => visibleRecord(await get(op.id), outsider), "unpublished opportunity private");
  op = await command(manager, "publishOpportunity", {}, op);
  const profile = { name: "Test Applicant", credentials: "Synthetic experience", workProposal: "Synthetic proposal", contactInformation: { email: "test@example.invalid", phone: "", linkedin: "" }, references: "Synthetic reference" };
  let applicantProfile = await command(applicant, "saveApplicant", profile);
  op = await command(applicant, "startApplication", {}, op);
  ok(visibleRecord(await get(op.id), manager).data.applications.length === 0, "manager cannot inspect incomplete draft");
  await rejects(() => command(applicant, "submitApplication", {}, op), "text-only screening blocked");
  await rejects(() => command(applicant, "addTake", { questionId: "not-a-question", artifactId: voice.id }, op), "mismatched question blocked");
  await rejects(() => command(applicant, "addTake", { questionId: op.data.questions.forApplicants[0].id, artifactId: vision.id }, op), "foreign recording blocked");
  const stale = structuredClone(op);
  const firstQuestion = op.data.questions.forApplicants[0].id;
  op = await command(applicant, "addTake", { questionId: firstQuestion, artifactId: voice.id }, op);
  await rejects(() => command(applicant, "addTake", { questionId: firstQuestion, artifactId: voice.id }, stale), "stale mutation blocked");
  let take = op.data.applications[0].voiceAnswers.at(-1);
  op = await command(applicant, "reviewTake", { takeId: take.id, reviewedTranscript: "Reviewed synthetic first take" }, op);
  const originalTakeId = take.id;
  for (const question of op.data.questions.forApplicants) {
    op = await command(applicant, "addTake", { questionId: question.id, artifactId: voice.id }, op);
    take = op.data.applications[0].voiceAnswers.at(-1);
    op = await command(applicant, "reviewTake", { takeId: take.id, reviewedTranscript: `Reviewed synthetic answer: ${question.text}` }, op);
  }
  ok(op.data.applications[0].voiceAnswers.length === 4 && !op.data.applications[0].voiceAnswers.find((t: any) => t.id === originalTakeId).selected, "retakes preserve lineage and latest selection");
  await pool.query("UPDATE hiring_jobs SET state='queued' WHERE upload_id=$1", [voice.id]);
  await processVoiceJob();
  ok((await get(op.id)).data.applications[0].voiceAnswers.at(-1).selected, "late worker cannot change selected take or reviewed text");
  await pool.query("UPDATE hiring_jobs SET state='queued',attempts=0 WHERE upload_id=$1", [voice.id]);
  await processVoiceJob(async input => fixtureResult(input), { uploadId: voice.id });
  const asr = (await pool.query("SELECT data FROM hiring_uploads WHERE id=$1", [voice.id])).rows[0].data;
  ok(asr.processingState === "completed" && asr.originalAsr === "Explicit synthetic adapter fixture." && asr.words.length === 1, "adapter output and timestamps persist separately");
  ok(asr.sourceHash === voice.data.sha256 && asr.rawProviderOutput && /^[0-9a-f]{64}$/.test(asr.providerOutputHash), "original provider output and matching source/output hashes are persisted");
  const mockedTranscriber = createElevenLabsTranscriber(async () => wav, async body => {
    ok(body.get("model_id") === "scribe_v2" && body.get("no_verbatim") === "false" && body.get("timestamps_granularity") === "word", "provider request pins consented verbatim transcription settings");
    return new Response(JSON.stringify({ text: "Synthetic words.", words: [{ text: "Synthetic", type: "word", start: 0, end: 0.5 }, { text: ".", type: "spacing", start: 0.5, end: 0.5 }] }));
  });
  const normalized = await mockedTranscriber({ uploadId: voice.id, sourceHash: createHash("sha256").update(wav).digest("hex"), objectPath: "/synthetic/private/object" });
  ok(normalized.text === "Synthetic words." && normalized.words.length === 2 && normalized.providerOutputHash, "ElevenLabs adapter mock preserves text, timings, and provider response hash without a paid request");
  await pool.query("UPDATE hiring_jobs SET state='queued',attempts=0,lease_token=NULL,updated_at=now() WHERE upload_id=$1", [voice.id]);
  await processVoiceJob(async input => ({ ...fixtureResult(input), uploadId: "mismatched-upload" }), { uploadId: voice.id });
  const rejected = (await pool.query("SELECT data FROM hiring_uploads WHERE id=$1", [voice.id])).rows[0].data;
  ok(rejected.processingState === "queued" && rejected.originalAsr === asr.originalAsr, "mismatched provider response retries without replacing existing original text");
  await pool.query("UPDATE hiring_jobs SET state='queued',attempts=0,lease_token=NULL,updated_at=now() WHERE upload_id=$1", [voice.id]);
  const staleRun = processVoiceJob(async input => {
    await new Promise(resolve => setTimeout(resolve, 40));
    return fixtureResult(input);
  }, { uploadId: voice.id });
  for (let i = 0; i < 40; i++) {
    const state = (await pool.query("SELECT state,lease_token FROM hiring_jobs WHERE upload_id=$1", [voice.id])).rows[0];
    if (state?.state === "processing" && state.lease_token) {
      await pool.query("UPDATE hiring_jobs SET lease_token='replaced-by-new-owner' WHERE upload_id=$1", [voice.id]);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 2));
  }
  await staleRun;
  ok((await pool.query("SELECT data FROM hiring_uploads WHERE id=$1", [voice.id])).rows[0].data.originalAsr === asr.originalAsr, "stale worker lease cannot write late provider output");
  await pool.query("UPDATE hiring_jobs SET state='queued',attempts=0,lease_token=NULL,updated_at=now() WHERE upload_id=$1", [voice.id]);
  for (let i = 0; i < 3; i++) {
    await processVoiceJob(() => new Promise(() => {}), { uploadId: voice.id, timeoutMs: 5 });
    if (i < 2) await pool.query("UPDATE hiring_jobs SET updated_at=now() WHERE upload_id=$1", [voice.id]);
  }
  const exhausted = (await pool.query("SELECT j.state,u.data FROM hiring_jobs j JOIN hiring_uploads u ON u.id=j.upload_id WHERE u.id=$1", [voice.id])).rows[0];
  ok(exhausted.state === "failed" && exhausted.data.errorCode === "transcription_timeout", "timeouts use three bounded attempts then fail explicitly");
  ok((await get(op.id)).data.applications[0].voiceAnswers.at(-1).reviewedTranscript.startsWith("Reviewed synthetic"), "ASR result never overwrites human review");
  op = await command(applicant, "askInquiry", { text: "Synthetic inquiry: what is the schedule?" }, op);
  const submitKey = randomUUID();
  const submitted = await command(applicant, "submitApplication", {}, op, submitKey);
  const duplicate = await command(applicant, "submitApplication", {}, op, submitKey);
  assert.deepEqual(submitted, duplicate);
  ok(true, "duplicate submission returns identical snapshot");
  await rejects(() => command(applicant, "askInquiry", { text: "different" }, op, submitKey), "duplicate key with different request blocked");
  op = submitted;
  ok(op.data.applications[0].submittedAnswers.length === 3, "three selected recordings snapshot");
  ok(op.data.applications[0].submittedProfile.contactInformation.email === profile.contactInformation.email && op.data.applications[0].submittedProfile.references, "contacts and references preserved");
  await rejects(() => command(applicant, "reviewTake", { takeId: take.id, reviewedTranscript: "change" }, op), "submitted evidence immutable");
  const immutableSnapshot = structuredClone(op.data.applications[0].submittedAnswers);
  await pool.query("UPDATE hiring_jobs SET state='queued',attempts=0,lease_token=NULL,updated_at=now() WHERE upload_id=$1", [voice.id]);
  await processVoiceJob(async input => ({ ...fixtureResult(input), text: "A later automatic result." }), { uploadId: voice.id });
  assert.deepEqual((await get(op.id)).data.applications[0].submittedAnswers, immutableSnapshot);
  ok(true, "later ASR cannot alter immutable submitted transcript snapshots");
  applicantProfile = await command(applicant, "saveApplicant", { ...profile, name: "Changed Profile" }, applicantProfile);
  ok((await get(op.id)).data.applications[0].submittedProfile.name === "Test Applicant", "profile edits do not alter submitted snapshot");
  ok(!!(await authorizedFile(manager, voice.id)).file, "authorized manager reads submitted evidence");
  await rejects(() => authorizedFile(outsider, voice.id), "outsider still cannot read submitted evidence");
  ok(visibleRecord(await get(op.id), outsider).data.applications.length === 0 && visibleRecord(await get(op.id), outsider).data.questions.fromApplicants.length === 0, "other applicants cannot see submissions or inquiries");
  op = await command(manager, "replyInquiry", { inquiryId: op.data.questions.fromApplicants[0].id, text: "Synthetic reply" }, op);
  ok(op.data.applications[0].assessment.overallScore === null && Object.values(op.data.applications[0].assessment.components).every((v: any) => v.score === null), "inquiry never influences unconfigured scores");
  const applicationId = op.data.applications[0].id;
  await rejects(() => command(applicant, "setOutcome", { applicationId, status: "hired" }, op), "applicant cannot set manager outcome");
  for (const status of ["shortlisted", "offered", "accepted", "hired"]) {
    op = await command(manager, "setOutcome", { applicationId, status }, op);
    ok(op.data.applications[0].status === status, `outcome remains distinct: ${status}`);
  }
  const restarted = spawnSync(process.execPath, ["--import", "tsx", "src/hiring.test.ts", manager], { cwd: process.cwd(), encoding: "utf8", timeout: 20000 });
  assert.equal(restarted.status, 0, restarted.stderr);
  ok(true, "fresh process reads durable submitted snapshot and outcomes");
  ok(!!redactExpiredEvidence({ expiresAt: new Date(0).toISOString(), reviewedTranscript: "secret", originalAsr: "raw" }).errorCode, "expired snapshot is redacted immediately, including during read");
  await pool.query("UPDATE hiring_uploads SET data=jsonb_set(data,'{expiresAt}',to_jsonb(now()-interval '1 second')) WHERE id=$1", [voice.id]);
  await expireRecordings(voice.id);
  const expired = (await pool.query("SELECT data FROM hiring_uploads WHERE id=$1", [voice.id])).rows[0].data;
  const expiredOp = (await get(op.id)).data;
  const retainedAnswer = expiredOp.applications[0].submittedAnswers.find((a: any) => a.artifactId === voice.id);
  ok(expired.deletedAt && !expired.originalAsr && expired.words.length === 0, "30-day deletion removes source transcript and timing data");
  ok(!retainedAnswer.reviewedTranscript && !retainedAnswer.originalAsr && !retainedAnswer.rawProviderOutput && expiredOp.applications[0].status === "hired", "expiry scrubs submitted copies but keeps outcome history");
  process.stdout.write(`\n${checks} checks passed. All fixture data is synthetic.\n`);
} finally {
  const uploads = (await pool.query("SELECT object_path FROM hiring_uploads WHERE owner_id=ANY($1)", [actors])).rows;
  const storage = new ObjectStorageService();
  for (const u of uploads) {
    try { const file = await storage.getObjectEntityFile(u.object_path); await file.delete(); } catch { /* Already absent test object. */ }
  }
  await pool.query("DELETE FROM hiring_jobs WHERE upload_id IN (SELECT id FROM hiring_uploads WHERE owner_id=ANY($1))", [actors]);
  await pool.query("DELETE FROM hiring_uploads WHERE owner_id=ANY($1)", [actors]);
  await pool.query("DELETE FROM hiring_records WHERE owner_id=ANY($1)", [actors]);
  await pool.query("DELETE FROM hiring_requests WHERE owner_id=ANY($1)", [actors]);
  await pool.end();
}
