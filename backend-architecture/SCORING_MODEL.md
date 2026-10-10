# Sauce scoring inside an opportunity

The four main objects are Organization, HiringManager, Applicant and Opportunity. Scoring is nested data, not another main object.

## Configuration and results

The manager defines criteria and weights in **Opportunity.scoring**. Each applicant's results live in **Opportunity.applications[].assessment**.

| Component | Evidence |
| --- | --- |
| composite_profile | Relevant credentials/work proposal against the job requirements; permitted verified reference evidence if available. |
| voice_transcript | What the applicant says in the approved screening answers, assessed against content criteria. |
| voice_behaviors | Explicitly approved observable job-related delivery measures from the original recordings, with quality checks and human review. |

Organization Markdown, JD Markdown and manager vision define the target requirements. They are not the weighted components. Contacts/reference listings, names, prestige, protected traits or their proxies do not improve fit. Voice analysis does not infer emotion/personality, honesty or demographic traits for hiring.

## Simple scoring rule

After criteria/anchors are defined on a common scale:

`overall = profileWeight * profileScore + transcriptWeight * transcriptScore + deliveryWeight * deliveryScore`

Manager weights are normalized, total one, and have no approved defaults. Reject invalid totals rather than silently renormalizing. Without approved criteria/weights, return unconfigured/null results. A positive-weight component with missing/conflicting/unusable evidence makes the aggregate null; do not substitute zero or redistribute its weight. A zero-weight component may be unassessed and is omitted from the sum, rather than multiplying null by zero. Keep evidence/gaps alongside each result. An unknown result is not a failed applicant.

Recording quality and observed delivery are different from suitability. A pause/rate measurement has no inherent good/bad meaning without a defensible job criterion. If none exists, delivery stays unscored. Questions applicants ask the employer are not scoring evidence, and extra screening cannot be hidden in inquiry threads or interviews.

## History is nested too

Store the submitted profile/selected answers and assessment settings with the application's saved submission; retain prior settings/results under nested revision history. Later edits do not silently change an earlier result. Compare applicants only with the same scoring settings and adequate evidence; show unknowns separately. Exact prioritization/tie rules still need Sagar's definition. The manager makes stage decisions; a score does not automatically reject, offer or hire.

Optional imported resumes/outcomes and interview notes belong to Opportunity.history. Historical patterns may suggest job-related criteria for manager review, but advancement is not proof of performance. Do not automatically change weights or train models when outcomes arrive. Transcript/audio training requires separately eligible data, human-reviewed task labels and held-out evaluation; keep its provenance internal.

All scoring here is a design. No numerical anchors, trained evaluators or live scoring implementation exists yet. See [the four-object architecture](OBJECT_ARCHITECTURE.md) and [Danish handoff](../docs/DANISH_OBJECT_AND_VOICE_HANDOFF.md).
