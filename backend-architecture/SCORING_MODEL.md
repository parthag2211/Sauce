# Sauce scoring model — three manager-weighted components

## Confirmed configuration

Sagar defines three scoring components:

1. **Composite applicant profile:** academic/work credentials, work proposal and
   permitted reference evidence. Contact information serves identity and communication.
2. **Applicant voice transcript:** the content of their recorded screening answers.
3. **Applicant voice intonation and behaviors:** explicitly defined observable delivery
   measures from those recordings, with human review and recording-quality checks.

The hiring manager sets each component's weight in the future frontend. Backend commands
validate and store those weights for a specific job and immutable rubric version. These
are applicant-side components; organization Markdown, JD Markdown and manager vision are
sources for defining the role and rubric. They are not the three weighted components.

No default weights are supplied. Criterion anchors, delivery measures, thresholds and
whether to show ranking remain Sagar's decisions. No live scoring is implemented here.

## Proposed weight contract and aggregate

Represent weights as `composite_profile`, `voice_transcript`, `voice_behaviors`, each in
[0,1], summing to 1 (within a defined numerical tolerance, proposed 1e-6). The frontend may
show percentages, but the backend stores normalized values and rejects invalid totals;
it does not silently renormalize. Zero disables that component for aggregate scoring.
An explicit manager action confirms a versioned configuration. Changes create a new version.

For approved per-component scores on a common 0–100 scale, the proposed formula is:

`overall = w_profile * s_profile + w_transcript * s_transcript + w_behaviors * s_behaviors`

This formula is a recommendation for review, not an implemented evaluator. Per-component
rating anchors must be defined before numeric scoring is enabled. Weights alone cannot
establish what constitutes a good profile, answer or communication behavior. A draft with
null weights/anchors yields `not_configured`, aggregate null and no ranking.

For every positive-weight component, insufficient/conflicting evidence produces aggregate
null under the proposed conservative missingness policy. Never turn an unavailable recording
into zero or silently redistribute its weight. A zero-weight component may be unassessed
without blocking the aggregate. Report coverage as the sum of supported positive weights;
include each component's state and score so the number remains interpretable.

## Component evidence and rating boundaries

| Component | Inputs | Assessment design |
| --- | --- | --- |
| Composite profile | Submitted credential history, applicant work proposal, and any explicitly permitted verified reference material. | Job-related rubric anchors such as demonstrated relevant work and alignment with the applicant's proposed scope. Preserve self-report versus verification status. Contact fields and a mere reference listing do not create positive evidence. |
| Voice transcript | Applicant-reviewed transcripts for the pinned set of at most three questions. | Assess answer content against approved question/requirement anchors, with exact source citations. Correction history is retained; transcription uncertainty is not poor applicant performance. |
| Voice behaviors | Original answer audio and timestamped measurements, tied to recording quality and metric version. | Describe observable measures such as speaking rate and pause timing. Any scoring needs explicit job-related communication criteria and human review. No personality, emotion, honesty, intelligence, health, disability, demographic or protected-trait inference. Accent and pitch are not fit criteria. |

The third component stores evidence and interpretable measurements rather than a label
such as “confident” or “culture fit.” A long pause could reflect a connection failure;
quality checks can make a measure unavailable. Intonation cannot be used to infer hidden
traits. Retain metric units, observed interval, extraction method and uncertainty; do not
claim a derived measurement is validated just because it can be computed. Delivery behavior
assessments support review; they never trigger automatic rejection or hiring decisions.
If no defensible role-specific behavior anchors are configured, this component is unscored.
The manager must then explicitly set its weight to zero or leave the overall score unknown.

Manager vision can suggest job-related rubric anchors, but ambiguous vibes stay unresolved
until clarified. Avoid counting the same transcript claim repeatedly just because it also
appears on a profile: show source overlaps and let criterion design specify how they count.
Do not multiply profile quality by reference quantity or prestige. Do not contact references
automatically or treat provided contact details as verified endorsements.

## Evaluation records and execution

`rubric_version`: job_version, configuration status, creator/approver, three component
weights, per-component anchors, allowed evidence, required factual requirements, missingness
policy, intended presentation fit_description/ranking (undecided), version and content hash.

`voice_behavior_observation`: answer_take_id, audio artifact id, metric name/unit/value,
start/end timestamps, extraction method/version, quality state, uncertainty and source hash.
These are private application data. No such observations currently exist in the runtime.

`component_assessment`: evaluation id, component key, status supported/insufficient/conflicting/
not_applicable/failed, score null/value, rubric anchor IDs, source citations and reasoning.
Missingness is separate from evaluator failure. A model's confidence is not a fit score.

`evaluation`: immutable submission id, pinned job/profile/question/answer versions,
rubric_version, input digest, model/prompt/metric versions, three component assessments,
aggregate null/value, coverage, factual requirement states, status and timestamps.
The service verifies that rubric and submission belong to the same job and authorized tenant.
Factual requirements are met/unmet/unknown separately from the weighted score; unknown
is never silently converted to unmet. No score constitutes an automatic hiring decision.

Compute aggregate deterministically after validating structured assessments. Models cannot
change weights or invent a fourth component. Raw contact data is excluded from scoring
requests. Results are append-only; a current-result pointer references the appropriate run.
A new rubric, answer correction, audio take or submission creates a new input digest.
Retries reuse the same run key; explicit reevaluation records its reason and version.
Deletion of retained source material removes derived indexes/metrics and marks historical
results as no longer fully reproducible. Retention policy still requires a decision.

## Review fixtures before implementation

Freeze human-labeled examples before evaluating: strong/weak content, sparse credentials,
unknown references, corrected transcript, unusable audio, accent variants with equivalent
content, positive-weight missing component, zero-weight missing component, revised weights,
stale rubric confirmation, duplicate retry and wrong-job access. Contact-only changes must
not affect fit. Identical content should have identical transcript-content assessments;
voice behavior analysis must not smuggle delivery judgments into the transcript component.

Compare per-component agreement, abstention, recording-quality failures and overall coverage.
Sagar defines acceptance limits and reviews disagreements before enabling scoring. No live
model calls, audio analysis or hiring outcomes were tested in this architecture phase.
