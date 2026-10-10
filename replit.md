# Sauce

Sauce's existing interactive vision walkthrough is preserved at `/`. The functional hiring app is separate follow-up work; do not replace or redesign the walkthrough while building it.

## Run & Operate

- Start `artifacts/sauce: web` for the walkthrough.
- Start `artifacts/api-server: API Server` for the shared API.
- Use the artifact-managed workflows, which provide ports and path routing.
- The original walkthrough requires no database or external integrations.
- `/health` preserves the original server's health response; `/api/healthz` is the shared API health check.

## Where things live

- `artifacts/sauce/index.html` — original walkthrough HTML entry point.
- `artifacts/sauce/public/` — original JavaScript, CSS, and favicon, copied without changes.
- `artifacts/api-server/` — shared backend; the frontend must not live here.
- `docs/` and `backend-architecture/` — preserved product handoffs and architecture documents.
- `.migration-backup/` — original project source retained for reference.

## Preservation

The original frontend is plain HTML/CSS/JavaScript, served by the Vite web artifact without converting its UI to React. Its tabs, accordions, keyboard navigation, weighting sliders, copy, and brand assets remain unchanged.

The pre-existing workspace libraries and mockup sandbox remain available. No hiring endpoints, database schema, voice processing, or integrations were added during the port.
