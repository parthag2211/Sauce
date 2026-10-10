# Questions and files inside the four objects

Questions are nested inside **Opportunity**. Files and voice recordings stay with the input or answer they support; they are not additional main product objects.

## Two kinds of questions

| Nested field | Who uses it | How it works |
| --- | --- | --- |
| `Opportunity.questions.forApplicants[]` | Manager asks; applicant answers | Up to three approved screening questions. All answers are voice based and live in the applicant's nested application. |
| `Opportunity.questions.fromApplicants[]` | Applicant asks; employer replies | Questions about the job, expectations, support or process. Voice or text, private to the applicant and authorized employer by default. These do not affect fit. |

Each screening answer links to the exact question version and keeps its original audio, original ASR transcript, reviewed transcript and selected take. Submission saves the question set and answers together so later edits cannot change what the applicant answered. Retakes are allowed; extra scored follow-up questions cannot bypass the three-question limit.

Optional employee/manager interview questions live inside `Opportunity.history.employeeInterviews[]` or `managerInterviews[]`. They help explain the work and are not additional applicant screening or required steps. A shared FAQ must be a separately reviewed, redacted copy of an inquiry, never the private application thread.

Example screening for an operations role:

1. Describe an operation you improved. What did you own and what changed?
2. Given this role's first-month problem, how would you approach it?
3. Which part of this work matches what you want, and where would you need support?

The manager approves questions against the role's criteria. These examples are not universal questions. Comparable applicants use the same approved set and scoring settings.

## Proposed file types

| Input | Types | Nested location |
| --- | --- | --- |
| Organization context | UTF-8 `.md` | `Organization.organizationMarkdown`; Opportunity saves a reference/copy. |
| Job description | UTF-8 `.md` | `Opportunity.jobDescription`. |
| Applicant credentials / proposal | `.md`, `.txt`; credentials may also come from text-bearing `.pdf` / `.docx` resumes | `Applicant.credentials` / `workProposal`, copied into the submitted application. |
| Voice | `.m4a` (AAC), `.mp3`, `.wav` (PCM), `.webm` (Opus), `.ogg` (Opus/Vorbis) | Manager vision, application voice answers, inquiries or optional interviews. |
| Optional historical pool | `.csv` or agreed `.json`, with resume files | `Opportunity.history.previousApplicants[]`; preserve original stage values and reviewed mappings. |
| Derived evidence | `.txt`, `.md`, versioned `.json` / `.jsonl` | Transcript/evidence references nested beside their source. |

Store original files/audio in private durable storage; nested data stores authorized references and processing state. Keep source spans and original provider output separate from reviewed text. Validate content, MIME and codec rather than trusting extensions; isolate parsers and never execute document instructions or fetch embedded URLs. Configure byte/duration/page/row limits before uploads are enabled; limits remain a team decision. Unsupported, encrypted or malformed sources return a recoverable error. Scanned PDFs need OCR review; OCR, XLSX and video extraction are later capabilities.

LinkedIn URLs are contact/source references, not automatic imports or verified credentials. Uploaded transcript text cannot replace a required screening recording. Contact information and inquiry participation do not contribute to fit.

## ElevenLabs adapter for Danish

ElevenLabs is an available transcription candidate; Sauce account access and a working integration have not been verified. Official references: [speech-to-text capabilities](https://elevenlabs.io/docs/overview/capabilities/speech-to-text), [transcription API](https://elevenlabs.io/docs/api-reference/speech-to-text/convert).

Danish's Replit service can normalize provider transcripts, word timestamps and optional diarization into the nested voice data. Pin model/options, preserve original ASR with `no_verbatim: false`, and disable transcript rewriting. Review speaker attribution for shared interviews; speaker labels do not establish identity. Normalize timestamp units explicitly.

Keep credentials server-side. Authenticate asynchronous callbacks, correlate them to the exact recording/take and make retries idempotent. Test synthetic/consented recordings and review provider retention/training settings before real data transfer. Transcription is distinct from transcript scoring and job-related delivery assessment; audio analysis does not infer emotions/personality for hiring. No paid calls or uploads were made for this design.
