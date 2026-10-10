# Chewbacca functionality to consider for Sauce

For the current Organization/Person/Opportunity workflow, see [the scoped functionality map](WORKFLOW_AND_INTEGRATIONS.md#pulling-from-chewbacca). That update inspects locally fetched revision `5d45c826fa8df6354ce5963b968efb0f51319094` for observation supersession, employment/score history and preview/apply import protection. The older pinned inventory below remains source background. Neither inventory claims a runtime port or newest-remote verification.

Reference repository: https://github.com/calebnewtonusc/Chewbacca
Inspected revision: `4b288c0f783e5bef5e21aedc1c4da050a2157b07`.
Inspection covered the files linked below; no Chewbacca install scripts, hooks or model
calls were run. README performance numbers were not independently reproduced.
The repository license endpoint reports MIT. If code is later copied, preserve the
applicable copyright and license and review any third-party dependency licenses.
This package contains architectural references, not copied runtime source.

| Inspected source | Useful behavior | Proposed Sauce adaptation |
| --- | --- | --- |
| [GTM memory](https://github.com/calebnewtonusc/Chewbacca/blob/4b288c0f783e5bef5e21aedc1c4da050a2157b07/bin/lib/gtm_memory.py) | Employment history, observations with sources, scoped records, score history and drivers. | Separate raw source, interpreted claims, immutable application snapshots and evaluation history. Reimplement for Sauce ownership and Postgres if selected. |
| [Amber MCP implementation](https://github.com/calebnewtonusc/Chewbacca/blob/4b288c0f783e5bef5e21aedc1c4da050a2157b07/apps/mcp/amber/amber-mcp) | Import preview, stale-plan rejection, apply and undo; authenticated local HTTP and fixed user scope. | Review extracted Markdown/profile changes before save, require expected revisions, expose actor-scoped tools. Its local per-user server is not a cloud tenant model. |
| [Amber MCP guide](https://github.com/calebnewtonusc/Chewbacca/blob/4b288c0f783e5bef5e21aedc1c4da050a2157b07/apps/mcp/amber/README.md) | Contact deduplication and scoped contact stores. | Normalize applicant contact methods, but do not import the last-ten-phone-digits match rule or merge applicants automatically. References must be distinct from identity. |
| [People scoring](https://github.com/calebnewtonusc/Chewbacca/blob/4b288c0f783e5bef5e21aedc1c4da050a2157b07/bin/lib/people/scoring.js) | Source-aware evidence, time handling and recomputation. | Reuse the idea of explicit evidence drivers and versioned calculations. Its relationship dimensions, decay and saturation formula do not measure hiring fit. |
| [Brain retrieval](https://github.com/calebnewtonusc/Chewbacca/blob/4b288c0f783e5bef5e21aedc1c4da050a2157b07/apps/brain-retrieval/README.md) | Markdown as source of truth; derived retrieval indexes; abstention and held-out evaluation. | Retrieve JD/organization excerpts within authorized job scope if needed. Start with direct evidence spans for two short files; do not import tuned personal-corpus thresholds. |
| [Voice memory](https://github.com/calebnewtonusc/Chewbacca/blob/4b288c0f783e5bef5e21aedc1c4da050a2157b07/bin/lib/voice_memory.py) | Routed utterance log and separate project/draft context. | Persist typed voice events with explicit principal/job/application context. Its local files and TTL guesses need replacement for server concurrency. |
| [Voice runtime](https://github.com/calebnewtonusc/Chewbacca/blob/4b288c0f783e5bef5e21aedc1c4da050a2157b07/voice/README.md) | Streaming reply protocol with say/add/end/hush events. | Optional later spoken-response adapter. This is macOS/CoreML text-to-speech, not a ready-made cloud transcription or iMessage backend. |
| [Evidence-support examples](https://github.com/calebnewtonusc/Chewbacca/blob/4b288c0f783e5bef5e21aedc1c4da050a2157b07/library/decisions/evidence-support/README.md) | Distinguishes connectivity smoke tests from real accuracy evidence. | Freeze labeled synthetic hiring examples before evaluator calls; preserve abstentions and avoid claiming score quality from a tiny demo. |

## Suggested adoption order

First adopt explicit source references, reviewed extraction and versioned history.
Then implement service-scoped MCP tools and replay/stale-write protection. Evaluate
retrieval only if source size requires it. Add spoken response streaming after the
hiring workflow exists. None of this requires importing Chewbacca's desktop agent,
global setup hooks, private personal context, message history or relationship scoring.

The Sauce collaborator should choose the first concrete function to port after the
architecture review. A real port needs isolated dependencies, retained license notices,
focused tests and a comparison against a simple Sauce-specific baseline. These sources
are references for that decision; no port has been performed or claimed.

## Pulling selected functionality into the local Sauce checkout

Sauce lives at `amber-imessage/Sauce` as an independent Git checkout. Its `origin`
is `parthag2211/Sauce`; an additional `chewbacca` remote points to
`calebnewtonusc/Chewbacca`. A remote is a source reference, not a runtime dependency.

```sh
# Run inside amber-imessage/Sauce.
git fetch chewbacca main
git show chewbacca/main:bin/lib/gtm_memory.py
```

Review a candidate module and its dependencies at a pinned commit. Adapt only the
needed logic into the Sauce domain, retain MIT notices for copied code, and add
focused Sauce tests. Record original commit/path, destination path, adaptation,
dependencies and validation. Do not merge Chewbacca's whole unrelated history or
activate its setup hooks as a shortcut. Selective cherry-picking is appropriate only
for a self-contained reviewed commit; most current candidates need a scoped port.

First candidates are evidence provenance, reviewed extraction/stale-write protection,
and score-history records. Chewbacca's relationship scoring formulas do not implement
Sauce's three manager-weighted components. No functionality has been ported yet.
