# Sauce landing page and live portal

[Landing page](https://sauce-vision-production.up.railway.app) · [live portal](https://sauce-vision-production.up.railway.app/portal) · [fictional demo](https://sauce-vision-production.up.railway.app/demo)

The public landing page links both roles into a compact portal. Live users create an account, post jobs, save profiles, record/review voice answers and submit applications. Managers review submitted evidence and shortlist applicants. Real data starts empty. CSV/JSON historical imports are optional, with preview and confirmation. Real fit scores stay null; model training and automated matching are not implemented.

See [the frontend / Danish API handoff](../docs/LIVE_API_HANDOFF.md). The original internal vision remains at `/vision`; the browser-only fictional walkthrough remains at `/demo`.

## Run and verify

Node.js 22.13 or newer; no dependencies to install.

```sh
cd landing
npm start
npm test
```

Open http://localhost:3000. Local SQLite data is created in ignored `.data/`. Set `SAUCE_DATA_DIR` to another directory. Voice capture needs a supported browser on HTTPS (localhost is supported by compatible browsers). Optional provider configuration: `GROQ_API_KEY`, or `ELEVENLABS_API_KEY` if Groq is absent. Never place provider keys in frontend code.

## Railway

Project `amberintelligence` (`758c0c59-8ac7-4cbd-9b29-f67075de8e72`), production service `sauce-vision` (`046d10cf-4098-4519-85b8-ce096af8be00`). Persistent volume `sauce-vision-volume` (`141a67d1-b7de-44c2-af70-fd42285909cd`) mounts at `/data`. `RAILWAY_VOLUME_MOUNT_PATH` is injected by Railway. Startup prepares permissions then drops to the `node` user. Keep one replica.

```sh
railway up . --path-as-root --no-gitignore --service sauce-vision --environment production --project 758c0c59-8ac7-4cbd-9b29-f67075de8e72 --detach
```

The archive contains only this directory. `.railwayignore` excludes local data, tests and environment files while explicitly including demo assets despite parent ignore rules. GitHub pushes alone do not redeploy. `/health` reports server health; `/api/v1/session` identifies live API availability without exposing records. The deployed Groq credential is configured privately through Railway, not committed.

Default public origin is `https://sauce-vision-production.up.railway.app`. Set `SAUCE_PUBLIC_ORIGIN` when changing domains; write requests require an exact Origin match.

## Code boundaries

- `public/home.html`, `home.css`: public landing and role links.
- `public/portal.html`, `public/demo/portal.mjs`: authenticated two-role UI.
- `public/demo/portal-voice.mjs`: memory-only capture and authenticated upload.
- `backend/`: private account, four-object domain, SQLite storage, voice and import logic.
- `server.mjs`: static serving, health and HTTP routing.
- `public/demo/app.mjs`: separate browser-only fictional demo.
- `demo-router.mjs`: separate stateless mock namespace; never use it for real records.
- `test/`: domain/access/persistence/import/transcription tests.
