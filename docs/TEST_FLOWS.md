# AegisData prototype — test flows by user flow

Each flow lists the persona, the preconditions, the steps, and the expected result of each step.
All data is seeded and fictional. Use **Reset** in the top bar to return to the seed state before a full run.
Use the **Demo clock** buttons (+5 min, +25 min) to advance every SLA clock without waiting.

Persona switching is in the top-right selector. The top bar always shows the acting user, persona code,
tenant, and the permission chips for that persona.

---

## 0. Setup and orientation

| Step | Action | Expected result |
|---|---|---|
| 0.1 | Open the app. | Lands on Executive Posture as ASR-A (Dr. Kavita Rao). Sidebar shows only ASR-A pages. |
| 0.2 | Click **Reset** and confirm. | All data returns to seed. Verified-Closed Rate reads 38%. |
| 0.3 | Click **Demo script**. | A 12-step panel opens at bottom right. |
| 0.4 | Reload the page. | State persists (localStorage). Reset clears it. |

---

## 1. ASR-A — Executive Posture (assurance view)

**Persona:** CISO / Security Director (ASR-A). **Precondition:** seed state.

| Step | Action | Expected result |
|---|---|---|
| 1.1 | Read the four metric cards. | Verified-Closed Rate 38%. Unowned Restricted Stores 3. Scan Coverage 78% with 1 open gap. Tier-2 approvals pending 1. |
| 1.2 | Read the panel "P0 findings, escalations, SLA breaches and verification failures". | Three rows. "MRN in HL7 segments" shows Awaiting Acceptance, **SLA Breached**, escalated to ANL and ASR-A, acknowledge clock negative. Each escalation target appears once. |
| 1.3 | Click **Open** on the HL7 row. | Read-only task detail opens. Four SLA clocks visible. Escalation panel shows Data Owner → Security Analyst → Security Director with both levels marked escalated. No action buttons. |
| 1.4 | Click **Back to list**. | Returns to Executive Posture. |
| 1.5 | Read Coverage, Control effectiveness, Exceptions panels. | Counts derive from live state. Connectors degraded = 1. |
| 1.6 | Read the heat map. | Claims SFTP row shows a Degraded badge and coverage 40% in red. |
| 1.7 | Read Tier-2 approval queue. | "Research Object Storage — Confidential" listed. Button reads **Approve as ASR-A**. Required: POL + ASR-A. |
| 1.8 | Click **Approve as ASR-A**. | Approvals show ASR-A. State stays Requested (1 of 2). |

---

## 2. OPS — Connector Health and scans

**Persona:** IT Admin / Discovery Operator (OPS).

| Step | Action | Expected result |
|---|---|---|
| 2.1 | Switch to OPS. | Sidebar shows only Connector Health & Scans and Administration. No finding content anywhere. |
| 2.2 | Read the metric cards. | Connectors active 8, Degraded 1, Credentials expiring <15 min 1, Open coverage gaps 1. |
| 2.3 | Read the Claims SFTP row. | Connector **Degraded**, status Failed, credential Expired, open gap "Credential expired — broker rotation failed". |
| 2.4 | Click **Restore connector** on Claims SFTP. | Connector becomes Active. Gap text changes to "1 historical gap retained". Coverage gap is not deleted. |
| 2.5 | Click the source name **Claims SFTP**. | Detail modal shows coverage gap history with From and To filled, and scan history with the Failed run. |
| 2.6 | Click **Run scan** on Cerner EMR. | Modal offers Incremental or Full and a throttle profile. |
| 2.7 | Choose Incremental, Normal throttle, **Start**. | Progress bar runs to 100%. Status Completed, last scan "Just now", coverage increases, history gains a row. |
| 2.8 | Change the Schedule dropdown on any row. | Value updates. Audit log (Administration) records the change. |
| 2.9 | Click **Simulate outage** on an Active connector. | Connector becomes Degraded. A new open gap appears. |
| 2.10 | Run a scan on the degraded connector. | Scan fails. History records Failed. Coverage unchanged. |
| 2.11 | Click **Rotate credential** on an Active row. | Credential TTL resets to 60 min. |
| 2.12 | Click **+ Register data source**. Step 1: name "Regional Lab Feed", type HL7/FHIR, owner blank. | Healthcare-native connector hint appears. Next enabled only after a name. |
| 2.13 | Step 2 Credentials. | Broker selector, auto-derived least-privilege role for the type, TTL field, "least-privilege check passed". |
| 2.14 | Step 3 Scope and schedule. | Scope selector, schedule, maintenance window. |
| 2.15 | Step 4 Review, click **Register source**. | New row appears with connector Registered, Not Yet Scanned, owner Unassigned. Audit records broker, TTL, role. |
| 2.16 | Open Administration. | Audit log shows only system and connector events. Note explains the boundary. |

---

## 3. ANL — Triage, Why P0, task creation

**Persona:** Security Engineer / Analyst (ANL). **Precondition:** seed state (Reset first).

| Step | Action | Expected result |
|---|---|---|
| 3.1 | Switch to ANL. | Lands on Triage Queue. Only Triage Queue in sidebar. |
| 3.2 | Read Review queue. | Three rows. First row is "Critical Regulated Data Exposure" (Claims SFTP), Restricted, External, Unowned, Detected, priority decision **P0 · risk 94 · Emergency**. |
| 3.3 | Click the finding name. | Row expands. **Why P0** panel: Data sensitivity Restricted 40/40, Exposure External 30/30, Business criticality Critical 15/15, Regulatory impact High 9/10, Classifier confidence 99% 0/0. Urgency Emergency. Decision P0 · Critical. Reason and P0 policy text. Decision source "Critical Exposure Policy v1.2 · rule r-1". Context shows store, criticality, access path, regulatory scope (PCI-DSS, DPDP, GDPR), classification layers and model, owner status Unowned, required action, SLA. |
| 3.4 | Read the **Task Decision** panel under it. | What action, who is accountable, who executes, how quickly (ack ≤10 min, containment ≤30 min, resolution ≤1 d, verification ≤2 h), what evidence (4 items), what approval ("None required. Containment is pre-authorized under P0 policy."), what if blocked (SLA continues), escalation chain. |
| 3.5 | Click **Start review**. | State becomes Under Review. Buttons change to Confirm classification / Reject. |
| 3.6 | Click **Confirm classification**. | State Confirmed for about one second, then Remediation Required. Finding moves to Ownership assignment. Assignment & escalation monitor gains a P0 row with acknowledge clock 10:00 counting down, containment 30:00, resolution 1 d, escalation On Track. |
| 3.7 | Open Administration as ASR-A later and check audit. | Entries: Confirmed finding (analyst, model, layers), Task Decision P0 (Task Decision Engine, policy v1.2, risk 94). Evidence Center has "Priority decision P0". |
| 3.8 | Back in ANL, confirm the P2 "Diagnosis codes" finding. | State Remediation Required with a P2 task (review policy v1.0) or Confirmed-monitored; priority decision column shows P2 · Normal. |
| 3.9 | Click **Reject** on a remaining Under Review row. | State Rejected. Row moves to All other findings with strikethrough badge. Any open task for it becomes Cancelled with reason "Finding rejected". |

### 3A. Assignment (propose owner)

| Step | Action | Expected result |
|---|---|---|
| 3A.1 | In Ownership assignment, click **Assign owner** on the P0 row. | Modal shows the compact Why P0 panel. Fields: Proposed owner (Priya Menon preselected), Reason for assignment, Scope (prefilled with store), Priority, SLA and Required action read-only from the decision. **Send assignment** disabled until a reason is typed. |
| 3A.2 | Type a reason and click **Send assignment**. | Confirmation reads "Assignment sent". Proposed Owner: Priya Menon. Accountability Status: **Awaiting Acceptance**. Store Status: **Unowned**. Acknowledgement SLA 10 min, escalates to Security Analyst on breach. |
| 3A.3 | Close and read the monitor row. | Accountability badge **Awaiting Acceptance**, "proposed Priya Menon". Unowned Restricted count on the dashboard has not decreased. |
| 3A.4 | Click **Monitor** on the row. | Read-only task detail. Accountability panel: Accountable owner "None yet", status Awaiting Acceptance, "Proposed: Priya Menon · store status Unowned". No owner action buttons. |

### 3B. Escalation via demo clock (from ANL monitor)

| Step | Action | Expected result |
|---|---|---|
| 3B.1 | Do not accept as OWN. In the monitor footer click **+5 min**. | P0 acknowledge clock shows about 04:xx and status **At Risk** (amber) once under 3 minutes remain. |
| 3B.2 | Click **+5 min** again. | Acknowledge clock negative, **SLA Breached**. Within one tick, escalation column shows **Escalated** with "→ ANL". Task timeline gains "Escalated (level 1) to Security Analyst". |
| 3B.3 | Click **+25 min**. | Containment clock breached. Escalation adds "→ ASR-A" (level 2). Each level appears exactly once. Evidence Center gains two escalation events. |
| 3B.4 | Open the task via **Monitor**. | Escalation panel: status SLA Breached, Data Owner → Security Analyst (escalated hh:mm:ss) → Security Director (escalated hh:mm:ss). |

### 3C. Dispute handling and reclassification

**Precondition:** an owner has disputed a classification (see 4F).

| Step | Action | Expected result |
|---|---|---|
| 3C.1 | Open Triage Queue. | Disputed finding ranks first with "Disputed by owner" and the owner's reason. Buttons Uphold / Reclassify. |
| 3C.2 | Click **Uphold**. | Dispute outcome Upheld. Task page badge "Dispute: Upheld". |
| 3C.3 | Or click **Reclassify**, choose a label, type a reason. | Label changes, "was <old label>" shown, finding returns to Under Review if it was in remediation. Evidence gains "Classification superseded". Reclassify disabled without a reason or with the same label. |

---

## 4. OWN — Acceptance and the P0 task

**Persona:** Data / Application Owner (OWN, Priya Menon). **Precondition:** 3A completed.

### 4A. Acceptance

| Step | Action | Expected result |
|---|---|---|
| 4A.1 | Switch to OWN. | Lands on My Tasks. Red card "P0 Critical finding requires your acceptance" at the top with acknowledge time remaining and status. A second seeded card exists for the HL7 task (already SLA Breached). |
| 4A.2 | Read the card. | Finding title, store, risk 94/100, required action. "Proposed owner: Priya Menon · Accountability status: Awaiting Acceptance · Store status: Unowned". |
| 4A.3 | Click the card. | Task detail opens. Acceptance panel shows Finding, Why P0, Affected data store (name, type, criticality), Required action, Current SLA, Time remaining (ack), Expected evidence, Escalation consequence. Buttons **Accept ownership** / **Reject assignment**. Four SLA clocks below with Acknowledge counting down. |
| 4A.4 | Click **Accept ownership**. | Task state In Progress. Acknowledge clock shows **Met** with time taken. Accountability panel: Accountable owner Priya Menon, Accepted, "Priya Menon remains accountable". Timeline gains "Ownership accepted … acknowledgement clock stopped" and "Task started". Evidence gains "Ownership accepted". Dashboard Unowned Restricted count decreases by one. |

### 4B. Rejection path (alternative to 4A.4)

| Step | Action | Expected result |
|---|---|---|
| 4B.1 | Click **Reject assignment**. | Modal requires a reason. Button disabled while empty. |
| 4B.2 | Enter a reason and confirm. | Finding returns to Unowned. Card disappears from My Tasks. Triage shows the finding back in Ownership assignment with assignment history "Priya Menon rejected by Priya Menon (reason)". Timeline and evidence record the rejection. Owner is not accountable. |

### 4C. Execution and action recording

| Step | Action | Expected result |
|---|---|---|
| 4C.1 | Read the task page. | Header: P0 badge, title, In Progress, Remediation, task id, policy v1.2. Panels: What happened (finding and access path), Why does it matter (regulatory scope), What must I do (7 numbered steps). |
| 4C.2 | Read Actions available. | Record action, Submit for verification (disabled with tooltip "Record at least one action with evidence first"), Pause task, Delegate execution, Dispute classification, Request exception. Amber hint: containment clock stops only when an action marked containment is recorded. There is no Mark Complete. |
| 4C.3 | Click **Record action**. | Modal: actor and time auto-filled note, fields Action performed, Systems affected, Result, Evidence attachment, Notes, checkbox "completes initial containment" (pre-checked for the first P0 action). Save disabled until action, systems and result are filled. |
| 4C.4 | Fill fields and save. | Recorded actions table gains a row with Containment badge. Initial containment clock shows **Met** with time taken. Resolution clock keeps running. Timeline "Containment completed: …". Evidence "Containment recorded". |
| 4C.5 | Record a second action with containment unchecked. | Row added without Containment badge. Containment clock unchanged. |

### 4D. Pause and resume

| Step | Action | Expected result |
|---|---|---|
| 4D.1 | Click **Pause task**. | Modal: Reason dropdown (Classification dispute, Dependency on another team, Required system change window, Approved operational constraint, Awaiting required information, Other), Blocker detail, Expected next action, Review date/time. Note: "SLA treatment under Critical Exposure Policy v1.2: **SLA continues**". Pause disabled until next action and review date are set. |
| 4D.2 | Fill and confirm. | State Paused. Clock header reads "Paused — clocks continue per policy". Resolution clock keeps counting. Pause history table shows paused time, by, reason, next action, review, SLA "Continues". Evidence "Task paused". |
| 4D.3 | Click **Resume**. | State In Progress. Pause history shows resumed time. |
| 4D.4 | Repeat on a P1 task (e.g., consent forms). | Note reads "SLA pauses". While paused, resolution clock stops. Pause history SLA "Paused". |

### 4E. Delegation

| Step | Action | Expected result |
|---|---|---|
| 4E.1 | Click **Delegate execution**, pick Arjun Nair, confirm. | Accountability panel: Accountable owner Priya Menon (Delegated badge), Task executor Arjun Nair, "Priya Menon remains accountable". Task list line reads "Accountable: Priya Menon · Executor: Arjun Nair". Timeline "Execution delegated … remains accountable". |

### 4F. Dispute and exception request

| Step | Action | Expected result |
|---|---|---|
| 4F.1 | Click **Dispute classification**, enter a reason. | Badge "Dispute open". Task stays In Progress with clocks running. Note states the owner cannot change the label. Finding appears first in ANL triage (see 3C). |
| 4F.2 | Click **Request exception**, enter justification and days. | Modal states Tier-2 (Restricted) needs POL + ASR-A and the requester cannot approve. Request appears in POL Approvals Inbox as Requested, Tier 2, requested by Priya Menon (OWN). |

### 4G. Submit and verification pass

| Step | Action | Expected result |
|---|---|---|
| 4G.1 | Click **Submit for verification**. | State Pending Verification. Amber note "Remediation submitted. Independent verification required before closure." Verification clock starts (2 h). Resolution clock shows Met with time taken. Owner action buttons removed except Run independent verification (simulate). |
| 4G.2 | Click **Run independent verification (simulate)**. | Button reads Verifying… for about 1.5 s. Then state **Verified Closed**. Green note with verification result, time, verifier "Verification Scanner", policy v1.2, remediation result. All four clocks Met. Timeline "Verification passed" and "Task closed". Evidence "Verification scan passed". Finding state Verified Closed. Dashboard Verified-Closed Rate increases. |

### 4H. Verification failure and automatic reopen

**Precondition:** seed task "Patient contact info" (FHIR API Gateway, P1) is Pending Verification and seeded to fail.

| Step | Action | Expected result |
|---|---|---|
| 4H.1 | Open the FHIR task from My Tasks. | State Pending Verification. Recorded actions already show one entry. |
| 4H.2 | Click **Run independent verification (simulate)**. | State Verification Failed for about 2.5 s, then **In Progress** automatically. Red note: "Verification failed at hh:mm:ss (Verification Scanner). Re-scan still detects 3 of 3 sampled records … The task returned to In Progress." Timeline shows failed and "Reopened automatically → In Progress". Evidence "Verification scan failed". Dashboard row shows "verification failed". |
| 4H.3 | Record an action and submit again, then verify. | Passes on the second attempt and closes. |

### 4I. Task list

| Step | Action | Expected result |
|---|---|---|
| 4I.1 | Return to My Tasks. | Only tasks where Priya is accountable, proposed, or delegated executor. Sorted P0 first, then by state. Each row shows priority, label, state, ownership badge, escalation status, and the next expiring clock. |
| 4I.2 | Switch to ANL and back. | Tasks for other owners (Arjun) never appear in Priya's list. |

---

## 5. POL — Approvals, policy, taxonomy, DSAR

**Persona:** Privacy Officer / DPO (POL, Sanjay Bhat).

### 5A. Approvals inbox and separation of duties

| Step | Action | Expected result |
|---|---|---|
| 5A.1 | Switch to POL. | Lands on Approvals Inbox. Inbox lists Requested items. |
| 5A.2 | Click **Approve as POL** on the Tier-2 research exception. | Approvals "Sanjay Bhat (POL)", required POL + ASR-A (1/2), state stays Requested. Button now disabled "POL already approved". |
| 5A.3 | Switch to ASR-A, Approvals Inbox, approve. | State Approved. Evidence "Tier-2 exception approved · Approvers: POL + ASR-A". |
| 5A.4 | As POL, click **Activate** on an Approved exception. | State Active. |
| 5A.5 | Click **Revoke** on an Active exception, enter a reason. | State Revoked with reason. Evidence "Exception revoked". |
| 5A.6 | Read the Expired row. | Text "New request required — no silent renewal". No renew button. |
| 5A.7 | Create an exception as OWN, then try to approve it as OWN. | OWN has no Approvals page. As POL the button is enabled; as the requester persona it is not possible. Try a request whose requester equals the acting user: button disabled "Requester ≠ Approver". |

### 5B. Policy simulation and publish

| Step | Action | Expected result |
|---|---|---|
| 5B.1 | Open Policies & Taxonomy. | Taxonomy v1 with four labels and crosswalk. Rules v1 with three rows. |
| 5B.2 | Click **Draft a change**, then **+ Add rule** (Confidential + Limited → Review P2 30 d). | Editable draft table with the new row. |
| 5B.3 | Click **Simulate against live estate**. | Cards: findings affected, new obligations, SLA/priority changes, exceptions invalidated, stores in blast radius, Second approval **Not required** (P2 change). Table lists each affected finding with before and after. |
| 5B.4 | Click **Publish policy**. | Green note "Published as policy v2". Rules table shows v2 with the new row. Evidence "Policy version published". |
| 5B.5 | Draft again: change rule r-2 (Confidential + Broad/External) to P0. Simulate. | Second approval **Required (ASR-A)**. Button reads **Submit for ASR-A approval**. |
| 5B.6 | Submit. | Amber note "Submitted… queued for ASR-A". Approvals Inbox shows "Policy change: …" with badge Policy change. As POL the approve button is disabled "Policy Author ≠ High-Risk Approver". |
| 5B.7 | Switch to ASR-A and approve. | Policy publishes automatically. Open task SLAs re-evaluated; affected task shows "(changed by policy v3)". |

### 5C. Taxonomy

| Step | Action | Expected result |
|---|---|---|
| 5C.1 | Enter label "Genomic Research Data", meaning, crosswalk, click **Add taxonomy**. | Row added with indigo badge. Header reads v2. Evidence "Taxonomy version published". Label available in the policy draft label dropdown. |

### 5D. Compliance and located-instance search (DSAR)

| Step | Action | Expected result |
|---|---|---|
| 5D.1 | Open Compliance & Reports. | Tabs: Regulatory mapping, DPO report, Auditor report, Located-instance search. Mapping status column populated live (open / in scope). |
| 5D.2 | DPO report tab. | Inventory by store, open vs closed by regulatory category, exception register. **Export DPO report (logged)** writes an evidence event. |
| 5D.3 | Located-instance search: type MRN, value "MRN-000123", **Locate**. | Lookup key shown as sha256 prefix. Five stores listed with classification, exposure, owner, coverage. |
| 5D.4 | Click **Create erasure task** on Cerner EMR. | Button becomes "Erasure task · Open". A new Restricted DSAR finding and a P1 Erasure task (30 days, DPDP) exist. As OWN Priya, the task appears in My Tasks with clocks. Evidence "Data-principal request logged". |

---

## 6. ASR-R — Evidence and reports (read-only)

**Persona:** External Auditor (ASR-R).

| Step | Action | Expected result |
|---|---|---|
| 6.1 | Switch to ASR-R. | Sidebar: Executive Posture, Compliance & Reports, Evidence Center. Top bar shows "read-only". |
| 6.2 | Executive Posture. | No approve buttons. Blue note explains read-only. |
| 6.3 | Evidence Center, click **Verify chain integrity**. | Green "Chain verified: N events, every hash recomputed and matched". Each row shows hash and previous hash; first is genesis. |
| 6.4 | Try to find edit or delete controls. | None exist. |
| 6.5 | Auditor report tab. | Coverage summary with gap table, control-effectiveness summary including "Tasks closed by attestation alone 0 (not possible by design)". Export button hidden for read-only. |

---

## 7. Administration

**Persona:** ASR-A or OPS.

| Step | Action | Expected result |
|---|---|---|
| 7.1 | Open Administration as ASR-A. | Users, personas and permission chips. Tenant configuration. Separation-of-duty list. Full audit log. |
| 7.2 | Open as OPS. | Audit log filtered to system events. Blue note explains. |

---

## 8. Cross-cutting checks

| Check | How | Expected result |
|---|---|---|
| Authorization guard | As OPS, use browser back or a stale page state to reach Triage. | Locked placeholder "This section is not available to the … persona". |
| No raw PHI | Inspect any finding, task, or DSAR screen. | Only metadata, labels, counts, hashes, access paths. |
| Append-only | Complete a P0 flow, then verify chain. | Chain verifies with all new events. |
| Persistence | Reload mid-flow. | State intact including clocks and timeline. |
| Reset | Click Reset. | Seed state; escalations reappear once each after the first tick. |

---

## 9. Acceptance-criteria trace (spec §18)

| # | Question | Where answered |
|---|---|---|
| 1 | Why P0? | Why P0 panel (triage expand, assign modal, acceptance card, task page) |
| 2 | Why urgent? | Urgency: Emergency badge, reason text, P0 policy line |
| 3 | What action? | Task Decision "What action?", header, procedure list |
| 4 | Who is accountable? | Accountability panel, task list line |
| 5 | Who executes? | Accountability panel "Task executor" |
| 6 | Accepted? | Ownership badge Awaiting Acceptance / Accepted, timeline event |
| 7 | Ack SLA | Acknowledge clock, 10 min target |
| 8 | Containment SLA | Initial containment clock, 30 min target, hint text |
| 9 | Resolution SLA | Resolution clock, 1 d target |
| 10 | If 30 min exceeded | Containment breached → level-2 escalation to Security Director |
| 11 | Who is escalated | Escalation panel chain and escalation column |
| 12 | Delegate without transfer | Delegate flow, Accountability panel wording |
| 13 | If blocked | Pause modal with reason, next action, review date |
| 14 | Does SLA pause | Pause modal SLA treatment line; P0 continues, P1/P2 pause |
| 15 | Evidence required | Task Decision "What evidence?", acceptance card |
| 16 | Who verifies | Verification Scanner, independent; Submit never closes |
| 17 | Verification fails | Red note, auto-reopen to In Progress |
| 18 | Evidence of sequence | Task Evidence timeline; Evidence Center chain |
| 19–23 | Persona capabilities | Permission chips in top bar; page notes; OPS boundary |
