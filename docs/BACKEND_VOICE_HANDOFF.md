# Sauce backend and voice handoff

Start with [Danish's short handoff](DANISH_OBJECT_AND_VOICE_HANDOFF.md) and [the four-object architecture](../backend-architecture/OBJECT_ARCHITECTURE.md). The main objects are Organization, HiringManager, Applicant and Opportunity; all answers, transcripts, assessments, outcomes and optional history are nested.

## Voice flow

1. Authorize and save the original recording for an opportunity's manager vision, applicant answer, inquiry or interview.
2. Transcribe asynchronously through a provider adapter; retain original provider output and timestamps.
3. Store reviewed transcript text separately and attach it to the same selected recording.
4. Submit a stable profile/answer copy inside Opportunity.applications[]. Return evidence and honest processing/unknown states.
5. Assess profile, transcript content and explicitly approved observable delivery only after manager scoring criteria/weights exist.

Maximum three screening questions. New required screening answers need actual completed recordings; a text callback or voice flag alone is insufficient. Historical resumes imported into Opportunity.history need not have current voice answers.

Private durable file storage, ownership checks, hashes, task states, revisions and idempotency are internal implementation details. Retakes/corrections preserve lineage; late results cannot overwrite a newer selected take. Contacts and inquiry content do not become fit evidence. Audio processing must not infer emotions/personality for hiring, and unusable audio is unknown rather than a failed applicant.

ElevenLabs is a candidate transcription adapter in Danish's Replit backend; see [file/provider options](../backend-architecture/QUESTIONS_AND_FILES.md). Chewbacca reviewed-import and history patterns can be adapted for optional opportunity history. No provider access, runtime port or live voice processing is verified here.

Training is separate from storage/transcription: define eligible data, human-reviewed task labels, model/dataset provenance and held-out evaluation before training or deployment. Keep this inside the backend rather than adding more user-facing objects or mandatory workflow steps. New outcomes suggest reviewable improvements, not automatic retraining or policy updates.

First acceptance: one manager creates one opportunity; one applicant records up to three answers and submits; manager reviews evidence and records an outcome. Verify private access, stable submitted copies, duplicate retry handling, three-question cap and honest null scores. Add optional imports/interviews later under the same opportunity.
