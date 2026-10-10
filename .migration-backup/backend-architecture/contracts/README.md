# Design examples and internal contracts

The current architecture has exactly [four main objects](../OBJECT_ARCHITECTURE.md): Organization, HiringManager, Applicant and Opportunity. Start with [the four-object example](../examples/four-object-example.json). It is synthetic design data, not a deployed API or evidence of working uploads/scoring. Applications, questions, files, scoring and history are nested underneath those objects.

`sauce.schema.json` describes selected earlier intake fields, the three-question cap and voice provenance. It is a legacy partial schema, not validation for the current four-object example. Earlier job/rubric names require mapping to Opportunity's nested fields before reuse. Draft weights remain null because no numerical configuration has been chosen.

`voice-process-request.json` and `voice-process-result.json` under examples are proposed internal worker-event fixtures. They illustrate voice processing, not additional public objects. Their hashes, transcripts and measurements are synthetic. Agree the mapping from their IDs to nested opportunity/application/answer paths before integration; a production event schema remains to be agreed.

A schema alone cannot enforce ownership, question membership, selected takes, immutable submissions, valid weight totals or real recordings. Those checks belong in the authorized backend. See [Danish's handoff](../../docs/DANISH_OBJECT_AND_VOICE_HANDOFF.md).
