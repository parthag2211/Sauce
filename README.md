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

Try the [compact two-role demo](https://sauce-vision-production.up.railway.app/demo): managers post jobs and review applicants; applicants edit their profile and find roles with three voice questions. Its text and audio are saved only in the same browser. People and scores are fictional. See the [prototype team handoff](docs/PROTOTYPE_HANDOFF.md). There is no production hiring backend, live transcription, deployed Sauce MCP endpoint or trained scoring model yet. The simple demo is also the site homepage; the original team vision remains at `/vision`.

Danish uses Replit. ElevenLabs is an available transcription candidate; Chewbacca is a source for scoped import/history functionality. Neither runtime integration is implemented. See [technical details](backend-architecture/README.md) and [landing deployment instructions](landing/README.md).

The native iMessage client remains in [amber-imessage](https://github.com/sagartiw/amber-imessage). Both iMessage and MCP will use the shared Sauce backend. This independent Sauce checkout lives in amber-imessage/Sauce and is ignored by the parent repository.
