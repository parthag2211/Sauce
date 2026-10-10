# Sauce live portal: first data connection

The first connected version is deliberately small. The landing page at `/` opens the authenticated portal at `/portal?role=manager` or `/portal?role=applicant`. `/demo` remains a separate fictional, browser-only walkthrough. `/vision` retains the original internal team explainer.

There is no existing applicant pool yet. Live accounts start empty; demo people and scores are never copied into the live database. People can create jobs, save their profile, record three answers, submit them and review received applications. CSV/JSON historical imports are optional and require an explicit preview and confirmation.

## Four main objects

- **Organization:** manager-owned company name and Markdown/text brief. This first version supports one organization per manager account.
- **HiringManager:** the authenticated account acting on its own openings. Switching the UI tab grants no rights over another manager's data.
- **Applicant:** account-owned profile with credentials, proposal and contact/reference bundle. Submission freezes a server-side snapshot.
- **Opportunity:** description, company link, manager voice, up to three voice questions, nested applications, assessments and historical pool.

Authentication/session tables and audio storage are internal implementation details. They do not add product-level objects.

## Frontend / Replit wire routes

All endpoints use same-origin HttpOnly cookie sessions. Writes require the exact `Origin` plus JSON content type, except raw audio uploads. A separately hosted frontend should proxy these routes through its own Sauce origin after configuring `SAUCE_PUBLIC_ORIGIN`; unrestricted cross-origin credential access is not enabled.

| Method / path under `/api/v1` | Request / result |
| --- | --- |
| `POST /auth/register` | `{name,email,password}` → account and session cookie. Password minimum: 12 characters. |
| `POST /auth/login` | `{email,password}` → account and session cookie. |
| `POST /auth/logout` | `{}` → invalidate the current session. |
| `GET /session` | account or null, configured voice provider name. |
| `GET /bootstrap?role=manager` | Own openings and their submitted applications/imports, own profile. |
| `GET /bootstrap?role=applicant` | Discoverable openings and this account's submitted applications; private manager context and other applicants are omitted. |
| `GET /profile` | Own Applicant, including `version`. |
| `PUT /profile` | `name, credentials, workProposal, contactInformation, references, version`. Stale version → 409. |
| `POST /opportunities` | `company:{name,organizationMarkdown}, organizationVersion, title, team, seniority, jobDescription, managerVision, questions:[{text}]`. IDs and owner come from server. |
| `PATCH /opportunities/:id` | Owner only: `{status:'open'|'closed',version}`. |
| `POST /voice` | Raw audio with audio `Content-Type` and unique `Idempotency-Key` → private recording metadata and transcription. |
| `GET /voice/:id` | Raw recording, authorized only for its owner or the manager of an application containing it. |
| `POST /opportunities/:id/applications` | `{voiceAnswers:[{questionId,audio:{blobId},reviewedTranscript}]}`. Profile snapshot comes from server. Repeated submission returns the existing application. |
| `POST /opportunities/:id/applications/:applicationId/outcomes` | Owner only: `{stage,version}`; preserves stage events without inventing intervening outcomes. |
| `POST /opportunities/:id/imports/preview` | Owner only: `{format:'csv'|'json',filename,content}` → private preview ID and normalized rows. |
| `POST /opportunities/:id/imports/commit` | Owner only: `{previewId}` → imported/skipped counts. Idempotent; preview expires after 15 minutes. |

Errors return `{message}` with 400/401/403/404/409/413/415/429 as appropriate. API writes never accept client-supplied fit scores, ownership or applicant identity.

## Danish: voice boundary

`landing/backend/voice.mjs` adapts the Amber ID multipart transcription pattern without copying owner-specific authentication or rewriting original wording. The deployed provider is Groq Whisper (`whisper-large-v3`), using the existing project credential privately configured on Sauce. ElevenLabs Scribe is an alternative when configured with `ELEVENLABS_API_KEY`; it is not currently selected or verified.

Original audio is saved durably before the provider request. Provider failure returns a saved recording plus an explicit status; the user can supply the reviewed transcript manually. Original transcript, reviewed transcript, provider and model remain separate. Uploaded recordings are bound to the authenticated owner and cannot be borrowed from another account to submit an application. Accepted codecs: WebM, MP4/M4A, OGG, WAV, MP3 and FLAC; max 20 MB per recording, 100 MB total per account. Browser capture stops at two minutes. Live capture uses memory until upload, rather than persistent browser audio storage.

The three scoring components remain composite profile, transcript and approved observable voice behavior. All real scores are currently null. No sentiment/personality inference, automated ranking or model training runs. The next scoring connection needs the manager-approved criteria and weights plus evidence-backed evaluators; it must not reuse the demo's fixture numbers. Chewbacca research/pattern extraction is still a reference for the next adapter, not a live enrichment integration.

## Historical imports, when a pool exists

CSV headers: `name`, `resume_text` (or `credentials`), and optionally `email`, `linkedin`, `phone`, `work_proposal`, `stage`, `outcome_history`, `resume_url`. JSON accepts an array or `{applicants:[...]}`. `outcomeHistory` can contain explicit `{stage,at}` entries. Quoted commas/newlines in CSV are supported. A single `accepted` stage stays accepted; it does not imply hired. Unknown stage labels remain preserved with a warning. Matching imported emails does not grant an account access to that historical profile.

Imports are attached to Opportunity.history.previousApplicants and kept separate from new submitted applications. Resume URLs are stored as references; PDF/DOCX text extraction is not implemented. Source filename/hash/row and explicit stages are retained. Maximum 1,000 records / 4 MB file. Preview before commit; repeated rows and repeated commits do not duplicate people.

## Storage and deployment

`landing/backend/` contains transport-independent storage/domain/auth/import/voice modules; `router.mjs` is their HTTP boundary. They are separate from `landing/public/`. Node's built-in SQLite uses prepared statements, WAL, foreign keys and version checks. The Railway `sauce-vision` service has a persistent volume mounted at `/data`, holding `sauce.sqlite` and private audio BLOBs. Production refuses to start the live API without durable storage configured. Startup prepares volume permissions then runs Node as the unprivileged `node` user. Keep this as a single-replica service; SQLite on this volume is not a horizontally shared database.

No secrets, recordings, contacts or database files belong in Git or the deployment archive. Authentication uses scrypt password hashes, hashed opaque sessions, HTTPS-only cookies in production, origin checks and basic per-account/request limits. Accounts currently lack email verification and self-service password recovery; account identity is its internal ID, not a verified claim to an email address. This is a hackathon implementation, not a production identity service.

`npm test` in `landing` passes 15 tests covering access isolation, voice ownership, immutable profile snapshots, unknown scores, stale writes, stage preservation, import review/idempotency and reopening durable storage. Browser QA covers account creation, job posting/reload, profile saving, discovery and manager review with three loaded audio players. A deployed HTTP integration test used two fictional accounts and generated speech: four real Groq transcriptions, profile snapshot submission, authorized playback, private-context isolation and a recorded shortlist outcome all passed. The synthetic opening was closed afterward so it does not appear in discovery. Native iMessage and MCP are still future API clients.
