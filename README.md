# White Space Project

Local Next.js investment decision system for comparing business opportunities, importing ChatGPT research packages, reviewing evidence, and approving score changes.

## Run Locally

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000.

The app uses local SQLite at `data/local.db`. It does not call external AI APIs, does not run cloud jobs, and does not need GitHub to work.

## Research Import Workflow

1. Ask ChatGPT for a research package using the schema in `src/lib/research/schema.ts`.
2. Paste the answer or JSON into `/research/import`.
3. Click `Detect Research Package`, then `Validate`, then `Save to Research Inbox`.
4. Open `/research/inbox/[importId]` to drill into claims, sources, competitors, assumptions, risks, open questions, score changes, critical unknowns, kill criteria, coverage updates, next actions, decision logs, and report updates.
5. Accept, reject, or keep each item in review.
6. Approve score changes manually. Scores never update automatically from imported research.

Example files:

- `data/imports/examples/workshop-research-valid.json`
- `data/imports/examples/workshop-research-invalid.json`
- `data/imports/examples/workshop-research-v2-valid.json`

## What Persists

Approved data is stored in SQLite and appears across:

- `/markets/[slug]` for approved insights, evidence, pending report updates, score history, and timeline events.
- `/markets/[slug]/intelligence` for the navigable local intelligence graph.
- `/decisions` for the global decision log.
- `/investment-committee` for market ranking, filtering, and decision matrix review.
- `/sources` for verified source inventory and claim links.
- `/competitors` and `/competitors/[slug]` for reviewed competitors.
- `/settings/data` for JSON exports, backups, local reset, and clear-demo-data controls.

## KPI Scoring And Decision Score

Scoring is configured in `src/config/scoring.ts`.
Decision Score is configured in `src/config/decision.ts`.

The dashboard highlights:

- Color-coded total score bands.
- Top 5 businesses to pursue.
- Weighted category contributions.
- Approved score history after manual review.

Scoring framework version: `2.0`.

Weights:

- Competition / White Space: 25
- Market Fragmentation: 18
- Workflow Stickiness: 15
- Expansion Potential: 10
- Facebook / Messenger Dependence: 7
- Payment Flow Control: 7
- Market Size: 5
- Bypass Risk: 5
- Data Moat: 5
- Network Effects: 3

Decision Score formula:

```text
Total Market Score x 0.45
Research Confidence x 0.15
Research Completeness x 0.10
Customer Validation x 0.10
Competitor Coverage x 0.05
Execution Readiness x 0.05
Founder Fit x 0.10
- Critical Unknowns penalty up to 10
- Kill Criteria penalty up to 20
```

Decision Score is clamped from 0 to 100 and does not automatically change recommendations.

## Research Package 2.0

`src/lib/research/schema.ts` accepts both `importVersion: "1.0"` and `importVersion: "2.0"`.

Version 2.0 adds:

- `executiveSummary`
- `recommendation`
- `recommendationConfidence`
- `updatedScores`
- `supportingEvidence`
- `opposingEvidence`
- `criticalUnknowns`
- `killCriteria`
- `whyWeWin`
- `whyWeMayLose`
- `nextResearchActions`
- `coverageUpdates`
- `decisionLogEntries`
- `reportUpdates`

## Database Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:reset
```

`db:migrate` applies the checked-in SQL migration from `prisma/migrations`. This local helper is used because Prisma 7's migration engine failed on this Windows setup with a blank schema-engine error, while Prisma Client works correctly with the SQLite driver adapter.

## Do You Need Hosting, DB, or VPS?

For personal/local use: no. Keep it running with `npm run dev` while you use it. Data stays in `data/local.db` on this machine.

For always-on access from another device: yes, you need hosting. The simplest future path is a deployed Next.js app plus a hosted database such as Postgres. A VPS is optional, not required. Use a VPS only if you specifically want to manage the server yourself.

For non-stop automated research: this version intentionally does not do that. It is a manual, local review system where ChatGPT output is pasted in, validated, and approved by you.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```
