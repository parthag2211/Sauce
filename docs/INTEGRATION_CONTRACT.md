# Sauce integration contract — four main resources

The current product/API model is **Organization, HiringManager, Applicant and Opportunity**. Everything else is nested, as shown in [the architecture](../backend-architecture/OBJECT_ARCHITECTURE.md) and [example](../backend-architecture/examples/four-object-example.json). Earlier Person/job/rubric/version-event fixtures are technical illustrations, not an alternative public model. Exact routes are not implemented or agreed.

## Read/write boundaries

| Main resource | Nested content |
| --- | --- |
| Organization | company Markdown, teams and authorized manager/opportunity references |
| HiringManager | manager identity, organization and managed opportunities |
| Applicant | credentials, proposal, private contacts/references and opportunity references |
| Opportunity | job description, manager vision, organization context, questions, scoring, applications and history |

Proposed operations: create/update an organization or opportunity; save an applicant profile; record/review an answer inside an opportunity application; submit that application; ask/reply inside an opportunity inquiry; review applications and record their outcomes. Optional imports/interviews/hypothesis updates modify opportunity.history. No additional top-level Application, Person, Policy or Model API resource is required by this contract.

## Workflow invariants

- Manager intake is organization MD + JD MD + recorded voice vision.
- Applicant intake is credentials + work proposal + contacts/references.
- At most three approved screening questions; new required responses are recorded audio plus reviewed transcripts.
- Applicant inquiries are separate nested questions/replies, voice or text, with no applicant scoring effect.
- Submission preserves a copy of the applicant profile and selected answers. Later edits do not silently change it.
- Three weights/criteria live under opportunity.scoring; assessments live inside applications. Undefined anchors/weights and missing positive-weight evidence yield null scores.
- Shortlisted/offered/accepted/hired are distinct entries in nested outcomeHistory. Historical imports need not contain current screening recordings.

## Backend details stay internal

Authentication supplies the acting identity; changing IDs/role fields cannot grant access. Applicant drafts, submitted recordings and contact bundles have explicit access checks. Group links expose a permitted opportunity summary only. HTTP and MCP invoke the same backend policy.

Keep revision/conflict checks, source hashes, authorized private upload/download, async progress and idempotency to avoid overwrites or duplicate submissions. These may use internal IDs/indexes without becoming new primary product objects. Documents and transcripts are data, not executable instructions. Store original and reviewed sources separately.

Agree wire routes, nested entry IDs, codecs/limits and error formats with Danish before binding clients. The v1 schema/examples are legacy selected-shape illustrations; they do not specify this complete four-object contract or enforce ownership. No backend enforcement is claimed by the documentation.
