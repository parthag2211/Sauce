# Sauce

Sauce is a voice-powered applicant marketplace. Hiring managers provide organizational
context, a job description, and a spoken vision for the ideal hire. Applicants provide
a profile and answer up to three screening questions by voice.

This repository contains the **architecture, team handoff, and visual product walkthrough**.
Explore the [live Sauce vision](https://sauce-vision-production.up.railway.app), or see
[landing page development and deployment instructions](landing/README.md).
There is no working hiring backend, application-submission frontend, deployed Sauce MCP
URL, or scoring implementation in this repository yet. The landing page uses illustrative data.
Sagar owns final data architecture and scoring decisions; proposed contracts are identified
as such so the teams can work toward one implementation without treating guesses as facts.

## Team starting points

- **Frontend team:** [Frontend handoff](docs/FRONTEND_HANDOFF.md).
- **Backend and voice-data counterpart:** [Backend and voice handoff](docs/BACKEND_VOICE_HANDOFF.md).
- **Both teams:** [Shared integration contract](docs/INTEGRATION_CONTRACT.md).
- **Architecture review:** [Data model](backend-architecture/DATA_MODEL.md),
  [scoring model](backend-architecture/SCORING_MODEL.md), and
  [decision log](backend-architecture/DECISIONS.md).
- **Reusable functionality:** [Chewbacca source references and porting instructions](backend-architecture/CHEWBACCA_REFERENCES.md).

## Confirmed product contract

| Side | Inputs |
| --- | --- |
| Hiring manager | Organization Markdown upload, JD Markdown upload, recorded voice vision. |
| Applicant profile | Academic/work credentials, work proposal, contact information and references. |
| Screening | Sauce generates at most three questions for manager review; every screening response is voice based. |
| Scoring configuration | Manager controls weights for composite applicant profile, applicant voice transcript content, and applicant voice intonation/behaviors. |

Contact details identify and connect people; they do not contribute to fit. Voice-behavior
analysis is limited to explicit observable job-related measures, with human review;
it does not infer personality, emotions, health or demographic traits.

## Repository boundary

Sauce owns the future backend and the web frontend if the frontend team chooses that surface.
The native iMessage client remains in [amber-imessage](https://github.com/sagartiw/amber-imessage).
Both iMessage and MCP must use the same authorized domain services and persisted records.
Local checkout: `amber-imessage/Sauce`, an independent Git repository ignored by the parent.
The `chewbacca` source remote is a local convenience; team members can add it using the
instructions in the references document. No Chewbacca runtime code has been copied yet.

Start with a synthetic, fixture-backed flow. Agree on contracts and rating anchors before
migrations, live audio processing or numerical evaluations. Each team handoff includes its
first deliverables, acceptance checks and the decisions that still need Sagar.
