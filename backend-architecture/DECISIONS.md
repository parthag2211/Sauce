# Sauce current architecture decisions

## Confirmed structure

- Exactly four main objects: Organization, HiringManager, Applicant and Opportunity.
- Everything else is nested. Person is not a main object. Applications are entries inside Opportunity, not a fifth main object.
- Opportunity is the complete job container: description, manager vision, questions, applications, assessments and history.
- The basic workflow is create → apply → review. The older nine-step sequence is not mandatory.

## Inputs and behavior retained

- Manager: organization Markdown, JD Markdown, recorded voice vision.
- Applicant: credentials, work proposal, contacts/references.
- Maximum three screening questions; applicant responses are voice based, with transcript review.
- Both screening questions and applicant-to-employer inquiries belong under Opportunity.questions; inquiries do not affect fit.
- Manager defines the weights for composite profile, transcript content and approved observable vocal delivery under Opportunity.scoring.
- Shortlisted, offered, accepted and hired remain distinct in each application's nested outcome history.
- Optional historical resumes/outcomes, employee/manager interviews, pattern notes and 7–8-line hiring summary live inside Opportunity.history.

## Implementation boundaries

- Shared backend repository: parthag2211/Sauce, nested locally in amber-imessage/Sauce.
- Native iMessage repository: sagartiw/amber-imessage; iMessage and MCP use the same backend permissions.
- Danish uses Replit; ElevenLabs is available as a candidate transcription adapter, not a verified connection.
- Chewbacca is a library reference for scoped reviewed imports and evidence/history patterns; no runtime code is ported.
- Original audio/documents and reviewed text remain distinct; submitted data does not silently change with later edits.
- Contacts do not affect fit; voice processing does not infer emotion/personality for hiring. Missing evidence stays unknown. Historical advancement is not job performance or automatic training truth.

## Still to define

Required profile fields; exact screening criteria/anchors; manager weights; private data retention and training eligibility; file/recording limits; prioritization rules; backend framework/provider configuration and wire routes.

These choices can be implemented as nested settings/metadata; they do not require more primary objects. See [the short architecture](OBJECT_ARCHITECTURE.md). No working hiring backend or trained model is claimed.
