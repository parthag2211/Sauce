# Sauce workflow — create, apply, review

The [four-object architecture](OBJECT_ARCHITECTURE.md) is authoritative: Organization, HiringManager, Applicant and Opportunity. All questions, applications, files, scores and history are nested. The earlier nine-step workflow is a set of possible capabilities inside an Opportunity, not a mandatory onboarding sequence.

## Three steps

| Step | Manager | Applicant | Nested data |
| --- | --- | --- | --- |
| Create | Choose organization; upload JD; record vision; approve up to three questions and scoring settings. | Prepare credentials, work proposal and contacts/references. | Organization context, Applicant profile and Opportunity description/vision/questions/scoring. |
| Apply | Answer any applicant inquiries. | Open the opportunity, record answers, review transcripts and submit. Ask the employer questions if needed. | Opportunity.applications[] and Opportunity.questions.fromApplicants[]. |
| Review | Review evidence, gaps and assessments; record the hiring stage. | See permitted status/replies. | Each application's assessment, status and outcomeHistory. |

## Optional history within the same opportunity

`Opportunity.history` can hold imported resumes/outcomes, employee and manager interviews, suggested job-related patterns, the optional 7–8-line hiring summary and previous revisions. These do not create new main objects, required screens or prerequisite workflow stages. Historical applicants can be private imported snapshots without creating accounts or pretending they submitted current voice answers.

Preserve shortlisted, offered, accepted and hired separately in nested outcome histories. Unknown is not rejected; accepted is not hired. Historical advancement does not establish job performance. Pattern suggestions need evidence/gaps and manager review; new outcomes do not automatically change scoring or train models.

## Integrations remain behind the objects

**Chewbacca:** adapt import preview/confirmation, stale-change protection and source/history tracking inside Opportunity.history. See [pinned source references](CHEWBACCA_REFERENCES.md). Its contact-merging rules and relationship scoring are not Sauce's hiring rules. No runtime functionality has been ported.

**ElevenLabs:** a candidate transcription adapter behind managerVision, voiceAnswers and interviews. Danish's Replit backend preserves audio and normalizes transcripts/timestamps. See [voice/file details](QUESTIONS_AND_FILES.md#elevenlabs-adapter-for-danish). Provider access/configuration is not verified; no paid requests were made.

**iMessage and MCP:** clients of the same four-object backend. A shared opportunity card does not expose private applications or recordings. No live Sauce hiring MCP endpoint is implemented.

## First build

One Organization, one HiringManager, one Applicant and one Opportunity. Demonstrate create → three recorded answers → reviewed submission → evidence summary → manager outcome. Keep numeric scores unset until criteria and weights are defined. Add optional history tools after this flow works. Original/reviewed files, access checks, retry safety and internal revision tracking remain backend details, not extra product objects.
