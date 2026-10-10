# Sauce frontend team handoff

## Goal and scope

Build the manager and applicant journeys against the shared Sauce backend contract.
The first milestone is a complete synthetic flow that Sagar can role-play from both sides.
This document specifies desired behavior; no screens or API routes are implemented yet.
The frontend framework and web/native scope are open choices. Native iMessage changes
belong in amber-imessage; a web frontend can live here. Share domain contracts across both.

## Hiring manager flow

1. Enter the manager persona in an explicitly isolated demo workspace.
2. Upload an organization `.md` file and a JD `.md` file as two distinct sources.
   Show file names and ingestion states; allow replacement without silently overwriting
   the version used by an already-published job.
3. Record the manager's voice vision of the ideal person. Support start/stop, playback,
   retry and transcript review. Manager voice informs the job brief; it is not applicant
   evidence and must not enter the applicant voice score.
4. Show the interpreted job brief with traceable source excerpts and unresolved conflicts.
   Let the manager correct/confirm it. Do not hide disagreements between JD and vision.
5. Display at most three generated screening questions for manager review and approval.
   Do not add an unbounded follow-up interview as a workaround to the three-question cap.
6. Configure three clearly named weights: **composite applicant profile**, **voice response
   content**, and **voice intonation/behaviors**. Proposed UI uses percentages totaling
   100%; send normalized [0,1] values. Do not seed arbitrary numerical defaults or silently
   renormalize invalid totals. Show what each component measures before configuration.
7. Confirm/publish the job and share its job card/invitation context.
8. Review submitted applications, evidence, missing information and follow-up conversations.
   Present a numeric result only when the backend returns one under a configured rubric.

## Applicant flow

1. Enter a distinct applicant demo persona; do not reuse the manager's identity or permissions.
2. Prepare the three profile sections: academic/work history, proposed work scope/interests,
   and contact details plus references. Input formats, required fields and reference count
   are not yet decided. Use clearly labeled fixture forms for the first demo, not an
   assumption that LinkedIn URLs import or verify a person's experience.
3. Open a published job and its pinned set of one to three questions.
4. Record an answer to each required question. Support playback, retake and transcript
   review; show upload/transcription progress and recoverable errors. Preserve take IDs.
   Text-only screening submission is not a fallback. Reviewed text corrects a recorded
   answer's transcript; it cannot pretend that an audio recording exists.
5. Review the exact profile version and selected answer takes, then explicitly submit.
6. Show submission status and any authorized manager follow-ups. A profile edit does not
   silently rewrite a submitted application or trigger a hidden rescore.

## Frontend/backend responsibilities

| Frontend owns | Backend owns |
| --- | --- |
| Capture, playback, progress and review interaction | Upload ownership, raw audio storage and download authorization |
| Manager weight configuration UI | Weight validation, immutable rubric versions and deterministic aggregate |
| Transcript correction request and confirmation UI | Original ASR text, reviewed transcript versions and evidence provenance |
| Profile and job draft editing | Identity, access policy, revisions and submission snapshots |
| Sharing a job invitation | Permission to access a job/application; group participation alone grants none |
| Presenting component results and unknowns | Evidence-backed assessments and missingness/failure distinctions |

Never compute the authoritative score in the frontend, trust a client role toggle as
production authorization, or put contact details/raw audio into a group card. Contacts
and references should only be shown to their owner and authorized reviewers of the
submitted snapshot. Use the backend's short-lived audio URL after an access check.

## Contract and component integration

Read [the shared contract](INTEGRATION_CONTRACT.md). Use versioned resource IDs and
`expected_revision` for edits, `idempotency_key` for submissions, and owned audio artifact
IDs for voice answers. Exact HTTP routes and frontend language bindings remain to be agreed;
do not hard-code mock route names as production routes. Mock the domain commands instead.

Handle processing states explicitly: uploading, uploaded, transcribing, ready, failed.
For scoring show not_configured, running, insufficient_evidence, complete or failed as
separate states. Missing/unusable audio is not a zero score. Retakes and edits can make an
old evaluation stale; use the backend's current-result/version metadata.

The existing iMessage app has on-device transcription, but persistent audio upload is a
future integration task. A successful transcript callback alone cannot satisfy the agreed
voice-artifact contract or enable intonation measurements.

## First deliverables

- A fixture-backed manager and applicant flow with separate demo principals.
- Two Markdown uploads, manager recording/review, and an approved question set capped at three.
- Three profile sections and voice-answer capture/review/submission interaction.
- Three named weight controls and honest disabled/unknown score states.
- A short proposed frontend-to-service mapping shared with the backend counterpart.

## Acceptance checks

The same synthetic job/application IDs can be opened from both roles; one applicant
cannot see another's answers; a fourth screening question cannot be published; a text-only
answer cannot submit; a stale revision produces a reviewable conflict; an unusable recording
does not become a negative assessment; submitted versions remain stable after profile edits.
The backend must enforce these invariants too. Demonstrating them only in a mock is not
proof of a working backend or an end-to-end iMessage flow.

## Decisions for Sagar

Which surface should ship first: web or native iMessage? Which profile fields are required?
What applicant recording duration/retention policy is appropriate? Which rating anchors and
observable job-related voice behaviors should be assessed? These are open; they do not
block the initial fixture-backed flow. Deployment is a later milestone.
