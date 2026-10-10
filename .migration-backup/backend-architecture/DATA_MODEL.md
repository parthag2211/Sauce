# Sauce nested data model

Use the [four main objects](OBJECT_ARCHITECTURE.md): Organization, HiringManager, Applicant and Opportunity. The older Person model and expanded entity diagram are superseded.

| Main object | Owns | References |
| --- | --- | --- |
| Organization | company Markdown, teams and organization access settings | hiring managers, opportunities |
| HiringManager | manager identity/contact information | organization, managed opportunities |
| Applicant | credentials, work proposal, contacts/references and original profile files | opportunities they applied to |
| Opportunity | JD, manager vision, organization-context reference, questions, scoring settings, applications and history | organization, hiring manager, applicants |

An application is `Opportunity.applications[]`. Its submitted profile, voice answers, assessment and outcome history are nested together. An employer inquiry is `Opportunity.questions.fromApplicants[]`, with applicant identity, question, replies and visibility. Historical resumes/interviews/hypothesis are `Opportunity.history` fields. None is a fifth main object or a separate required workflow.

Raw Markdown, resumes, audio and transcript outputs can live in private durable file storage. Their nested file metadata contains a file ID, storage reference, original name/type, hash, processing state and revision. Preserve originals versus reviewed interpretations. The file store is infrastructure, not another product object.

Keep internal ownership/revision IDs and indexes as needed for access, retries and consistent submissions. A changed profile/JD/recording must not silently rewrite an old submission or assessment. The frontend consumes the four object shapes regardless of internal indexing. Do not impose a normalized database schema until the team agrees the implementation.

Historical imports remain private and source-labeled, with explicit identity linking. Voice screening requires a completed recording and reviewed transcript for each required question; an imported historical resume need not have current screening answers. Private contacts/reference details stay outside fit inputs. Preserve distinct hiring-stage history and show unknown evidence honestly.

See [the nested example](examples/four-object-example.json) and [integration contract](../docs/INTEGRATION_CONTRACT.md).
