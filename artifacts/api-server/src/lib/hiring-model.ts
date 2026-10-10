import { z } from "zod";
import { redactExpiredEvidence } from "./hiring-privacy";

export class DomainError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export function insist(condition: unknown, code: string, status = 400): asserts condition {
  if (!condition) throw new DomainError(status, code);
}
export const text = z.string().trim().min(1).max(20000);
const id = z.string().min(1).max(150);
export const payloadSchemas = {
  createOrganization: z.object({ name: text.max(150), markdownArtifactId: id, managerName: text.max(150) }),
  saveApplicant: z.object({
    name: text.max(150), credentials: text, workProposal: text,
    contactInformation: z.object({ email: z.string().email(), phone: z.string().max(80).default(""), linkedin: z.string().max(500).default("") }),
    references: z.string().max(10000).default(""), credentialArtifactId: id.optional(), proposalArtifactId: id.optional(),
  }),
  createOpportunity: z.object({ organizationId: id, title: text.max(200), jdArtifactId: id, visionArtifactId: id, questions: z.array(text.max(500)).min(1).max(3) }),
  publishOpportunity: z.object({}),
  startApplication: z.object({}),
  addTake: z.object({ questionId: id, artifactId: id }),
  reviewTake: z.object({ takeId: id, reviewedTranscript: text }),
  submitApplication: z.object({}),
  askInquiry: z.object({ text }),
  replyInquiry: z.object({ inquiryId: id, text }),
  setOutcome: z.object({ applicationId: id, status: z.enum(["shortlisted", "offered", "accepted", "hired"]) }),
  retryTranscription: z.object({}),
};
export type RecordRow = { id: string; owner_id: string; kind: string; revision: number; data: any };
export function visibleRecord(row: RecordRow, actor: string) {
  const data = redactExpiredEvidence(row.data);
  if (row.kind === "Opportunity") {
    insist(row.owner_id === actor || data.status === "published", "not_found", 404);
    const manager = row.owner_id === actor;
    data.applications = (data.applications || []).filter((a: any) => manager ? a.status !== "draft" : a.applicantId === actor);
    data.questions.fromApplicants = (data.questions.fromApplicants || []).filter((q: any) => manager || q.applicantId === actor);
    data.canManage = manager;
    if (!manager) {
      // Shared job descriptions are public to signed-in users; original manager files remain private.
      delete data.jdArtifactId;
      data.history = {};
    }
  }
  return { id: row.id, revision: row.revision, data };
}
export function assessment() {
  const component = () => ({ status: "not_configured", score: null });
  return {
    status: "not_configured", overallScore: null,
    components: { composite_profile: component(), voice_transcript: component(), voice_behaviors: component() },
    gaps: ["Approved rating anchors and weights are not configured.", "Audio delivery assessment is unavailable. No traits are inferred."],
  };
}
