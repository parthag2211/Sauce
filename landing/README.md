# Sauce web prototype

[Play the demo](https://sauce-vision-production.up.railway.app/demo). The simple demo is also the site homepage. The original team vision remains at `/vision`.

The compact demo has four actions: post a job, review applicants, edit your profile and find jobs. It starts with a fictional McKinsey undergraduate Business Analyst scenario and supports three question-by-question sample responses. People and scores are illustrative; nothing is submitted to McKinsey.

Text and uploaded Markdown/text briefs remain in browser storage. Microphone recordings remain in IndexedDB. Live transcription, shared persistence, enrichment and model training are not connected. Sample scores are prewritten; changed applicant inputs receive no fabricated score. See [the team handoff](../docs/PROTOTYPE_HANDOFF.md).

## Run and verify

Node.js 22 or newer; no dependencies to install.

```sh
cd landing
npm start
npm test
```

Open http://localhost:3000/demo. Set `PORT` for another port. `/health` reports server health. `/api/demo/contract` documents the separate stateless mock router, which the local-state UI does not use for persistence.

## Deploy

Existing Railway project: `amberintelligence` (`758c0c59-8ac7-4cbd-9b29-f67075de8e72`). Production service: `sauce-vision` (`046d10cf-4098-4519-85b8-ce096af8be00`).

From this directory:

```sh
railway up . --path-as-root --no-gitignore --service sauce-vision --environment production --project 758c0c59-8ac7-4cbd-9b29-f67075de8e72 --detach
```

Only this directory is deployed. Its local `.railwayignore` keeps demo assets included despite parent repository rules and excludes environment files. The included Dockerfile starts the dependency-free server on Railway's `PORT`. No provider secrets are needed. GitHub pushes do not redeploy the service automatically.

## Files

- `public/demo/app.mjs`: two-role card UI and browser-only demo state.
- `public/demo/demo.css`: compact mobile/desktop styling.
- `public/demo/voice.mjs`: local audio capture and storage.
- `public/demo/seed.mjs`, `logic.mjs`: fictional developer fixtures and mock evaluation helpers.
- `demo-router.mjs`: stateless `/api/demo/*` routes with explicit mock limitations.
- `public/index.html`, `app.js`, `style.css`: original team vision.
- `server.mjs`: static assets, health and mock routing.
