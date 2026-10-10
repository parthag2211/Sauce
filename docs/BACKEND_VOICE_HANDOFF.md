# Sauce backend and voice-data handoff

Current primary objects are **Organization, Person and Opportunity**; Applicant/HiringManager are Person profiles. The [object architecture](../backend-architecture/OBJECT_ARCHITECTURE.md), [nine-step workflow](../backend-architecture/WORKFLOW_AND_INTEGRATIONS.md), and [questions/files/ElevenLabs adapter](../backend-architecture/QUESTIONS_AND_FILES.md) govern this voice slice. Add typed linkage for employee context and applicant inquiries; neither is extra scored screening. Historical imports may lack audio and must stay distinct from new direct submissions. Stage outcomes are event history and hypothesis inputs, not automatic model-training labels or policy updates.

For Danish's Replit integration, start with the [object architecture and voice worker handoff](DANISH_OBJECT_AND_VOICE_HANDOFF.md), including request/result fixtures and the distinction between evidence collection, inference and training.

## Mission

Design the authoritative hiring data model and voice evidence pipeline so frontend,
iMessage and MCP use the same persisted state. Sagar owns final schema and scoring rules.
The current package is a proposal and team contract, not a deployed implementation.
No provider, codec, framework or retention duration has been selected.

Read [data architecture](../backend-architecture/DATA_MODEL.md),
[scoring](../backend-architecture/SCORING_MODEL.md), and
[shared integration contract](INTEGRATION_CONTRACT.md) before implementing migrations.

## Separate the two voice uses

| Voice source | Purpose | May contribute to applicant evaluation? |
| --- | --- | --- |
| Manager vision recording | Interpret role intent alongside organization Markdown and JD Markdown. | It informs approved criteria; it is never an applicant response or delivery sample. |
| Applicant answers | Content evidence and observable delivery measures for the pinned screening questions. | Yes, under explicit approved criteria and manager-configured component weights. |

Each recording must be tied to its authenticated owner, workspace, job/application,
question where applicable, take number and source hash. Separate a reusable applicant
profile from each application snapshot. Contact fields and reference contact records
are private identifying data, not fit scores or verified endorsements.

## Proposed voice pipeline

1. **Reserve upload:** authorize principal and target context; create a pending private
   artifact and short-lived upload target. Decide accepted MIME/codec, maximum bytes and
   duration with the frontend team. Do not let clients choose arbitrary storage keys.
2. **Finalize:** verify completion, object size/type/hash and ownership. Record immutable
   artifact metadata and retention state; reject foreign or nonexistent artifact IDs.
3. **Transcribe:** enqueue an idempotent run tied to that exact audio hash. Preserve provider,
   model/version, language, timestamp alignment and errors. Do not overwrite the original
   text when an applicant corrects the transcript.
4. **Review:** store original ASR and reviewed transcript versions separately. Applicant
   confirmation pins the selected take and transcript version. Replacing a take must not
   splice its audio with another take's transcript.
5. **Measure:** derive timestamped observable voice behaviors from the original selected
   take with metric definitions, units, extractor version, quality state and uncertainty.
   Audio quality checks may make measurements unavailable. Do not infer personality,
   emotion, honesty, intelligence, health, disability or demographic traits from voice;
   accent and pitch are not hiring-fit criteria.
6. **Submit:** atomically pin profile/job/question/transcript/audio versions and selected
   answer takes. Emit an outbox event; retries must not create duplicate applications.
7. **Evaluate:** apply an approved versioned rubric and return evidence-backed component
   assessments. Compute the weighted aggregate in deterministic code, not free-form model
   output. No rubric or positive-weight unknown component means no overall numeric result
   under the proposed missingness policy.

Quality measurements and job-related communication assessments are different records.
A pause count can be observed; whether it matters for the role requires a defined anchor
and human review. Network interruptions, transcription gaps and clipping are recording
issues, not poor applicant performance. Raw audio retention is an explicit pending decision.
Deletion must propagate to derived metrics/retrieval artifacts and mark evidence availability.

## Three-component scoring contract

The manager supplies weights for `composite_profile`, `voice_transcript`, and
`voice_behaviors`. Proposed normalized range is [0,1], sum 1 with tolerance 1e-6.
Reject invalid totals and negative/non-finite values. Weights are versioned per job;
no global default weights are provided. A zero-weight component can remain unassessed.

Proposed scores share a 0–100 scale only after anchors are approved:

`overall = w_profile*s_profile + w_transcript*s_transcript + w_behaviors*s_behaviors`

Weights do not define good versus bad evidence. Return not_configured until the relevant
anchors and policy are set. For any positive-weight component with insufficient/conflicting
evidence, return aggregate null rather than reweighting the rest. Factual requirements
remain met/unmet/unknown separately; the score does not automatically decide a hire.
The [scoring model](../backend-architecture/SCORING_MODEL.md) owns detailed semantics.

The composite profile can use relevant submitted credentials, work proposal and explicitly
permitted reference evidence; raw contact identifiers and number/prestige of listed references
must not improve fit. Verified references need separate verification evidence; listing one
never triggers a phone call, email or score bonus.

## Backend deliverables and ownership

| Deliverable | What to share for review |
| --- | --- |
| Proposed relational model | Entity diagram, version relationships, candidate/organization ownership, constraints and access matrix. |
| Voice artifact contract | Codec/MIME proposal, upload/finalization requests, progress/error states, authorization and retention proposal. |
| Transcript/measurement contract | Original/reviewed text, timestamp spans, take linkage, quality/unknown states and extractor provenance. |
| Workflow services | Job intake/confirmation, 1–3 questions, profile versions, reviewed voice answers, atomic submission and withdrawal. |
| Evaluation contract | Three component states, configurable rubric versions, evidence pointers, aggregation and missingness semantics. |
| Integration adapters | HTTP and MCP both call the same services under principal-bound policy. |

The frontend is not responsible for deriving authoritative voice metrics or calculating
final scores. If a client performs transcription for a fast preview, mark it provisional;
agree whether the server accepts that text after checking its owned audio linkage.
A client `input_mode: voice` flag alone does not establish that a recording exists.

## First implementation slice after approval

Use one synthetic organization, one job version, one applicant profile, up to three
questions, and short synthetic/consented recordings. Start with private upload and one
transcript/review path, then persist a submission and return an unscored evidence summary.
Add numeric scoring only after Sagar approves anchors. Use least-privilege services and
transactional cross-record constraints; do not import the upstream circle/tool database
as the hiring schema. Proposed command names are in the shared contract.

## Focused verification

Check foreign artifact access, wrong-tenant/job linkage, a fourth question, text-only
answer rejection, duplicate finalize/submission/evaluation retries, recording/transcription
failure, revised transcript versus original audio, retakes, stale confirmations, zero-weight
unknown components, positive-weight unknown components, deletion and input-version changes.
Equivalent transcript content must give equivalent transcript-content assessments even when
recordings differ; voice delivery judgments must not leak into the content component.

For any proposed model evaluator, freeze human-labeled examples before calls, compare
criterion agreement and abstention, preserve failures and report scope honestly. No live
voice analysis, model evaluation or score calibration has occurred in this documentation phase.

## Chewbacca functionality

Start with source/provenance records, employment history and score-history patterns,
then reviewed imports/stale-plan rejection. See the [pinned references](../backend-architecture/CHEWBACCA_REFERENCES.md).
Port narrow functions with license notices and focused tests. Chewbacca's relationship
scores, local personal databases, macOS voice runtime and setup hooks are not the Sauce
hiring evaluator. Repository presence or a fetched remote is not a completed functionality port.
