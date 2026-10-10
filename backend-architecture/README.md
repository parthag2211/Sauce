# Sauce backend architecture package

Status: design proposal for Sagar and the Sauce pair programmer; no database migration,
service implementation, scoring weights, or production behavior is approved by this package.

Destination: https://github.com/parthag2211/Sauce. Source client repository:
https://github.com/sagartiw/amber-imessage. This folder has no dependency on SwiftUI,
iMessage, the upstream Amber server, or Apple bundle identifiers. This folder is the starting design review now included in Sauce. Before this contribution,
the repository contained only a README (commit
`0839e950c0765f02f98ba3b5f0486fb17b34d5c5`); no backend stack is established yet.

## Confirmed requirements

Hiring manager intake has three sources: organization `.md` upload, JD `.md` upload,
and a recorded voice description of the ideal hire. Sauce generates at most three
screening questions from that brief for manager review. Every screening answer is voice
based. Applicant intake has three sections: academic/work credentials, a proposal about
the work they are open to, and their contact details plus references. Applicant intake
source format now includes applicant Markdown cross-referencing at Sagar's request:
credential and proposal Markdown are proposed originals; the exact structure and intake UX
remain open. Contacts/references stay separately structured. The voice-only requirement
applies to screening answers, not all applicant profile sections.

The manager configures weights for composite applicant profile, voice transcript content,
and voice intonation/behaviors; see the scoring model for assessment boundaries.

Both iMessage and MCP will call the same domain service against the same records.
Current scope is backend architecture and scoring design only. This package changes no
applicant UI, deployed backend, MCP endpoint, iOS build, or TestFlight distribution.

## Read in order

Start with [the two-object explanation and Danish's Replit handoff](../docs/DANISH_OBJECT_AND_VOICE_HANDOFF.md) for the product view, voice-worker fixtures and future training tracks.

1. [Data model](DATA_MODEL.md): entities, ownership, versioning, states and invariants.
2. [Scoring model](SCORING_MODEL.md): evidence-first evaluation and configurable rubric.
3. [Service boundary](SERVICE_BOUNDARY.md): portable domain commands, HTTP/MCP adapters.
4. [Chewbacca references](CHEWBACCA_REFERENCES.md): inspected code and adaptation plan.
5. [Decision log](DECISIONS.md): confirmed requirements and decisions still owned by Sagar.
6. [Contracts](contracts/sauce.schema.json) and [synthetic examples](examples/): illustrative
   validation contracts, not production migrations or claims of enforced authorization.

## Pair-programming handoff

The backend collaborator should review the entity relationships and state transitions,
propose changes with sample records, and obtain Sagar's decisions before migrations.
The client can later consume agreed commands without owning the hiring data model.
Sauce write access is confirmed for this documentation contribution. The package is
published here with dedicated [frontend](../docs/FRONTEND_HANDOFF.md) and
[backend/voice](../docs/BACKEND_VOICE_HANDOFF.md) handoffs. No upstream source code
from Chewbacca is vendored here; this package references patterns and inspected files.

## Acceptance for the later implementation

- A manager uploads both Markdown files and records voice; interpretation preserves source evidence.
- A confirmed job version has between one and three manager-approved questions.
- An applicant has three profile sections and records an answer to each screening question.
- Submission pins profile, question-set, answer and job versions; later edits do not rewrite it.
- A manager can review only applications authorized for their organization/job; a group card grants
  no access to applicant contacts, references or another applicant's answers.
- iMessage and MCP operate on those same records and pass identical authorization checks.
- Scoring remains disabled until an approved rubric is present; missing evidence stays unknown.
- Replayed requests and repeated evaluation runs do not create duplicate submissions or results.
