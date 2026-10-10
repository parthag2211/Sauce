# Sauce backend boundary and transfer plan

Proposed structure in the Sauce repository:

```text
backend/
  domain/           identities, jobs, profiles, applications, evidence, evaluations
  services/         authorized commands and queries; transaction boundaries
  ports/            storage, transcription, extraction and evaluation interfaces
  adapters/http/    authenticated HTTP transport
  adapters/mcp/     authenticated MCP transport
  adapters/storage/ Postgres and private object storage implementations
  workers/          transcription/extraction/evaluation jobs
  migrations/       approved schema migrations only
```

These paths are a proposal, not implemented directories. Do not move the current
monolithic Amber server into Sauce as the hiring domain. Its owner/circle/tool model
can inform chat integration, but it does not express applicant ownership or hiring data.

## Shared service commands

| Area | Proposed commands | Server checks |
| --- | --- | --- |
| Intake | create_upload, finalize_upload, create_job_draft, interpret_job, confirm_job | Actor membership, source ownership and versions; all three manager sources present. |
| Questions | generate_questions, approve_question_set | Confirmed job version; 1–3 questions; manager approval; extraction sources recorded. |
| Profile | save_credentials, save_work_proposal, save_contacts_and_references, confirm_profile | Applicant ownership; source fields and validation; immutable versions. |
| Apply | start_application, record_voice_answer, confirm_answer, submit_application, withdraw_application | Pinned job/question set, voice artifact ownership, required reviewed answers, atomic snapshot. |
| Review | list_applications, get_application, send_followup | Job-specific reviewer membership; private fields projected by permission. |
| Scoring | propose_rubric, approve_rubric, request_evaluation, get_evaluation | Manager-controlled configuration; exact application/job/rubric linkage; no implicit weights. |

The forthcoming manager configuration interface will supply the three scoring weights.
The axes are composite applicant profile, applicant voice transcript content, and
observable applicant voice behaviors. Backend validation, versioning and approval
are required even though configuration originates in the frontend.

The transport provides authenticated principal and permissions separately from request
payloads. MCP tools never accept a privileged arbitrary acting_user_id. Demo requests
run in explicitly scoped demo workspaces with distinct persona identities.

## Transactions and asynchronous work

- Upload creation reserves an artifact; completion verifies object ownership, MIME/size/hash,
  and successful ingestion. `.md` source files are text, not executable agent instructions.
- Job confirmation atomically pins all intake versions and the manager-reviewed brief.
- Approving a question set checks the 1–3 count transactionally across rows, not only a UI counter.
- Submission atomically validates pinned question membership, owned voice takes and required
  profile sections, then writes the immutable submission and an evaluation outbox event.
- Workers use leased outbox jobs and version digests; late results cannot replace newer versions.
- Idempotency records scope key to principal/operation and payload hash; replay of the same
  payload returns the prior result; changed payload with the same key is a conflict.
- Optimistic concurrency uses expected_revision to reject stale edits and stale confirmations.

## HTTP and MCP parity

HTTP and MCP adapters invoke identical services. An MCP tool returns resource IDs and
filtered summaries, not unbounded applicant data. Audio capture occurs in a voice client;
MCP submits owned uploaded audio artifact references for screening responses. Transcripts
alone do not satisfy the voice-only requirement. Do not expose long-lived keys in URL paths
for the new public remote service; design principal-scoped authentication before deployment.
The current `/mcp/:key` implementation is a legacy reference, not an approved Sauce auth design.

Group-sharing links resolve a job invitation. They do not contain an applicant's application
token, contact bundle or private answer transcript. Each participant authenticates separately.
Follow-up messages carry application context and a visibility policy; sharing in a group
never silently changes that policy.

## Separation from amber-imessage

The iOS client remains in amber-imessage. It will own capture/presentation and pass approved
contracts to Sauce. Sauce owns the source artifacts, hiring data, workflow and evaluations.
No Apple team ID, Swift type, upstream database table or local machine path is required by
the domain package. Environment configuration supplies endpoint/auth provider details.

Review this `backend-architecture` folder in Sauce before implementing migrations.
No live data copy is proposed: existing Amber circle/tool tables contain a different domain.
Any future migration needs explicit field mapping, access mapping and a dry run. Current
architecture changes do not deploy, upload a new TestFlight build or deploy a service. The architecture and team handoffs are published to the Sauce remote.
