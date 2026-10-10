# Sauce backend design

**Four main objects: Organization, HiringManager, Applicant and Opportunity. Everything else is nested.**

Start with [the short object architecture](OBJECT_ARCHITECTURE.md). It supersedes the earlier Person-based model and expanded entity diagrams. Opportunity is the complete job container, including its description, applications, answers and results.

The basic flow is **create → apply by voice → manager review**. Historical imports, interviews, suggested patterns and a hiring summary are optional tools inside Opportunity.history, not a required nine-step journey.

## Team handoff

- [Danish / Replit](../docs/DANISH_OBJECT_AND_VOICE_HANDOFF.md)
- [Frontend](../docs/FRONTEND_HANDOFF.md)
- [Four-object example](examples/four-object-example.json)
- [Shared integration contract](../docs/INTEGRATION_CONTRACT.md)

## Details when needed

[Simple workflow and integrations](WORKFLOW_AND_INTEGRATIONS.md), [nested storage notes](DATA_MODEL.md), [questions/files](QUESTIONS_AND_FILES.md), [scoring](SCORING_MODEL.md), [Chewbacca source references](CHEWBACCA_REFERENCES.md), [decisions](DECISIONS.md).

This is a design package in parthag2211/Sauce; no hiring backend, approved scoring model or live MCP endpoint is implemented. The native client stays in sagartiw/amber-imessage. Internal persistence/versioning can preserve originals, ownership, stable submissions and safe retries without adding product objects. Existing v1 schemas/events remain limited legacy illustrations, not the current public object model.
