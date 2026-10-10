# Sauce architecture decisions

## Confirmed by Sagar

- Product: Sauce, a voice-powered applicant marketplace.
- iMessage client repository: sagartiw/amber-imessage (renamed from future-of-work-hackathon-gsb).
- Backend destination repository: parthag2211/Sauce; separate from the Amber client.
- Manager intake: uploaded organization Markdown, uploaded JD Markdown, voice vision.
- Sauce generates no more than three screening questions; applicant responses are voice based.
- Applicant intake: credentials (academic/work history), work proposal, contacts and references.
- Hiring manager defines the three scoring input weights through the future frontend.
- Backend architecture and scoring design only for the current phase.
- Chewbacca is a reference for reusable functionality, not an instruction to install it.

## Latest confirmed correction

The manager weights composite applicant profile, applicant voice transcript content, and
applicant voice intonation/behaviors. Organization/JD/manager-voice are role-definition
sources, not scoring axes. Sagar corrected the initial selection explicitly.
The Sauce checkout is in `/Users/sagartiwari/Desktop/Codex/amber/amber-imessage/Sauce`, inside amber-imessage as a separate checkout.

## Open decisions

- How each confirmed component maps to job-related evidence and rating anchors.
- Per-axis rating anchors, missing-evidence handling, and overall fit versus ranking.
- Allowed weight values, zero-weight behavior, and configuration approval/versioning.
- Applicant credential/proposal/contact intake formats, required fields and reference count.
- Manager approval behavior for generated questions and allowed regeneration.
- Audio retention, transcript correction, withdrawn submission and profile sharing policies.
- Organization context reuse, application uniqueness/resubmission, discovery and reviewer access.
- Production backend stack, authentication provider, object storage and deployment.

Architecture recommendations in the other files remain proposals. Resolve these choices
before migrations or a numerical scoring implementation.

## Initial Sauce documentation contribution

Write access is confirmed. Frontend and backend/voice handoffs plus shared contract
are included under `docs/`. Framework, voice provider, recording limits, retention,
per-component rating anchors and ranking policy remain open decisions.
