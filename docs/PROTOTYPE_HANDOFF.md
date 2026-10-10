# Sauce: simple sample-demo handoff

The authenticated, persistent counterpart is now documented in [LIVE_API_HANDOFF.md](LIVE_API_HANDOFF.md). This document describes only `/demo`, which remains fictional and browser-local.

The interface has two modes and two actions per mode. Keep backend operations out of the main navigation.

| Mode | Action | Experience |
| --- | --- | --- |
| Hiring manager | Post a job | Company, role, short brief, optional company/job files and voice note. Post, then meet applicants. |
| Hiring manager | Review applicants | Highest sample scores first. Open a person, read their story, and shortlist them. |
| Applicant | My profile | Background, work preferences, contact information and optional references. |
| Applicant | Find jobs | Open a role and answer three questions, one at a time. Submit, then switch roles to review. |

Demo: https://sauce-vision-production.up.railway.app/demo

## What works today

`landing/public/demo/app.mjs` renders a compact, responsive card. Its local state uses the existing four main objects: Organization, HiringManager, Applicant and Opportunity. Applications and answers remain nested inside Opportunity. Posting creates a new opportunity; editing a profile does not overwrite a submitted profile snapshot. Shortlisting records a separate stage event.

The browser stores text in localStorage/sessionStorage and audio blobs in IndexedDB. Role switching shares data on the same browser only. Microphone capture uses MediaRecorder on supported HTTPS browsers, stops after two minutes and retains the original recording. The sample path uses labeled text fixtures, not synthesized recordings. Real recordings require the user to supply their words because speech-to-text is not connected. Files currently accept Markdown or text, up to 1 MB; recordings up to 20 MB. No audio, contact information or uploaded file content is transmitted to the server by this UI.

People, voice answers, history and scores are fictional. Editing an applicant profile or sample answer removes eligibility for a sample score. Unscored submissions display a dash for manager review. This is not a McKinsey application or affiliation.

## Frontend integration

Replace the local mutation handlers with authenticated backend adapters while keeping the same four user-facing actions. Current demo state is intentionally single-browser and assumes one active role; it is not a production session model. The `api.mjs` helper and `/api/demo/*` endpoints are stateless developer mocks, and are not the UI's persistence API. `GET /api/demo/contract` describes their limits. Do not connect them as a real hiring backend.

Keep Parth's historical workflow inside the opportunity: imported pool, stage outcomes, source-backed pattern suggestions, employee/manager context, an eight-line hypothesis, approved policy versions, assessments and cycle outcomes. These are backend capabilities, not nine required onboarding screens. A later contextual approval control can surface a proposed policy without adding an architecture dashboard.

## Danish / Replit voice handoff

Keep original audio, original transcript and user-reviewed transcript separately, with question ID, opportunity ID, applicant ID, MIME type, byte count, duration and capture time. Return a job ID for asynchronous transcription; retain provider/model/version and processing errors. Never overwrite source audio or original transcription during cleanup. Sample answers must remain distinguishable from recordings.

The intended three evaluation channels remain composite profile, transcript content and approved observable vocal delivery. This prototype trains no models. Voice behavior evidence remains unknown, and real applicants receive no generated scores. The backend should attach evidence and policy version to each component, leave missing evidence unknown and apply manager-approved weights only when required components exist. Contacts and references are not numerical fit features. Emotion/personality inference is not implemented.

## Functionality sources reviewed

- Amber ID: `src/routes/voice.js` supplies a provider fallback pattern and transcript processing boundaries. Reuse the pattern behind a Sauce adapter, not its owner-specific authentication or automatic transcript rewriting. No provider code has been ported here.
- [Chewbacca](https://github.com/calebnewtonusc/Chewbacca), reviewed at `5d45c826fa8df6354ce5963b968efb0f51319094`: `bin/lib/glass_search.py` offers source-backed research and explicit provider failures; `bin/lib/gtm_memory.py` supplies provenance/history patterns; the Amber MCP import flow supplies preview/approve/apply boundaries. These are reference patterns, not active integrations.
- ElevenLabs remains an available candidate, not a configured runtime dependency.
- Public role reference: [McKinsey Business Analyst](https://www.mckinsey.com/careers/search-jobs/jobs/businessanalyst-15136). Office-specific requirements vary; demo wording is illustrative.

Next implementation boundary: authentication and shared persistence, then signed audio uploads and transcription, then source-backed enrichment and versioned assessments. The browser card and future iMessage interface should call the same authenticated API. Native iMessage and a Sauce MCP endpoint are not implemented by this change.

## Verification

`cd landing && npm test` checks score unknowns, weight validation, three-answer completeness, stage preservation and mock API input boundaries. Browser checks cover job posting, profile saving, all three sample answers, review ordering, shortlisting and a 390px viewport. Live microphone capture requires a manual check in the demo user's browser.
