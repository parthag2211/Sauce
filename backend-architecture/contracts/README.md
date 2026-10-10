# Illustrative contracts

`sauce.schema.json` is a JSON Schema 2020-12 draft, with fictional examples in ../examples.
It represents intake shape, a 1–3 question cap and voice-answer provenance requirements.
It does not specify approved applicant completeness rules or a production scoring model.
The three components are composite_profile, voice_transcript and voice_behaviors.
Draft weights remain null because no numerical configuration has been chosen.

JSON Schema alone cannot enforce artifact ownership, unique question ordinals, question
membership in the application's pinned set, approved source versions, reviewer membership,
weight sums or a real voice upload. Those need transactional service/database checks.
The `.example` schema ID and synthetic artifact IDs/hashes are placeholders, not live URLs.
Empty references and omitted contact methods in examples are intentional pending decisions;
they are not a claim that an application may be submitted without contact information.
