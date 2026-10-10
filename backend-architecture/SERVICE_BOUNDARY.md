# Sauce backend boundary

The backend exposes four main shapes: **Organization, HiringManager, Applicant and Opportunity**. Everything else is nested. Read [the object tree](OBJECT_ARCHITECTURE.md) first.

Proposed modules:

```text
backend/
  organizations/
  hiring-managers/
  applicants/
  opportunities/      descriptions, questions, applications, assessments, history
  adapters/           private files, transcription, HTTP, MCP
```

These are proposed modules, not implemented directories. Internal storage indexes, revision tracking, processing jobs and model provenance support those shapes; they are not extra main product objects.

The frontend owns capture, playback and review interaction. The backend owns authorization, original/reviewed sources, stable submitted copies, valid questions/weights, assessment evidence and hiring-stage history. Danish's Replit implementation can hold these modules in one deployment. ElevenLabs is a candidate transcription adapter; Chewbacca patterns can support optional import/history tools. Neither integration is implemented here.

Both iMessage and MCP call the same backend. Keep audio ownership, private contact access, retry safety, revision conflicts and manager approval server-side. Group sharing exposes the opportunity summary only. No arbitrary client actor override, automatic reference outreach or automatic model-training/policy update occurs on submission/outcome recording.

First build create → apply by voice → manager review. Optional historical imports and interviews belong inside Opportunity.history and do not block that flow. Native capture changes remain in amber-imessage; Sauce owns the shared hiring backend. Do not copy Amber's unrelated circle/tool database or Chewbacca's whole runtime as the hiring architecture.
