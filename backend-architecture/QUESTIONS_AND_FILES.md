# Sauce opportunity questions and source files

Opportunity owns question context and versions; each response links its respondent and application/interview to the exact question. Sagar confirmed both applicant screening and applicant-to-employer questions. This is a proposed processing contract; no new parsers or voice integrations are deployed.

## Four question purposes

| Purpose | Who asks / responds | Purpose | Response and visibility |
| --- | --- | --- | --- |
| `manager_discovery` | Sauce / authorized hiring manager | Current outcomes, real work, required vs learnable abilities, conflicts between JD, voice and history. | Voice with reviewed transcript or structured/text correction; manager/context-reviewer private. |
| `employee_context` | Approved interviewer / consenting employee | Concrete work episodes, challenges, abilities used, team experience and support. | Voice with reviewed transcript or written response; interview-specific permissions. Only explicitly approved summaries become shared context. |
| `applicant_screening` | Manager-approved questions / applicant | Job-related evidence against approved question/content anchors. | **1–3 published questions, all responses voice based**, with selected take and reviewed transcript; applicant and authorized reviewers only. |
| `applicant_inquiry` | Applicant / authorized employer | Applicant's questions about work, expectations, support, terms and process. | Either side may use voice or text; private application thread by default. Explicit review/visibility approval creates a redacted opportunity FAQ copy if wanted. |

The maximum of three applies to applicant screening, including scored regenerated/follow-up questions. Manager discovery, employee context and applicant inquiries have different purposes; they must not be used to collect extra scored applicant answers. Inquiry participation/content is not applicant-fit evidence. Historical imports may have no recordings and must not pretend to satisfy current screening.

## Example questions for review

Manager discovery:

- What must this person deliver in their first 90 days, and for which team?
- Which abilities are required at entry, and which can be learned here?
- What changed since the previous opening, and where does the JD disagree with your vision?

Employee context:

- Describe a recent piece of this work, its difficult part, and the abilities you used.
- What should someone joining understand about the team's day-to-day work?
- What support helped you learn the role, and what would you change about the opening?

Applicant screening examples for a hypothetical operations role:

1. Describe an operation you improved. What did you own and what changed?
2. Given this role's first-month problem, how would you approach it?
3. Which part of this work matches the scope you want, and where would you need support?

Applicant inquiries:

- How will success be assessed after 90 days?
- What decisions can I own, and what support/resources will the team provide?

Generate screening from approved criteria and evidence gaps, then have the manager approve it. These are not universal questions. Use the same policy/set for comparable applicants in a cycle; role variants need separately approved versions and disclosed comparability limits. Employee/context questions describe work, not employee personality or performance scoring.

## Question and response records

`Question`: id, opportunity-version id, purpose, author, intended respondent role, text, screening ordinal, cited criterion/requirement IDs, allowed response modes, required flag, version, approval/publication state and visibility. An approved screening question needs a defined content-assessment purpose.

`QuestionSetVersion`: opportunity/policy linkage, purpose, version, approved question IDs, generator version, approver/time and digest. Enforce the screening count and unique ordinals transactionally. Submission pins the approved set; a new set cannot rewrite old submissions.

`Response`: question-version id, respondent Person id, typed application/interview/inquiry-thread linkage, text/audio/transcript references, review state, selected take and visibility. Preserve original ASR versus reviewed text, with corrected alignment or explicit unavailability. Review speaker attribution for shared recordings; provider speaker labels are not verified Person identities.

Inquiries have thread/resolution state. FAQ publication creates a separately reviewed redacted copy with provenance and appropriate permission; it does not expose private applications or broaden the original message's visibility. Storing Person/import/question records does not automatically invite employees, contact references or send messages.

## Proposed first-release file types

| Source | Types | Processing |
| --- | --- | --- |
| Organization / JD | UTF-8 `.md` | Keep original; extract requirements with source spans; review conflicts. The manager's initial two uploads remain Markdown. |
| Applicant credentials / proposal | `.md`, `.txt`; credentials may originate in resume `.pdf` / `.docx` | Preserve source and reviewed profile. A resume does not automatically supply a proposal, current application or consent. |
| Historical resumes | Text-bearing `.pdf`, `.docx`, `.md`, `.txt` | Import preview, self-reported work/academic evidence, reviewed identity linking; cite pages/paragraphs. Scanned PDFs return `needs_ocr_review`, not empty credentials or a bad score. OCR is a later capability. |
| Historical pool / stage outcomes | UTF-8 `.csv` or agreed `.json` | Reviewed column/stage mappings, source opportunity/cycle IDs, source rows and explicit identity matching. CSV can reference previously uploaded resume artifact IDs; do not fetch arbitrary cell URLs. |
| Voice across all four purposes | `.m4a` (AAC), `.mp3`, `.wav` (PCM), `.webm` (Opus), `.ogg` (Opus/Vorbis) | Preserve original bytes/container/codec; validate by decoding; derive processing audio as needed; transcribe and review timestamped evidence. |
| Internal derived files | UTF-8 `.txt`, `.md`, versioned `.json` / `.jsonl` | Transcripts, evidence, provider output, reports and dataset manifests. Restricted model checkpoints are separate from user uploads. |

Later: `.xlsx` outcome exports with sheet mapping, scanned PDFs with reviewed OCR, video with explicitly approved audio extraction. Legacy `.doc`, `.pages`, executables, archives and arbitrary URL scraping are outside the initial scope. LinkedIn URLs remain contact/source references, not automatic imported or verified history. Uploaded transcript text may supplement historical context but cannot replace a new screening recording.

Verify content/MIME/container/codec rather than extensions. Before enabling uploads, configure per-purpose byte/duration/page/row limits, parser timeouts and supported versions; numerical limits remain a team decision. Malformed, encrypted, unsupported or oversized files get a recoverable error. Parse in isolated jobs; never execute embedded code/macros/instructions or fetch embedded URLs. Source documents are data, not permission to modify policy.

Artifact states: reserved → uploading → uploaded → validating → processing → ready, with separate unsupported, needs_review, quarantined, failed and deleted states. Transcription can succeed while acoustic extraction is unavailable. Previews show file name/type, coverage, missing sections and errors. Original, decoded audio, provider output and reviewed records have separate IDs and lineage.

## ElevenLabs adapter for Danish

ElevenLabs is an available candidate, not a verified Sauce connection. Its transcription documentation covers word timestamps, diarization, asynchronous delivery and the proposed audio containers. Sources: [transcription capabilities/formats](https://elevenlabs.io/docs/overview/capabilities/speech-to-text), [transcript API](https://elevenlabs.io/docs/api-reference/speech-to-text/convert).

Danish's Replit service can implement `TranscriptionProvider.transcribe(artifact, options)` and normalize original provider JSON into Sauce transcript/segment records. Pin the model ID and options. Proposed batch options use word timestamps, `no_verbatim: false`, and no transcript rewriting. Enable diarization only when context interviews need speaker separation, with reviewed mapping; do not use speaker-library matching to establish Person identity.

Use server-side secrets and authorized recording uploads/fetches. Authenticate provider callbacks and correlate to the exact run/artifact; make duplicates idempotent. Preserve private raw responses and normalize timestamp units explicitly. Test consented/synthetic recordings before relying on codec/timing support. Review provider retention/training settings before real data transfer. Provider file limits are not Sauce's product limits.

Optional later text-to-speech or conversational adapters may read already-approved prompts to consenting respondents. They cannot change the policy or generate an applicant's answer. Transcription is separate from Sauce's transcript scorer/audio evaluator and does not validate either. Voice analysis stays with approved observable job-related delivery/quality, not emotion-based hiring inference. No account credentials, paid requests or voice uploads were used for this design.
