# Hiring app implementation interface

All API requests use cookie authentication under `/api/hiring`. This shared API is intentionally separate from the `/sauce-hiring/` frontend prefix. No bearer token in browser code. Use generated hooks.

`HiringRecord` is `{id, revision, data}`. Generated `data` is a JSON object; define frontend view types as needed matching these shapes. All text is plain text, never rendered as raw HTML.

GET workspace returns userId, mode ("internal_test"), owned organizations/hiringManagers, own applicant or null, visible opportunities (published or owned), and own uploads. Opportunity data is role-filtered: managers see only submitted applications, applicants see only their own. Never display fabricated counts or samples as real.

## Data shapes
- Organization data: name, markdownArtifactId, organizationMarkdown, hiringManagerIds.
- HiringManager data: name, organizationId.
- Applicant data: name, credentials, workProposal, contactInformation {email,phone,linkedin}, references (plain text), credentialArtifactId?, proposalArtifactId?.
- Opportunity data: title, organizationId, hiringManagerId, managerUserId, organizationName, organizationContext, jobDescription, jdArtifactId, managerVision {artifactId}, questions {forApplicants:[{id,text}], fromApplicants:[{id,applicantId,text,reply,createdAt}]}, scoring {status:"not_configured",weights:null,criteria:[]}, status:"draft"|"published", applications:[], history:{}.
- Nested application: id, applicantId (authenticated user ID), status:"draft"|"submitted"|"shortlisted"|"offered"|"accepted"|"hired", voiceAnswers:[{id,questionId,artifactId,reviewedTranscript,reviewedAt,selected}], submittedProfile?, submittedQuestions?, submittedAnswers?, assessment?, outcomeHistory:[], submittedAt?.
- Upload data: name, kind, contentType, status:"reserved"|"ready"|"failed", sha256, durationSeconds, processingState:"not_requested"|"queued"|"processing"|"completed"|"failed"|"unavailable", originalAsr:string|null, words:[], errorCode?, provider. Upload metadata appears in workspace.uploads; submittedAnswers include originalAsr and recording metadata.
- Assessment: status:"not_configured", overallScore:null, components:{composite_profile:{score:null,status:"not_configured"},voice_transcript:{...},voice_behaviors:{...}}, gaps:string[]. No scoring controls that imply approved numerical scoring; clearly show not configured.

## Commands
POST commands takes `{action,idempotencyKey:crypto.randomUUID(),targetId?,expectedRevision?,payload}`. Keep the same key when retrying an unchanged failed network request. Refresh workspace/detail after success. All modifications to an existing record require expectedRevision from latest GET. On 409 offer refresh, never overwrite silently.

- createOrganization: payload `{name,markdownArtifactId,managerName}`. Uploaded Markdown must be finalized. Creates owned manager too.
- saveApplicant: targetId/expectedRevision if already exists; payload `{name,credentials,workProposal,contactInformation:{email,phone,linkedin},references,credentialArtifactId?,proposalArtifactId?}`. Nonempty name, credentials, workProposal, email required.
- createOpportunity: payload `{organizationId,title,jdArtifactId,visionArtifactId,questions:string[]}`. All uploads finalized; 1–3 nonempty questions; creates draft. Scoring remains disabled.
- publishOpportunity: targetId opportunity + expectedRevision; payload `{}`. Explicit manager approval of displayed questions.
- startApplication: targetId opportunity + expectedRevision; payload `{}`. Requires saved applicant. Returns opportunity with own draft nested. Existing own draft is reused.
- addTake: targetId opportunity + expectedRevision; payload `{questionId,artifactId}`. Recorded finalized audio only. Adds new take, does not delete old take.
- reviewTake: targetId opportunity + expectedRevision; payload `{takeId,reviewedTranscript}`. Saves review and selects this take for its question, unselects earlier takes. Original ASR is never overwritten. Where transcription is unavailable, manual transcript review is explicitly labeled, not claimed as ASR.
- submitApplication: targetId opportunity + expectedRevision; payload `{}`. Requires one reviewed recorded selected take per question and pins all evidence. No more edits to submitted application.
- askInquiry: targetId opportunity + expectedRevision; payload `{text}`. Requires applicant profile; independent from screening.
- replyInquiry: targetId opportunity + expectedRevision; payload `{inquiryId,text}`. Owner manager only.
- setOutcome: targetId opportunity + expectedRevision; payload `{applicationId,status}` status one of shortlisted/offered/accepted/hired. Records history.
- retryTranscription: targetId upload ID; payload `{}`. Only owner and failed/unavailable state; provider may remain unavailable.

## Uploads and voice
Use requestHiringUpload({data:{name,size,contentType,kind,testDataConfirmed:true}}), PUT raw file bytes to returned uploadUrl, then finalizeHiringUpload({id}). Poll workspace every 3 seconds while processing. Fetch authorized playback via `/api/hiring/uploads/{id}`; use Blob URL for audio if necessary.
Only synthetic/internal test data is allowed; require explicit checkbox before upload. Explain live provider is not yet enabled, automatic transcription may show unavailable, and recordings remain actual durable files. Do not fake a successful transcript. Recording controls use MediaRecorder and handle permission errors, playback, stop, cancel and retakes. Maximum 20 MiB and 180 seconds. Markdown/text maximum 256 KiB. Supported audio webm/ogg/mp3/wav/m4a, verified by backend. Markdown is UTF-8 .md/.txt only; no PDF/DOCX claims.

Routes: public `/`, `/sign-in/*?`, `/sign-up/*?`; authenticated `/workspace`, `/profile`, `/opportunities/new`, `/opportunities/:id`. Opportunity route includes apply/review/inquiries according to server-provided permissions. Organization creation can be in workspace/new opportunity flow. Do not alter walkthrough files.
