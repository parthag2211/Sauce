# Sauce

Sauce has four main objects: **Organization, HiringManager, Applicant and Opportunity**. Everything else is nested. Opportunity is the complete job container: its description, questions, applications, answers, assessments and history.

The basic flow is **manager creates an opportunity → applicant applies by voice → manager reviews**.

## Team starting points

- [Four-object architecture](backend-architecture/OBJECT_ARCHITECTURE.md)
- [Danish / Replit handoff](docs/DANISH_OBJECT_AND_VOICE_HANDOFF.md)
- [Frontend handoff](docs/FRONTEND_HANDOFF.md)
- [Four-object JSON example](backend-architecture/examples/four-object-example.json)
- [Integration contract](docs/INTEGRATION_CONTRACT.md)

## Inputs

Manager: organization Markdown, JD Markdown and recorded voice vision. Applicant: credentials, work proposal, contacts/references. Screening has at most three questions, all answered by voice. Applicants can also ask the employer questions separately.

Three manager-weighted assessment components: composite profile, transcript content and approved observable vocal delivery. Criteria/weights remain Sagar's decisions. Contacts do not affect fit; voice analysis does not infer emotions/personality for hiring. Missing evidence stays unknown.

Historical imports, interviews, suggested patterns and a hiring summary are optional fields within Opportunity.history. They are not required workflow stages. Preserve shortlisted, offered, accepted and hired distinctly.

## Current implementation

[Open Sauce](https://sauce-vision-production.up.railway.app) → [live portal](https://sauce-vision-production.up.railway.app/portal). The landing page routes managers and applicants into the same compact, authenticated portal. Jobs, profiles, applications, historical imports and original voice recordings use a private backend and persistent Railway volume. Groq transcription is connected; users review their words before submission. New live accounts start empty.

The [sample demo](https://sauce-vision-production.up.railway.app/demo) remains separate and fictional. Real scores stay unknown: automated matching, sentiment analysis, model training and a Sauce MCP endpoint are not implemented. There is no existing applicant pool yet; CSV/JSON imports are available when one exists. Chewbacca remains a functionality reference, rather than a live research integration.

Frontend and Danish/Replit teams should start with the [live API handoff](docs/LIVE_API_HANDOFF.md). See [deployment instructions](landing/README.md). Existing architecture documents describe broader planned capabilities beyond this first connected slice.

The native iMessage client remains in [amber-imessage](https://github.com/sagartiw/amber-imessage). Both iMessage and MCP will use the shared Sauce backend. This independent Sauce checkout lives in amber-imessage/Sauce and is ignored by the parent repository.
