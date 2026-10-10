import { randomUUID, createHash } from "node:crypto";
import { pool } from "@workspace/db";
import { DomainError, insist, payloadSchemas, visibleRecord, assessment, type RecordRow } from "./hiring-model";
import { isExpired, redactExpiredEvidence } from "./hiring-privacy";

const uid = () => randomUUID();
const now = () => new Date().toISOString();
export async function executeCommand(actor: string, command: any) {
  const schema = payloadSchemas[command.action as keyof typeof payloadSchemas];
  insist(schema, "unknown_command");
  const parsed = schema.safeParse(command.payload);
  insist(parsed.success, "invalid_input");
  const p: any = parsed.data;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    // One serialized domain transaction prevents cross-record races for this internal-test release.
    await c.query("SELECT pg_advisory_xact_lock(837265)");
    const digest = createHash("sha256").update(JSON.stringify(command)).digest("hex");
    const prior = await c.query("SELECT digest,result FROM hiring_requests WHERE owner_id=$1 AND request_key=$2", [actor, command.idempotencyKey]);
    if (prior.rows[0]) {
      insist(prior.rows[0].digest === digest, "idempotency_conflict", 409);
      await c.query("COMMIT");
      return redactExpiredEvidence(prior.rows[0].result);
    }
    const get = async (id: string, kind?: string): Promise<RecordRow> => {
      const r = (await c.query("SELECT * FROM hiring_records WHERE id=$1", [id])).rows[0];
      insist(r && (!kind || r.kind === kind), "not_found", 404);
      return r;
    };
    const ownedUpload = async (id: string, kind?: string) => {
      const r = (await c.query("SELECT * FROM hiring_uploads WHERE id=$1 AND owner_id=$2", [id, actor])).rows[0];
      insist(r && r.data.status === "ready" && (!kind || r.data.kind === kind), "artifact_not_ready_or_forbidden", 403);
      insist(!isExpired(r.data), "retention_expired", 410);
      return r;
    };
    const create = async (kind: string, data: any): Promise<RecordRow> => {
      const r = { id: uid(), kind, owner_id: actor, revision: 1, data };
      await c.query("INSERT INTO hiring_records(id,kind,owner_id,data) VALUES($1,$2,$3,$4)", [r.id, kind, actor, data]);
      return r;
    };
    const update = async (r: RecordRow) => {
      r.revision++;
      await c.query("UPDATE hiring_records SET data=$2,revision=$3 WHERE id=$1", [r.id, r.data, r.revision]);
      return r;
    };
    const checkRevision = (r: RecordRow) => insist(command.expectedRevision === r.revision, "revision_conflict", 409);
    let result: any;
    if (command.action === "createOrganization") {
      const file = await ownedUpload(p.markdownArtifactId, "markdown");
      const org = await create("Organization", { name: p.name, markdownArtifactId: file.id, organizationMarkdown: file.data.text, hiringManagerIds: [] });
      const manager = await create("HiringManager", { name: p.managerName, organizationId: org.id });
      org.data.hiringManagerIds = [manager.id];
      await update(org);
      result = visibleRecord(org, actor);
    } else if (command.action === "saveApplicant") {
      for (const key of ["credentialArtifactId", "proposalArtifactId"]) if (p[key]) await ownedUpload(p[key], "markdown");
      const existing = (await c.query("SELECT * FROM hiring_records WHERE kind='Applicant' AND owner_id=$1", [actor])).rows[0];
      if (existing) {
        insist(existing.id === command.targetId, "revision_conflict", 409);
        checkRevision(existing);
        existing.data = p;
        result = visibleRecord(await update(existing), actor);
      } else result = visibleRecord(await create("Applicant", p), actor);
    } else if (command.action === "createOpportunity") {
      const org = await get(p.organizationId, "Organization");
      insist(org.owner_id === actor, "forbidden", 403);
      const jd = await ownedUpload(p.jdArtifactId, "markdown");
      await ownedUpload(p.visionArtifactId, "audio");
      result = visibleRecord(await create("Opportunity", {
        title: p.title, organizationId: org.id, hiringManagerId: org.data.hiringManagerIds[0],
        managerUserId: actor, organizationName: org.data.name, organizationContext: org.data.organizationMarkdown,
        jobDescription: jd.data.text, jdArtifactId: jd.id, managerVision: { artifactId: p.visionArtifactId },
        questions: { forApplicants: p.questions.map((text: string) => ({ id: uid(), text })), fromApplicants: [] },
        scoring: { status: "not_configured", weights: null, criteria: [] }, status: "draft", applications: [], history: {},
      }), actor);
    } else if (command.action === "retryTranscription") {
      const u = await ownedUpload(command.targetId, "audio");
      insist(["failed", "unavailable"].includes(u.data.processingState), "processing_not_retryable", 409);
      u.data.processingState = "queued"; delete u.data.errorCode;
      await c.query("UPDATE hiring_uploads SET data=$2, revision=revision+1 WHERE id=$1", [u.id, u.data]);
      await c.query("UPDATE hiring_jobs SET state='queued',attempts=0,updated_at=now() WHERE upload_id=$1", [u.id]);
      result = { id: u.id, revision: u.revision + 1, data: u.data };
    } else {
      const op = await get(command.targetId, "Opportunity");
      checkRevision(op);
      const d = op.data;
      const manager = op.owner_id === actor;
      const profile = (await c.query("SELECT * FROM hiring_records WHERE kind='Applicant' AND owner_id=$1", [actor])).rows[0];
      let application = d.applications.find((a: any) => a.applicantId === actor);
      const requireDraft = () => { insist(application, "application_required"); insist(application.status === "draft", "submission_is_immutable", 409); };
      switch (command.action) {
        case "publishOpportunity":
          insist(manager, "forbidden", 403);
          insist(d.questions.forApplicants.length >= 1 && d.questions.forApplicants.length <= 3, "question_limit_exceeded");
          d.status = "published"; break;
        case "startApplication":
          insist(d.status === "published" && !manager, "opportunity_not_open_to_actor", 403);
          insist(profile, "applicant_profile_required");
          if (!application) d.applications.push({ id: uid(), applicantId: actor, status: "draft", voiceAnswers: [], outcomeHistory: [] });
          break;
        case "addTake":
          requireDraft();
          insist(d.status === "published", "opportunity_not_open");
          insist(d.questions.forApplicants.some((q: any) => q.id === p.questionId), "question_not_found");
          const recording = await ownedUpload(p.artifactId, "audio");
          insist(application.voiceAnswers.length < 30, "take_limit_exceeded");
          application.voiceAnswers.push({ id: uid(), questionId: p.questionId, artifactId: p.artifactId, expiresAt: recording.data.expiresAt, reviewedTranscript: null, reviewedAt: null, selected: false });
          break;
        case "reviewTake": {
          requireDraft();
          const take = application.voiceAnswers.find((t: any) => t.id === p.takeId);
          insist(take, "take_not_found");
          await ownedUpload(take.artifactId, "audio");
          for (const t of application.voiceAnswers) if (t.questionId === take.questionId) t.selected = false;
          Object.assign(take, { reviewedTranscript: p.reviewedTranscript, reviewedAt: now(), selected: true });
          break;
        }
        case "submitApplication": {
          requireDraft(); insist(profile, "applicant_profile_required");
          const answers = [];
          for (const q of d.questions.forApplicants) {
            const selected = application.voiceAnswers.filter((t: any) => t.questionId === q.id && t.selected);
            insist(selected.length === 1 && selected[0].reviewedAt && selected[0].reviewedTranscript?.trim(), "missing_reviewed_voice_answer");
            const u = await ownedUpload(selected[0].artifactId, "audio");
            insist(!["queued", "processing"].includes(u.data.processingState), "processing_pending", 409);
            answers.push({ ...selected[0], originalAsr: u.data.originalAsr, words: u.data.words || [], sha256: u.data.sha256, durationSeconds: u.data.durationSeconds, provider: u.data.provider, model: u.data.model, sourceHash: u.data.sourceHash, providerOutputHash: u.data.providerOutputHash, rawProviderOutput: u.data.rawProviderOutput, options: u.data.options, expiresAt: u.data.expiresAt, processingState: u.data.processingState });
          }
          application.submittedProfile = structuredClone(profile.data);
          application.profileRevision = profile.revision;
          application.submittedQuestions = structuredClone(d.questions.forApplicants);
          application.submittedAnswers = answers;
          application.submittedJob = { title: d.title, jobDescription: d.jobDescription, organizationContext: d.organizationContext, scoring: structuredClone(d.scoring), revision: op.revision };
          application.assessment = assessment();
          application.submittedAt = now(); application.status = "submitted";
          application.outcomeHistory.push({ status: "submitted", at: now() });
          break;
        }
        case "askInquiry":
          insist(d.status === "published" && profile && !manager, "inquiry_not_allowed", 403);
          insist(d.questions.fromApplicants.filter((q: any) => q.applicantId === actor).length < 100, "inquiry_limit_exceeded");
          d.questions.fromApplicants.push({ id: uid(), applicantId: actor, text: p.text, reply: null, createdAt: now() });
          break;
        case "replyInquiry": {
          insist(manager, "forbidden", 403);
          const inquiry = d.questions.fromApplicants.find((q: any) => q.id === p.inquiryId);
          insist(inquiry, "inquiry_not_found");
          inquiry.reply = p.text; inquiry.repliedAt = now(); break;
        }
        case "setOutcome": {
          insist(manager, "forbidden", 403);
          const a = d.applications.find((a: any) => a.id === p.applicationId && a.status !== "draft");
          insist(a, "submission_not_found", 404);
          a.status = p.status; a.outcomeHistory.push({ status: p.status, at: now() }); break;
        }
        default: throw new DomainError(400, "unknown_command");
      }
      result = visibleRecord(await update(op), actor);
    }
    await c.query("INSERT INTO hiring_requests(id,owner_id,request_key,digest,result) VALUES($1,$2,$3,$4,$5)", [uid(), actor, command.idempotencyKey, digest, result]);
    await c.query("COMMIT");
    return redactExpiredEvidence(result);
  } catch (e) {
    await c.query("ROLLBACK"); throw e;
  } finally { c.release(); }
}
