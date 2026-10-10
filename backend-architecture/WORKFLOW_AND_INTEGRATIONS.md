# Sauce nine-step workflow and integration handoff

The frontend journey supplied by Sagar governs this design. Its primary objects are Organization, Person (Applicant/HiringManager profiles), and Opportunity. The loop is **evidence → proposed hypothesis → manager-approved policy → applicant review → new evidence**. Approval is versioned between cycles. This is design, not implemented integrations.

## Map the frontend workflow to records

| Step | Frontend behavior | Backend records and invariants |
| --- | --- | --- |
| 1. Create opening | Company, team, role, seniority, requirements; organization MD, JD MD and voice vision. | Organization/Team/Person membership, OpportunityVersion and pinned sources. Confirm managers/ownership and expose conflicts/missing context. |
| 2. Import previous pool | Select resumes/outcomes; review counts, mappings and identity conflicts. | ImportBatch, source opportunities/cycles, historical Person/profile snapshots, Applications and OutcomeEvents. Apply only the approved preview; reject stale plans. |
| 3. Identify selected candidates | Separate shortlisted, offered, accepted and hired sets. | Stage-specific events at a cutoff; overlap is allowed. Missing stages/times remain unknown; no single success label. |
| 4. Extract patterns | Review proposed job-related characteristics with supporting/counter evidence. | HistoricalCohortVersion and PatternProposals with groups, counts/denominators, coverage and uncertainties. No automatic policy updates. |
| 5. Add employee/manager context | Review recommended participants, explicitly invite consenting people and interview them. | ContextInterview questions/answers and work/ability evidence; explain participant relevance and include perspectives beyond selected hires where possible. No automatic outreach. |
| 6. Draft hypothesis | Seven or eight lines explaining proposed criteria, evidence and gaps. | RoleHypothesis pinned to current requirements/cohort/pattern/interview versions, with line-level citations/uncertainties. |
| 7. Approve policy | Correct hypothesis, approve criteria/anchors/weights/questions and review the diff. | Immutable RolePolicyVersion with sources, approver/time and hash. Reject stale/incomplete approval; prose alone is not executable policy. |
| 8. Review applicants | Profiles, up to three reviewed voice answers, applicant inquiries and prioritized evidence list. | Application snapshots, private inquiry threads, three component evaluations and a comparable-policy PrioritizedListSnapshot. Show gaps and unknowns; human stage decisions stay separate. |
| 9. Capture outcomes | Record later stage events and corrections. | Append-only OutcomeEvents and next-cycle cohort/pattern/hypothesis proposals. Existing policies/models/results stay pinned until explicit reviewed updates. |

An opening can lack history or interviews. The hypothesis must state those gaps instead of fabricating evidence. New applicants still use the approved current-role policy. Inquiries are opportunity conversations, not extra scored screening prompts.

## Eight-line hiring hypothesis template

Display eight semantic lines; keep structured evidence IDs and uncertainty metadata underneath. Do not pad with invented evidence.

1. **Role:** [Role/seniority] in [company/team] owns [current outcomes].
2. **Requirements:** Proposed entry abilities are [job-related criteria], supported by [current-role sources].
3. **History:** In [comparable cohort], [documented characteristic] appeared alongside [specific advancement stage], with [counts/coverage].
4. **Historical uncertainty:** [Missing records, noncomparable roles or alternative explanations] limit that observation.
5. **Work context:** [Employee/manager evidence] describes [actual work, abilities, difficulties and support], with [gaps/conflicts].
6. **Assessment:** Use [criteria/anchors] and up to three approved voice questions; any delivery criterion must be explicit and job-related.
7. **Policy:** Approve [three weights, missingness and prioritization rules]; unresolved items remain unconfigured.
8. **Next review:** Revisit after [cycle/review trigger] with documented outcomes and manager review; advancement is not proof of performance.

A historical association is not a causal claim or a universal ideal-person profile. A selected interview group describes those respondents, not all employees. Criteria must concern actual work, excluding protected traits/proxies, inferred emotion/personality, accent, identifiers or school prestige. Manager approval does not make unsupported criteria predictive.

## Questions, scores and model training

Opportunity has manager discovery, employee context, applicant screening and applicant inquiry questions. [Questions and files](QUESTIONS_AND_FILES.md) defines respondents, voice/text modes, visibility and the max-three screening rule. Approve screening and its content anchors with the role policy. Context interviews and applicant inquiries do not become covert applicant scoring evidence.

Scoring stays `composite_profile`, `voice_transcript`, `voice_behaviors`. The policy supplies weights and anchors. Historical patterns inform proposed criteria; they are not a fourth score. Unknown positive-weight evidence gives a null aggregate, not silent reweighting. Show unknown/noncomparable results separately, rather than hiding those people. Exact ordering/tie rules remain Sagar's decision. Prioritization supports human review; it does not reject applicants, make offers or hire.

Training remains a separate gate: eligible data, reviewed task labels, dataset/model versions, timing cutoffs and held-out evaluation grouped by person/opportunity/cycle. Historical stage outcomes alone do not label applicant quality, emotion or work performance. Future outcomes must not leak into earlier-stage assessment inputs. Recording new outcomes creates a proposal; it does not automatically train or promote models.

## Pulling from Chewbacca

Reference: [calebnewtonusc/Chewbacca](https://github.com/calebnewtonusc/Chewbacca). Local fetched revision inspected for this update: `5d45c826fa8df6354ce5963b968efb0f51319094`, not claimed as newest remote. Public browsing returned 404; source was available in the existing fetched remote. Earlier pinned references remain in [CHEWBACCA_REFERENCES.md](CHEWBACCA_REFERENCES.md).

| Inspected source | Useful functionality | Sauce port boundary |
| --- | --- | --- |
| [`observe` / `observations`](https://github.com/calebnewtonusc/Chewbacca/blob/5d45c826fa8df6354ce5963b968efb0f51319094/bin/lib/gtm_memory.py) | Sourced observations, supersession and out-of-order handling. | EvidenceClaim lineage and corrected context/events; replace client-specific scopes/types with organization/opportunity authorization. |
| Same module: employment and score drivers/history | Source-backed employment rows and retained score history. | Person credentials and component evaluation history. Do not import intent/engagement/temperature formulas or treat default confidence as verification. |
| [`preview`, `apply`, `undo`](https://github.com/calebnewtonusc/Chewbacca/blob/5d45c826fa8df6354ce5963b968efb0f51319094/apps/mcp/amber/amber-mcp) | Staged import, fingerprint-based stale rejection and transactional apply. | Resume/outcome preview with explicit mapping/identity review and scoped reversal. Existing code imports contacts, not resumes/stages; do not copy automatic name/company/phone-key merges or local auth into cloud tenancy. |

First port candidate: isolate the preview/fingerprint contract or observation-supersession utility behind Sauce interfaces. Review dependencies/license at the pinned revision, retain notices, replace desktop paths/hooks and test stale approval, wrong-org linkage, duplicate imports and late corrections. This update maps functionality; it does not vendor runtime code or run Chewbacca installers. Do not merge its unrelated repository history.

## ElevenLabs and Danish's Replit service

Use ElevenLabs behind a transcription adapter with authenticated asynchronous processing and normalized original transcript/timing output; [capabilities/options](QUESTIONS_AND_FILES.md#elevenlabs-adapter-for-danish) are documented separately. Later conversational interviewing can ask approved prompts but cannot silently extend applicant screening or change policy. ASR, transcript assessment and observable audio extraction remain separate tasks. Provider credentials/account access and paid usage were not verified.

Sauce domain services own Organization/Person/Opportunity, permissions, artifacts, review, policy and evaluation. Danish owns the voice ingestion/transcription/quality adapter. If he implements the domain backend in Replit too, keep these boundaries as modules within the same deployment rather than duplicating databases. Frontend owns capture, playback and review UX. Replit is a platform, not a domain object.

Earlier voice v1 events use `job_version_id`; the new wire adapter maps that to `opportunity_version_id`. Agree the version before binding clients; do not accept conflicting aliases. Add typed source purposes for manager vision, manager discovery, employee context, applicant screening and applicant inquiry. Vision is an intake source; the other four map to question purposes. Employee context requires interview linkage and reviewed respondent mapping; it is not an applicant answer.

## Implementation order for the team

1. Freeze the three object views and naming adapter; create one synthetic organization/team/opening with separate manager/applicant role relationships and original three manager sources.
2. Build reviewable historical import with one resume and CSV/JSON event ledger. Prove stage distinctions, unknowns, identity review, idempotency and stale-preview rejection.
3. Build one synthetic/consented voice path with private durable storage, provider adapter and original/reviewed transcripts; implement four question purposes with access rules.
4. Generate a cited eight-line hypothesis from available current/history/context evidence, expose gaps and approve a structured role policy with version diff.
5. Submit an applicant's three profile sections and up to three recordings; add one private inquiry/reply. Return an evidence summary before enabling numbers.
6. After anchors and ordering rules are approved, show comparable-policy prioritized results, record a human outcome and propose a next-cycle revision. Train only after the separate dataset/evaluation gate.

Acceptance: one Person holds both roles without permission escalation; imported people stay unclaimed/private; wrong-org links fail; accepted without hired stays accepted only; ambiguous selected stages need mapping; a fourth scored question fails; inquiries do not affect fit; unreadable documents/audio stay unknown; late worker results cannot replace new takes; outcomes cannot rewrite approved policy; contact changes do not change evaluation; policy changes create separately versioned lists.

See the [synthetic v2 cycle](examples/opportunity-cycle-v2.json) and [Danish's voice handoff](../docs/DANISH_OBJECT_AND_VOICE_HANDOFF.md). These are design fixtures, not deployed endpoints. No real resumes, interviews, outcomes, training or hiring decisions were processed for this update.
