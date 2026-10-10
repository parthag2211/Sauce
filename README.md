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

This repository contains design documents and an [illustrative landing page](https://sauce-vision-production.up.railway.app). The landing page explains earlier vision details; the four-object architecture above is the current design contract. There is no working hiring backend, submission frontend, deployed Sauce MCP endpoint or trained scoring model yet.

Danish uses Replit. ElevenLabs is an available transcription candidate; Chewbacca is a source for scoped import/history functionality. Neither runtime integration is implemented. See [technical details](backend-architecture/README.md) and [landing deployment instructions](landing/README.md).

The native iMessage client remains in [amber-imessage](https://github.com/sagartiw/amber-imessage). Both iMessage and MCP will use the shared Sauce backend. This independent Sauce checkout lives in amber-imessage/Sauce and is ignored by the parent repository.
