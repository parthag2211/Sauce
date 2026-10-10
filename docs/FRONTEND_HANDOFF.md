# Sauce frontend handoff — four objects

Use [Organization, HiringManager, Applicant and Opportunity](../backend-architecture/OBJECT_ARCHITECTURE.md). Everything else is nested. Opportunity is the complete job page/container: JD, manager vision, questions, applications, scores and history. Person is not a main object and Application is not a fifth main object.

## Three-step journey

1. **Create:** manager selects an organization, adds JD Markdown and voice vision, approves up to three screening questions and scoring settings. Organization supplies its Markdown context.
2. **Apply:** applicant supplies credentials, work proposal and contacts/references; records screening answers, reviews transcripts and submits. Show employer inquiries separately with voice/text questions and replies.
3. **Review:** manager sees submitted profiles, three assessment components, evidence/gaps and recorded hiring stages.

Do not require historical import, employee interviews, hypothesis creation or training screens to complete the basic journey. These are optional tools within the Opportunity's History area. The earlier nine-step workflow describes possible features, not nine mandatory steps.

## Nested UI data

- `Organization`: company context and teams.
- `HiringManager`: manager and organization/opportunity links.
- `Applicant`: the three profile sections.
- `Opportunity`: description, vision, questions, scoring, applications[] and history.

An application view reads an entry in opportunity.applications; its answers/results/status stay together. An inquiry is nested under opportunity.questions.fromApplicants and has no scoring effect. Existing technical version IDs and provider states are backend metadata, not more navigation objects.

Frontend owns capture/playback, upload/transcription progress, transcript review and weight controls. Backend owns private storage/access, selected takes, immutable submitted copies and authoritative assessments. A role toggle does not grant permission. Group cards contain the job summary, not private contacts or answers. A successful transcript preview alone does not prove stored audio.

Use percentages for the three manager-set weights: composite profile, transcript content and approved observable vocal delivery. No default split/anchors is approved. Show unconfigured or unknown results honestly; do not compute authoritative scores in the client. Preserve shortlisted, offered, accepted and hired distinctly in the nested outcome history.

See [the four-object example](../backend-architecture/examples/four-object-example.json), [simple workflow](../backend-architecture/WORKFLOW_AND_INTEGRATIONS.md), [file types](../backend-architecture/QUESTIONS_AND_FILES.md) and [backend contract](INTEGRATION_CONTRACT.md). These are design targets; application submission is not implemented yet.
