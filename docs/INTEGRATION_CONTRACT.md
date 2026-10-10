# Shared Sauce integration contract

Status: proposed service contract for frontend and backend review. Exact HTTP routes,
MCP tool schemas and production storage bindings are not implemented. Use command names
below for mocks; agree on wire routes before binding a real client.

## Current domain and extended workflow

The authoritative objects are [Organization, Person and Opportunity](../backend-architecture/OBJECT_ARCHITECTURE.md), with Applicant/HiringManager profiles under Person. Opportunity owns four [question purposes and file-processing contracts](../backend-architecture/QUESTIONS_AND_FILES.md), historical stage events, a 7–8-line hypothesis and an approved RolePolicyVersion. The [nine-step frontend journey](../backend-architecture/WORKFLOW_AND_INTEGRATIONS.md) is the full workflow; the original commands below illustrate its direct-intake slice.

Canonical new IDs are `person_id`, `opportunity_id`, `opportunity_version_id`, `role_policy_version_id`. Existing JSON examples and voice v1 fixtures use legacy job/rubric field names. Agree a v2 wire contract and explicit adapter; do not bind both to independent stores or accept conflicting aliases. Imported historical applicants are scoped unclaimed Person records, not consented direct voice submissions.

Additional proposed domain commands: `preview_historical_import`, `apply_historical_import`, `get_stage_candidate_sets`, `propose_historical_patterns`, `create_context_interview`, `record_context_response`, `ask_employer`, `reply_to_inquiry`, `draft_hiring_hypothesis`, `approve_role_policy`, `get_prioritized_review`, `record_outcome_event`, `propose_next_cycle_revision`. Each uses authenticated scope, source versions/digest, expected revision and idempotency where relevant. Approving policy checks criteria/anchors/questions/weights; a prose hypothesis alone is insufficient. Outcome recording never implicitly approves new policy, sends messages or trains models. These names are proposals, not deployed routes.

## Resource boundaries

- Identity: authenticated principal plus organization membership or isolated demo workspace.
- Manager brief: organization Markdown artifact, JD Markdown artifact, manager voice artifact
  and reviewed transcript. Confirmation pins all source versions.
- Applicant profile: credentials, work proposal, contacts/references, version and owner.
- Application: job version, question-set version, profile version and selected voice takes.
- Evaluation: application submission, rubric version, source digest and component assessments.

Client payloads identify resources; authentication supplies the acting principal. The client
cannot grant itself a manager role or read another applicant by changing an ID. Group/job
invitation links reveal a permitted job summary, not private applications or audio.

## Proposed command map

| Command | Minimum payload/context | Result |
| --- | --- | --- |
| create_upload | source kind, MIME, bytes, target context | owned artifact id, upload target, expiry |
| finalize_upload | artifact id, idempotency key | verified artifact state or rejection |
| create_job_draft | organization id, three manager source refs | job draft id and revision |
| interpret_job | draft id, source versions | reviewed extraction candidate with citations/conflicts |
| confirm_job | draft id, expected revision, reviewed brief | immutable job version |
| generate_questions | confirmed job version | draft question set, maximum three |
| approve_question_set | set id, expected revision | approved immutable set of 1–3 questions |
| save_profile | three applicant sections, expected revision | profile draft/version |
| start_application | job version, profile version, question-set version | applicant-owned draft application |
| record_voice_answer | application, question, owned audio artifact | answer take and processing state |
| confirm_answer | take id, transcript version, expected revision | reviewed answer version |
| submit_application | draft id, selected answer versions, expected revision, idempotency key | immutable submission snapshot |
| configure_rubric | job version, three weights, anchors/policy, expected revision | draft/approved rubric version as permitted |
| get_evaluation | authorized submission id | versioned states, evidence and nullable scores |
| send_followup | application id, body, explicit visibility | authorized contextual message |

Names are proposals. Follow-ups are not a hidden fourth screening question or automatic
new scoring input. Adding another screening round needs a product decision.

## Proposed normalized weight payload

```json
{
  "job_version_id": "job-v1",
  "expected_revision": 2,
  "weights": {
    "composite_profile": null,
    "voice_transcript": null,
    "voice_behaviors": null
  }
}
```

Nulls represent an unconfigured draft, not accepted approved weights. No default numerical
split has been selected. Approval requires valid weights plus the applicable rating anchors
and missingness policy. The backend revalidates a frontend percentage conversion and stores
an immutable rubric version. Returning a plausible number without approved anchors is a bug.

## Example unconfigured evaluation response

```json
{
  "application_submission_id": "submission-demo",
  "status": "not_configured",
  "rubric_version_id": null,
  "overall_score": null,
  "coverage": null,
  "components": {
    "composite_profile": { "status": "not_configured", "score": null },
    "voice_transcript": { "status": "not_configured", "score": null },
    "voice_behaviors": { "status": "not_configured", "score": null }
  }
}
```

When configured, component assessments include anchor IDs, source citations, reasoning,
quality/unknown state and evaluator/metric version. The wire representation of detailed
citations still needs agreement. Synthetic IDs here are fixtures, not deployed resources.

## Transport-independent invariants

1. Both Markdown sources and manager voice are present for job confirmation.
2. One to three approved screening questions, with unique ordinals and job-version linkage.
3. Each required applicant response selects an owned recorded take plus reviewed transcript.
4. Submission pins source/profile/question/answer versions transactionally.
5. Weight totals are valid; positive-weight unknown evidence cannot silently become zero.
6. Authorization is identical in HTTP and MCP; no client-supplied privileged actor override.
7. Repeated idempotency keys return the prior result only for the same payload and actor.
8. Stale revisions return a conflict with current revision, never an unreviewed overwrite.

## Error and progress semantics

Use stable domain error codes, proposed: unauthorized, forbidden, invalid_input,
revision_conflict, artifact_not_ready, processing_failed, missing_voice_answer,
question_limit_exceeded and rubric_not_configured. Select HTTP mappings with the backend;
MCP returns equivalent structured error information. Retries are explicit and bounded.

Upload/transcription/measurement status is independently observable; a timeout does not
mean the applicant gave a bad answer. The frontend retains the artifact/request ID for retry
and resumes from backend state. A submitted snapshot remains readable while a newer draft
or rubric is in progress, with clear version metadata.

## Next agreement between teams

Agree on upload codec/limits, transcript timestamp representation, request/response version,
authentication for demo versus production, and a small shared fixture set. Then write an
API specification from these commands and implement one complete slice. The current JSON
Schema [illustrations](../backend-architecture/contracts/README.md) cover only selected data
shapes; they do not enforce cross-record ownership, unique ordinals or weight sums.
