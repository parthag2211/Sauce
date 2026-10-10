# Danish handoff — four objects, one simple hiring flow

Build Sauce around exactly **Organization, HiringManager, Applicant and Opportunity**. Everything else is nested data. This supersedes the earlier Person-based model and nine-step required workflow. Replit is the implementation platform; framework and provider configuration remain your choices to propose.

Start with [the object tree](../backend-architecture/OBJECT_ARCHITECTURE.md) and [four-object JSON example](../backend-architecture/examples/four-object-example.json).

## What each object holds

- Organization: company Markdown, teams and links to managers/opportunities.
- HiringManager: identity, organization and managed opportunities.
- Applicant: credentials, work proposal, contacts and references.
- Opportunity: the entire job — JD, manager voice vision, questions, scoring settings, nested applications and history.

An application is an entry in `Opportunity.applications[]`, containing applicantId, submitted profile, voice answers, assessment, status and outcome history. Do not introduce a fifth main Application object or a top-level Person object. Question, file, transcript, score and hypothesis records are nested as well.

## First working slice

1. Manager creates the opportunity using organization MD, JD MD and recorded vision; approves up to three screening questions and scoring settings.
2. Applicant supplies the three profile sections, records answers, reviews transcripts and submits. They may ask the employer questions in a separate nested inquiry thread.
3. Manager sees evidence/gaps and the three assessment components, replies to inquiries and records the outcome.

Historical imports, employee/manager interviews, suggested patterns and the optional hiring hypothesis live in `Opportunity.history`; none blocks this basic flow.

## Voice responsibilities

Store original recordings in private durable storage and keep their references under managerVision, application.voiceAnswers, inquiries or history.interviews. Preserve original ASR separately from reviewed transcript text. Track question, selected take, processing state, source hash and internal revision alongside the nested answer. A retake creates new evidence; late results cannot overwrite a selected newer take. Text alone cannot satisfy a required screening recording.

ElevenLabs is an available candidate for the transcription adapter. Normalize provider transcripts/timestamps into the nested voice data; use server-side secrets and authenticated, idempotent asynchronous processing. See [file/provider options](../backend-architecture/QUESTIONS_AND_FILES.md). No account access or working provider connection has been verified in Sauce.

Keep three separate components: `composite_profile`, `voice_transcript`, `voice_behaviors`. Their weights/criteria are `Opportunity.scoring`; results/evidence are each application's assessment. No numerical defaults or anchors are approved. Unknown positive-weight evidence gives a null aggregate. Voice behavior means approved observable job-related delivery, not emotion/personality inference. Contacts do not contribute to fit.

Collecting audio and running transcription are not model training. Future transcript/audio training needs separately eligible data, reviewed task labels, dataset/model versions and held-out evaluation. Keep that machinery internal; do not make it another user flow or train automatically on new hiring outcomes. Historical advancement is not ground-truth job performance.

## Implementation boundaries

The frontend reads/writes the four shapes through authorized backend operations. Internally you may index nested applications and track immutable submission copies, revisions, processing runs and model provenance. Those details do not become more product objects. Both iMessage and MCP call the same backend, and group sharing exposes only an opportunity summary.

Chewbacca's reviewed import, stale-change and sourced-history patterns can be adapted inside Opportunity.history. Do not import its entire application or relationship scores. The older v1 voice event fixtures illustrate internal processing only; agree their ID mapping to nested opportunity/application paths before reuse. They are not the public object architecture.

## Copy into Replit Agent

> Build Sauce using exactly four main objects: Organization, HiringManager, Applicant and Opportunity. Opportunity is the complete job container, including its description, manager vision, questions, scoring settings, applications and history. Nest each application's profile snapshot, voice answers, assessment and outcome history inside it. Build create → apply by voice → manager review first. Cap screening at three voice answers and keep applicant-to-employer inquiries separate. Preserve private original files/audio and reviewed transcripts with safe retries and internal revisions. Return unconfigured/null scores until Sagar defines anchors and weights. Add optional history/import/interview tools later within the same opportunity. Use ElevenLabs through a transcription adapter if configured and Chewbacca only for scoped reviewed-import/history functionality. Do not add Person, Application, Policy, Hypothesis or Model as main product objects, and do not require the old nine-step workflow.

Acceptance: four main shapes; three recorded screening answers at most; submitted information stays stable; inquiries do not affect fit; private recordings stay authorized; retries do not duplicate submissions; accepted is not silently hired; unknown evidence stays unknown. This is a design handoff, not a claim that the backend is implemented.
