# Sauce

[**Open the working demo**](https://sauce-hiring-demo.parthag22.chatgpt.site)

Sauce turns a hiring team's context and candidate evidence into a small interview shortlist. This repository's `main` branch contains the same application as the hosted demo.

## Demo flow

1. **Company brain:** explore 10,000 fictional hiring records and edit company, team, role, and process context.
2. **Criteria:** draft and approve requirements, then screen 2,400 fictional CVs.
3. **Research:** run the sample research simulation across 12 sources. Disconnect sources and retry the sample failed connection.
4. **Decisions:** review 5 definite interviews, 47 maybes, and 1,196 rejects. Inspect CVs, papers, code, and robot evaluation evidence.
5. **Interview selection:** record notes, change decisions, and select up to 2, 3, or 5 people based on seniority.
6. **Data flywheel:** record interview, offer, acceptance, and hiring outcomes. Refine the next search and approve its criteria again.

CSV and JSON imports, search, pagination, shortlist exports, saved browser state, and reset are functional. All candidates and evidence are fictional. Research and connector activity are simulations. The demo does not contact recruiting services or run live AI models.

## Run locally

Install Node.js 20 or later, then run:

```sh
npm start
```

Open `http://localhost:3000`. No dependency installation, API keys, database, or account is required. The `PORT` environment variable controls the server port.

## Deploy

The `public/` directory is the complete website. `npm run build` copies it into `dist/` for static hosting. The included GitHub Actions workflow publishes `public/` to GitHub Pages when `main` changes, once Pages is configured to use GitHub Actions.

The Dockerfile runs the same app on any host that supports Docker. The production server respects the host's `PORT` setting.

## Previous version

The complete earlier implementation is preserved on [archive/pre-demo-2026-10-10](https://github.com/parthag2211/Sauce/tree/archive/pre-demo-2026-10-10), at commit `d89ab99845fcc2279e47d8887f0ec6ab27652d9b`. Its history remains intact.

## Checks

```sh
npm run check
npm run build
```

The demo was checked in the browser on desktop and mobile, including imports, criteria approval, evidence review, saved notes, interview limits, exports, and hiring outcomes.
