# AegisData — working prototype

AegisData is an accountability layer for regulated healthcare data. It closes the loop from
discovery to evidence: **Discover → Classify → Contextualize → Prioritize → Act → Prove**.

This repository holds the browser prototype for the TPM assignment (Part A). Seed data is
fictional. No connectors or scanning run; all state is in memory and mirrored to `localStorage`.

## Run

```bash
npm install
npm run dev
```

Open the printed URL (default `http://localhost:5180`). Use **Reset** in the top bar to
return to seed data.

## Deploy to Netlify (one command)

```bash
npm run deploy
```

This builds `dist/` and publishes it to production through the Netlify CLI. The first run asks you to
log in and to create or link a site. `npm run deploy:draft` publishes a preview URL instead.
`netlify.toml` sets the build command, the publish folder and the SPA redirect, so connecting the
Git repository in the Netlify UI also works with no extra configuration.

## P0 operational layer

Confirming a finding runs the Task Decision Engine (`src/decision.js`). One policy object per
priority drives priority, urgency, the four SLA clocks (acknowledge, initial containment,
resolution, verification), required action, evidence, approval, pause treatment, escalation chain
and the step-by-step procedure. Assignment proposes an owner; the store stays Unowned until
acceptance. Owners record actions and submit for independent verification; there is no
"mark complete". Failed verification reopens the task. Every event lands in an append-only task
timeline. Use the **Demo clock** buttons to advance time and trigger automatic escalation.

## What the prototype enforces

- **Persona-scoped navigation.** Six personas (ASR-A, POL, OWN, ANL, OPS, ASR-R). Only pages
  a persona may open are rendered. OPS never sees finding content.
- **Finding lifecycle.** Detected → Under Review → Confirmed → Remediation Required → Verified
  Closed. Confirming runs the policy engine, which creates the task and SLA.
- **Ownership lifecycle.** Unowned → Assigned → Accepted → Delegated. Accountability activates
  only on acceptance. Delegation never transfers it.
- **Task lifecycle.** Open → In Progress → Paused → Pending Verification → Verified Closed.
  Mark Complete never closes a task. A failed verification reopens it.
- **Separation of duties.** Requester ≠ Approver. Owner ≠ Classifier. Policy Author ≠ High-Risk
  Approver. Tier-2 exceptions need POL + ASR-A.
- **Connector lifecycle.** Registered → Active → Degraded → Active. Coverage gaps persist after
  recovery.
- **Evidence.** Append-only, SHA-256 hash-chained. "Verify chain integrity" recomputes every hash.

## Demo script

Open **Demo script** in the top bar. It walks one finding from detection to evidence across
all personas in 12 steps.

## Structure

- `src/data.js` — personas, navigation, seed data, rules, compliance map
- `src/store.js` — state, lifecycle transitions, policy engine, evidence chain
- `src/pages/*` — one file per surface
- `src/AegisData.jsx` — shell, persona switch, authorization guard
