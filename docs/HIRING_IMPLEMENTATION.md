# Sauce Hiring: internal-test release

The illustrative Sauce walkthrough remains unchanged at `/`. The working hiring app lives at `/sauce-hiring/`. Its only main product objects are Organization, HiringManager, Applicant and Opportunity. Applications, inquiries, questions, evidence snapshots and outcomes are nested within Opportunity. Internal record, upload, request-deduplication and job tables are not new product objects.

## Running and verifying

- Install: `pnpm install --frozen-lockfile`.
- Development schema: `pnpm --filter @workspace/db run push` (never at server startup).
- Check: `pnpm run typecheck`.
- Integration tests: `pnpm --filter @workspace/api-server run test:hiring`. Uses synthetic test principals, real private object storage and PostgreSQL; removes its database fixtures afterward.
- Managed workflows: `artifacts/api-server: API Server`, `artifacts/sauce-hiring: web`, and preserved `artifacts/sauce: web`.
- Frameworks: Express 5, PostgreSQL/Drizzle, React/Vite, TanStack Query/Orval, Clerk cookie sessions, Replit App Storage, ffprobe/ffmpeg media verification.

## What works

Upload organization/JD Markdown, record a manager vision, approve 1–3 screening questions, publish, save applicant credentials/proposal/contacts/references, record and retain retakes, review/select transcript text, submit immutable evidence, send private inquiries/replies, inspect manager evidence/gaps and record distinct shortlisted/offered/accepted/hired outcomes.

Scoring requires explicit future approval of anchors and weights by Sagar. Every component and overall score is null/not_configured, never zero or an invented rating. No personality/emotion inference, training or automated hiring decisions occurs.

Uploads are reserved by authenticated identity, directly uploaded to private staging, byte/codec/duration checked, SHA-256 hashed, and copied to immutable private keys before use. Owner access is enforced server-side. Publishing shares the manager vision with authenticated opportunity viewers; applicant recordings are shared with the authorized manager only when selected in a submitted snapshot. Nonselected draft takes stay private. No browser bearer tokens or public applicant-media URLs.

Every modifying command carries an idempotency key and existing-record revision. A serialized database transaction rejects stale writes and atomically stores its result. Submissions pin profile, job, questions, selected answers, original-ASR state, reviewed text, hashes and contacts independently of future profile changes. Inquiries never enter assessments.

## Transcription status and adapter boundary

**Live speech-to-text is not enabled.** The app is expressly internal-test-only and requires test-data confirmation before upload. Users can record real audio and manually enter reviewed text, but the app never claims this is automatic transcription. An unavailable ASR result is null, not fabricated.

The durable worker supports an injected `Transcriber` with upload ID, source hash and private object path. Its result must include matching upload ID/hash, provider/model, `verbatim: true`, text and valid word timestamps. Jobs have claim leases, bounded attempts, restart recovery, and compare-and-set result acceptance. Late results never write into Opportunity reviews or selected takes. Tests inject a clearly labeled fixture adapter; production code does not.

Before adding ElevenLabs: obtain explicit provider/data-use approval, confirm retention/deletion policy and billing, attach the integration through the platform, pin model/options including `no_verbatim:false`, normalize raw results/words, and persist original output separately. Add provider timeout/retry/live-consent tests. Do not enable real applicant collection merely because sign-in works.

## Older v1 event mapping

Older contract events are internal processing references, not public domain objects:

- `personId` → authenticated Applicant identity; no Person resource is created.
- `applicationId` → `Opportunity.applications[].id`.
- `opportunityId` → Opportunity record ID.
- question/answer IDs → `questions.forApplicants[].id` and nested `voiceAnswers[].id`.
- recording/source artifact ID → owner-bound upload ID + immutable SHA-256.
- processing request → internal job ID, source hash, attempt and lease token.
- result → upload original ASR/provider/model/word timing; human review stays on the specific take.
- submit → nested submitted snapshot, not a mutable profile reference.

See `HIRING_CLIENT_CONTRACT.md` and the OpenAPI spec for request shapes and all actions.

## Verification and remaining limits

Full workspace typecheck passes. Integration checks cover multiple principals, foreign files, malformed audio/UTF-8/MIME, question count, no text-only submission, idempotent finalize/submit, conflicting retries, stale revisions, retake lineage, source overwrite protection, original/review separation, contacts/references, inquiry isolation, all four outcomes, and fresh-process durability.

Public desktop previews render for both artifacts; unauthenticated API requests return 401 and health returns 200. The signed-in UI has **not** been browser-verified; integration tests call the domain layer with explicit synthetic identities rather than bypassing Clerk. Browser microphone permissions, storage CORS, mobile interaction and authenticated end-to-end browser flows remain validation gaps.

Storage SDK emits MaxListenersExceededWarning during integration upload tests; uploads and integrity checks still complete. Investigate before increasing throughput. The initial app uses a global domain write lock and bounded workspace lists; suitable for the internal milestone, not a scaling claim. Retention/deletion and orphan staging cleanup await policy approval. Historical imports, interviews, Chewbacca, iMessage/MCP, training and numeric scoring are excluded.

## Configuration names (no values)

`DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PROXY_URL`, `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS`, `PORT`, `BASE_PATH`.
