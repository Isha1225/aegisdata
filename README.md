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
