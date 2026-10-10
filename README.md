# Sauce

[**Open Sauce**](https://parthag2211.github.io/Sauce/)

[**Password protected working demo**](https://sauce-hiring-demo.parthag22.chatgpt.site/working) · [Sites version](https://sauce-hiring-demo.parthag22.chatgpt.site)

Sauce turns a hiring team's context and candidate evidence into a small interview shortlist. The top **Working demo** button opens the live workflow. This repository contains its frontend, server, source adapters, and decision logic.

## Working demo

1. Enter the demo password, shared privately by the owner.
2. Load three public CV samples for Cheng Chi, Yilun Du, and Chelsea Finn.
3. Approve a job-related research criterion.
4. Retrieve three real papers through the free arXiv API.
5. Inspect supported authorship and uncertain individual deployment ownership, with original source links.
6. Evaluate the evidence through the OpenAI Decisions API using `gpt-6-luna`.
7. Change and approve the criterion. Run the updated evaluation and compare the recommendations.
8. Export the evidence, source timestamps, criterion history, and API results.

The prominent notice after login explains the hackathon's data and API funding limits. The researchers are public examples, not actual applicants. CV cards are curated summaries, not fresh PDF extraction. Cheng's public CV is dated February 2024. The ownership claim is a demo verification question, not an assertion made by a researcher. Authorship is verified against the retrieved author list; it does not establish who personally deployed or maintained a robot.

Missing evidence stays uncertain. A human makes every hiring decision. The demo evaluates evidence coverage and does not contact researchers or employers.

### Live sources

- [Cheng Chi's public CV](https://cheng-chi.github.io/assets/files/cv.pdf)
- [Yilun Du's public CV](https://yilundu.github.io/cv.pdf)
- [Chelsea Finn's public CV](https://ai.stanford.edu/~cbfinn/_files/cv.pdf)
- [arXiv API documentation](https://info.arxiv.org/help/api/user-manual.html)
- [OpenAI Decisions API documentation](https://developers.openai.com/api/docs/guides/decisions)

### Access and cost controls

The server validates the password and issues a signed, expiring HttpOnly cookie. Hosted cookies are Secure and SameSite Strict. The password hash, signing secret, and OpenAI key are runtime secrets and never enter browser JavaScript or GitHub. Paid requests require authentication and criterion approval. Only three fixed CV samples and three fixed criteria are accepted. No arbitrary prompts, uploads, URLs, or model names reach the paid API.

Paper retrieval and API results are cached for 24 hours, with visible cache labels and original timestamps. Login and API requests are rate limited. A per-runtime daily backstop limits paid evaluations to nine. These controls reduce abuse; they are not an account-level hard spending cap. Source and API failures display errors without simulated recommendations.

## Product walkthrough

1. **Company brain:** explore 10,000 fictional hiring records and edit company, team, role, and process context.
2. **Criteria:** draft and approve requirements, then screen 2,400 fictional CVs.
3. **Research:** run the sample research simulation across 12 sources. Disconnect sources and retry the sample failed connection.
4. **Decisions:** review 5 definite interviews, 47 maybes, and 1,196 rejects. Inspect CVs, papers, code, and robot evaluation evidence.
5. **Interview selection:** record notes, change decisions, and select up to 2, 3, or 5 people based on seniority.
6. **Data flywheel:** record interview, offer, acceptance, and hiring outcomes. Refine the next search and approve its criteria again.

CSV and JSON imports, search, pagination, shortlist exports, saved browser state, and reset are functional in this walkthrough. Its large candidate pool and connector activity remain clearly labelled simulations. The separate Working demo uses live arXiv retrieval and the Decisions API.

## Run locally

Install Node.js 22 or later, then run:

```sh
npm start
```

Open `http://localhost:3000`. The product walkthrough needs no dependency installation or credentials. The `PORT` environment variable controls the server port.

The live demo runs at `http://localhost:3000/working`. The server reads ignored `.env.local` for `OPENAI_API_KEY`, `DEMO_PASSWORD_HASH`, and `DEMO_SESSION_SECRET`, or uses the host environment. `.env.example` documents names only. The owner's configured local environment is excluded from version control. A production host must configure the same three server-side secrets.

## Deploy

GitHub Pages publishes `public/` on every `main` push. Its Working demo button navigates to the hosted server because GitHub Pages cannot execute secure API calls or enforce a server password. Opening the working HTML directly on Pages also forwards to that server.

`npm run build` prepares static assets. `npm run build:worker` embeds those exact assets and `backend/` in a small Worker and validates the deployment artifact. The tracked `.openai/hosting.json` retains the existing Sauce Site identity. Sites production hosts the full app and protected API. Both builds use the same source and require no dependencies. Environment files are excluded from both build artifacts.

The Dockerfile runs the same app on any host that supports Docker. The production server respects the host's `PORT` setting.

## Previous version

The complete earlier implementation is preserved on [archive/pre-demo-2026-10-10](https://github.com/parthag2211/Sauce/tree/archive/pre-demo-2026-10-10), at commit `d89ab99845fcc2279e47d8887f0ec6ab27652d9b`. Its history remains intact.

## Checks

```sh
npm run check
npm test
npm run build
npm run build:worker
```

The walkthrough was checked on desktop and mobile, including imports, criteria approval, evidence review, saved notes, interview limits, exports, and hiring outcomes. Live-demo tests cover password enforcement, forged cookies, same-origin checks, approval, allowed criteria, source parsing, ownership uncertainty, caching, rate limits, and source/API failures. Browser QA exercises the complete requested workflow and confirms that criterion changes update the recommendation.
