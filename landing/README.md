# Sauce vision landing page

Live: https://sauce-vision-production.up.railway.app

An interactive team walkthrough of the hiring manager's three inputs, the applicant's three profile inputs, up to three voice answers, the shared backend pipeline, and manager-configured scoring weights. All people, transcripts, and percentages are illustrative. The site does not collect uploads, record audio, evaluate applicants, or train models.

## Run locally

Requires Node.js 22 or newer. No dependencies to install.

```sh
cd landing
npm start
```

Open http://localhost:3000. Set `PORT` to use another port. `GET /health` returns a health response.

## Preview on Replit

The Replit environment uses Node.js 22. Click **Run** to start the
**Sauce walkthrough** workflow and open Preview. From the repository root, the
equivalent command is:

```sh
PORT=5000 npm --prefix landing start
```

The server binds to `0.0.0.0:5000`; no dependency installation or secrets are
required. This previews the existing illustrative walkthrough, not a working
hiring backend. The repository layout and Railway deployment are unchanged.

## Deploy to Railway

Project: `amberintelligence` (`758c0c59-8ac7-4cbd-9b29-f67075de8e72`). Environment: `production`. Service: `sauce-vision` (`046d10cf-4098-4519-85b8-ce096af8be00`). The existing `amber-website` and `amber-id` services are separate.

From this directory, with Railway CLI authenticated:

```sh
railway up . --path-as-root --service sauce-vision --environment production --project 758c0c59-8ac7-4cbd-9b29-f67075de8e72 --detach
```

The path flag ensures the deployment contains only this standalone landing page. Railway builds the included Dockerfile, and the server binds to its assigned `PORT` on `0.0.0.0`. No credentials or environment secrets are needed. Deployments currently use the CLI; pushing GitHub alone does not redeploy this service.

## Edit the vision

- `public/index.html`: narrative, diagrams, screening examples, team handoff links.
- `public/app.js`: journey content, backend stage content, accessible interactions, and illustrative weight validation.
- `public/style.css`: visual design and responsive layouts.
- `server.mjs`: dependency-free static server and health endpoint.

Keep this explanation aligned with `../docs/INTEGRATION_CONTRACT.md`. Manager context sources are not the weighted scoring components. The scoring inputs are the composite applicant profile, applicant transcript content, and permitted observable voice behavior evidence.

Manual checks: desktop and 390px mobile layouts; both role tabs; screening answer accordion; backend stage tabs; weights totaling more than 100%; reset to the illustrative 50/35/15 mix; no browser console errors. Keyboard navigation and reduced-motion styles are supported.
