import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  seedSources, seedFindings, seedTasks, seedExceptions, seedAudit, seedEvidence,
  BASE_TAXONOMY, BASE_RULES, OWNERS,
} from "./data.js";
import { decide, TASK_POLICIES, slaClocks } from "./decision.js";

const STORAGE_KEY = "aegisdata-demo-state-v4";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const nowLabel = (t) => {
  const d = t ? new Date(t) : new Date();
  return `Today ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const fmtTime = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`; };
const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const evidencePayload = (e, prevHash) =>
  JSON.stringify({ id: e.id, event: e.event, ts: e.ts, actor: e.actor, object: e.object, result: e.result, prevHash });

export const ownerName = (id) => OWNERS.find((o) => o.id === id)?.name || "Unassigned";
export const slaLabel = (r) => `${r.slaDays === 2 ? "48 hours" : `${r.slaDays} days`} (${r.priority})`;

// Policy engine: first matching rule wins, ordered by priority (P0 first).
export function evaluatePolicy(finding, rules) {
  const order = { P0: 0, P1: 1, P2: 2 };
  const matches = rules.filter((r) => {
    if (r.label !== finding.label) return false;
    if (r.exposures && !r.exposures.includes(finding.exposure)) return false;
    if (r.ownership && finding.ownership !== r.ownership) return false;
    return true;
  });
  return matches.sort((a, b) => order[a.priority] - order[b.priority])[0] || null;
}

const initialState = () => ({
  sources: seedSources(),
  findings: seedFindings(),
  tasks: seedTasks(),
  exceptions: seedExceptions(),
  taxonomy: BASE_TAXONOMY,
  taxonomyVersion: 1,
  rules: BASE_RULES,
  policyVersion: 1,
  auditLog: seedAudit(),
  evidence: seedEvidence(),
  clockOffset: 0,
});

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return initialState();
};

// ---------------------------------------------------------------------------
// Store hook
// ---------------------------------------------------------------------------
export function useAegisStore(persona) {
  const [s, setS] = useState(load);
  const [busy, setBusy] = useState({});
  const [tick, setTick] = useState(0);
  const chainLock = useRef(Promise.resolve());
  const escalatedRef = useRef(new Set()); // synchronous de-dupe for the escalation effect
  const sRef = useRef(s); sRef.current = s;
  useEffect(() => { for (const t of s.tasks) for (const e of t.escalations || []) escalatedRef.current.add(`${t.id}:${e.level}`); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);

  // Demo clock: real time plus an offset the presenter can advance.
  const now = () => Date.now() + (sRef.current.clockOffset || 0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(id); }, []);

  const actor = `${persona.user} (${persona.code})`;
  const patch = (fn) => setS((prev) => ({ ...prev, ...fn(prev) }));

  const logAudit = useCallback((action, object, kind = "finding", who) => {
    setS((prev) => ({ ...prev, auditLog: [{ id: uid("a"), ts: nowLabel(Date.now() + (prev.clockOffset || 0)), actor: who || actor, action, object, kind }, ...prev.auditLog] }));
  }, [actor]);

  // Evidence is append-only and hash-chained. Writes are serialized so prevHash is always the true head.
  const addEvidence = useCallback((event, object, result, who) => {
    chainLock.current = chainLock.current.then(async () => {
      const entry = { id: uid("ev"), event, ts: nowLabel(Date.now() + (sRef.current.clockOffset || 0)), actor: who || actor, object, result };
      let prevHash = "genesis";
      await new Promise((resolve) => setS((prev) => { prevHash = prev.evidence[0]?.hash || "genesis"; resolve(); return prev; }));
      const hash = await sha256(evidencePayload(entry, prevHash));
      setS((prev) => ({ ...prev, evidence: [{ ...entry, prevHash, hash }, ...prev.evidence] }));
    });
    return chainLock.current;
  }, [actor]);

  useEffect(() => {
    if (s.evidence.some((e) => !e.hash)) {
      (async () => {
        const oldestFirst = [...s.evidence].reverse();
        let prev = "genesis"; const out = [];
        for (const e of oldestFirst) { const hash = await sha256(evidencePayload(e, prev)); out.unshift({ ...e, prevHash: prev, hash }); prev = hash; }
        setS((p) => ({ ...p, evidence: out }));
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyChain = useCallback(async () => {
    const oldestFirst = [...s.evidence].reverse();
    let prev = "genesis";
    for (const e of oldestFirst) {
      const h = await sha256(evidencePayload(e, prev));
      if (h !== e.hash || e.prevHash !== prev) return { ok: false, at: e.id };
      prev = h;
    }
    return { ok: true, length: oldestFirst.length };
  }, [s.evidence]);

  const resetDemo = () => { localStorage.removeItem(STORAGE_KEY); setS(initialState()); };
  const advanceClock = (minutes) => { patch((p) => ({ clockOffset: (p.clockOffset || 0) + minutes * 60e3 })); logAudit(`Demo clock advanced ${minutes} min`, "prototype only", "system", "Demo control"); };

  // Task timeline is append-only. Every operational event lands here with actor and timestamp.
  const pushTimeline = (taskId, event, who) => {
    setS((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, timeline: [...(t.timeline || []), { at: Date.now() + (p.clockOffset || 0), actor: who || actor, event }] } : t)) }));
  };
  const setTask = (id, fn) => patch((p) => ({ tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...fn(t, p) } : t)) }));

  // ----- Decision engine access ------------------------------------------
  const decisionFor = (finding, priority) => decide(finding, s.sources.find((x) => x.id === finding?.sourceId), s.rules, evaluatePolicy, priority);

  // ----- Derived metrics -------------------------------------------------
  const derived = useMemo(() => {
    const relevant = s.findings.filter((f) => ["Remediation Required", "Verified Closed"].includes(f.state));
    const closed = relevant.filter((f) => f.state === "Verified Closed").length;
    const verifiedClosedRate = relevant.length ? Math.round((closed / relevant.length) * 100) : 0;
    const unownedRestricted = s.findings.filter((f) => f.label === "Restricted" && f.ownership !== "Accepted" && f.ownership !== "Delegated" && !["Rejected", "Verified Closed", "Superseded"].includes(f.state)).length;
    const scanned = s.sources.filter((x) => x.status !== "Not Yet Scanned");
    const avgCoverage = scanned.length ? Math.round(scanned.reduce((a, x) => a + x.coverage, 0) / scanned.length) : 0;
    const openGaps = s.sources.flatMap((x) => x.coverageGaps.filter((g) => !g.to)).length;
    const doneTasks = s.tasks.filter((t) => t.state === "Verified Closed").length;
    const failed = s.tasks.filter((t) => t.lastVerification?.result === "Failed").length;
    const slaAdherence = doneTasks ? Math.round((doneTasks / (doneTasks + failed)) * 100) : 0;
    const activeExceptions = s.exceptions.filter((e) => e.kind === "exception" && e.state === "Active").length;
    return { verifiedClosedRate, unownedRestricted, avgCoverage, openGaps, slaAdherence, activeExceptions };
  }, [s.findings, s.sources, s.tasks, s.exceptions]);

  // ----- Automatic escalation (runs on the tick) --------------------------
  useEffect(() => {
    const t0 = now();
    for (const task of sRef.current.tasks) {
      if (!task.createdAt || ["Verified Closed", "Cancelled"].includes(task.state)) continue;
      const policy = TASK_POLICIES[task.priority]; if (!policy) continue;
      const clocks = slaClocks(task, t0); if (!clocks) continue;
      const done = new Set((task.escalations || []).map((e) => e.level));
      for (const esc of policy.escalation) {
        if (done.has(esc.level)) continue;
        const c = clocks.find((x) => x.key === esc.trigger);
        if (c && c.status === "SLA Breached") {
          const key = `${task.id}:${esc.level}`;
          if (escalatedRef.current.has(key)) continue;
          escalatedRef.current.add(key);
          const f = sRef.current.findings.find((x) => x.id === task.findingId);
          const reason = `${task.priority} ${c.label.toLowerCase()} target (${Math.round(c.target / 60e3)} min) exceeded without ${esc.trigger === "ack" ? "acknowledgement" : "containment"}.`;
          setTask(task.id, (t) => ((t.escalations || []).some((e) => e.level === esc.level) ? {} : { escalations: [...(t.escalations || []), { level: esc.level, to: esc.to, label: esc.label, at: t0, reason }] }));
          pushTimeline(task.id, `Escalated (level ${esc.level}) to ${esc.label}: ${reason}`, "SLA Monitor");
          logAudit(`Automatic escalation level ${esc.level} → ${esc.to}`, `Task ${task.id} · ${f?.title || f?.dataType} · ${reason}`, "finding", "SLA Monitor");
          addEvidence(`Escalation level ${esc.level}`, `Task ${task.id}`, `→ ${esc.label}`, "SLA Monitor");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // ----- Finding lifecycle (ANL) -----------------------------------------
  const startReview = (id) => {
    patch((p) => ({ findings: p.findings.map((f) => (f.id === id ? { ...f, state: "Under Review", timeline: [...(f.timeline || []), { at: Date.now() + (p.clockOffset || 0), actor, event: "Review started" }] } : f)) }));
    logAudit("Started review", id);
  };

  // Confirm → Confirmed → decision engine → Remediation Required + task carrying the full Task Decision.
  const confirmFinding = (id) => {
    const f = s.findings.find((x) => x.id === id);
    if (!f) return;
    const d = decisionFor(f);
    patch((p) => ({ findings: p.findings.map((x) => (x.id === id ? { ...x, state: "Confirmed", adjudicatedBy: actor, dispute: null, timeline: [...(x.timeline || []), { at: Date.now() + (p.clockOffset || 0), actor, event: `Classification validated · ${x.label} confirmed by analyst` }] } : x)) }));
    logAudit("Confirmed finding", `${id} — ${f.dataType} · model ${f.modelVersion} · layers ${f.layers.join("→")}`);
    setTimeout(() => {
      if (!d.rule && d.priority === "P2") { logAudit("Policy evaluated — no obligation", `${id} remains Confirmed (monitored)`, "finding", "Policy Engine"); return; }
      const taskId = uid("t"); const t0 = now();
      const pol = d.policy;
      setS((p) => ({
        ...p,
        findings: p.findings.map((x) => (x.id === id ? { ...x, state: "Remediation Required", taskId, riskScore: d.risk.score } : x)),
        tasks: [{
          id: taskId, findingId: id, type: d.obligation === "Ownership assignment" ? "Ownership" : "Remediation", state: "Open",
          priority: d.priority, policyVersion: pol.version, sla: `${pol.slaLabels.resolution} ${Math.round(pol.sla.resolution / 3600e3)}h (${d.priority})`, due: `${Math.round(pol.sla.resolution / 3600e3)}h`,
          action: pol.action, createdAt: t0, willFail: false, actions: [], pauses: [], escalations: [],
          timeline: [...(f.timeline || []), { at: t0 - 1500, actor, event: `Classification validated · ${f.label} confirmed by analyst` }, { at: t0 - 1000, actor: "Policy & Risk Engine", event: `Risk assessed ${d.risk.score}/100 · ${d.risk.factors.map((x) => `${x.name} ${x.value}`).join(", ")}` }, { at: t0 - 500, actor: "Policy & Risk Engine", event: `Priority ${d.priority} (${pol.severity}, urgency ${pol.urgency}) · decision source ${d.source}` }, { at: t0, actor: "Task Decision Engine", event: `Task ${taskId} created · ${pol.action} · ack ≤${Math.round(pol.sla.ack / 60e3)} min · containment ≤${Math.round(pol.sla.containment / 60e3)} min · resolution ≤${Math.round(pol.sla.resolution / 3600e3)}h · approval: ${pol.approval}` }],
        }, ...p.tasks],
      }));
      logAudit(`Task Decision: ${d.priority} · ${pol.action}`, `${id} → Remediation Required · task ${taskId} · ${pol.policy} v${pol.version} · risk ${d.risk.score}/100`, "finding", "Task Decision Engine");
      addEvidence(`Priority decision ${d.priority}`, `Finding ${id} / Task ${taskId}`, `${pol.policy} v${pol.version} · risk ${d.risk.score}/100`, "Task Decision Engine");
    }, 900);
  };

  const rejectFinding = (id) => {
    patch((p) => ({
      findings: p.findings.map((f) => (f.id === id ? { ...f, state: "Rejected", adjudicatedBy: actor, dispute: null } : f)),
      tasks: p.tasks.map((t) => (t.findingId === id && !["Verified Closed", "Cancelled"].includes(t.state) ? { ...t, state: "Cancelled", cancelReason: "Finding rejected — obligation no longer valid" } : t)),
    }));
    logAudit("Rejected finding", `${id} — outcome recorded as labelled training data`);
  };

  const reclassifyFinding = (id, newLabel, reason) => {
    const f = s.findings.find((x) => x.id === id);
    if (!f || f.label === newLabel) return;
    patch((p) => ({ findings: p.findings.map((x) => (x.id === id ? { ...x, label: newLabel, previousLabel: f.label, reclassifiedBy: actor, dispute: null, state: x.state === "Remediation Required" ? "Under Review" : x.state } : x)) }));
    logAudit("Reclassified finding", `${id}: ${f.label} → ${newLabel} · reason: ${reason} · model ${f.modelVersion}`);
    addEvidence("Classification superseded", `Finding ${id}`, `${f.label} → ${newLabel}`);
  };
  const upholdClassification = (id) => {
    patch((p) => ({ findings: p.findings.map((x) => (x.id === id ? { ...x, dispute: { ...x.dispute, outcome: "Upheld" } } : x)) }));
    logAudit("Dispute reviewed — classification upheld", id);
  };

  // ----- Ownership lifecycle ---------------------------------------------
  // Assignment proposes an owner. The store stays Unowned until the owner accepts.
  const assignOwner = (findingId, { ownerId, reason, scope }) => {
    const f = s.findings.find((x) => x.id === findingId);
    patch((p) => ({ findings: p.findings.map((x) => (x.id === findingId ? { ...x, ownership: "Assigned", proposedOwnerId: ownerId, assignment: { by: actor, at: Date.now() + (p.clockOffset || 0), reason, scope, history: [...(x.assignment?.history || [])] } } : x)) }));
    if (f?.taskId) pushTimeline(f.taskId, `Owner proposed: ${ownerName(ownerId)} · reason: ${reason} · scope: ${scope} · awaiting acceptance`);
    logAudit("Assignment sent — awaiting acceptance (store remains Unowned)", `${findingId} → ${ownerName(ownerId)} · ${reason}`);
    addEvidence("Ownership proposed", `Finding ${findingId}`, `Proposed ${ownerName(ownerId)} · Awaiting Acceptance`);
  };
  const acceptOwnership = (findingId) => {
    const f = s.findings.find((x) => x.id === findingId);
    const t0 = now();
    patch((p) => ({
      findings: p.findings.map((x) => (x.id === findingId ? { ...x, ownership: "Accepted", ownerId: x.proposedOwnerId || persona.ownerId, proposedOwnerId: null, acceptedTs: nowLabel(t0) } : x)),
      tasks: p.tasks.map((t) => {
        if (t.findingId !== findingId) return t;
        if (t.type === "Ownership" && t.state !== "Verified Closed") return { ...t, state: "Verified Closed", closedBy: "Ownership accepted", acknowledgedAt: t.acknowledgedAt || t0 };
        return { ...t, acknowledgedAt: t.acknowledgedAt || t0, state: t.state === "Open" ? "In Progress" : t.state, startedAt: t.startedAt || t0 };
      }),
    }));
    if (f?.taskId) { pushTimeline(f.taskId, `Ownership accepted by ${persona.user} · accountability active · acknowledgement clock stopped`); pushTimeline(f.taskId, "Task started (In Progress)"); }
    logAudit("Accepted ownership — accountability active, SLA acknowledged", `${findingId} — ${f?.title || f?.dataType}`);
    addEvidence("Ownership accepted", `Finding ${findingId}`, `Accountable: ${persona.user}`);
  };
  const rejectAssignment = (findingId, reason) => {
    const f = s.findings.find((x) => x.id === findingId);
    patch((p) => ({ findings: p.findings.map((x) => (x.id === findingId ? { ...x, ownership: "Unowned", proposedOwnerId: null, assignment: { ...(x.assignment || {}), history: [...(x.assignment?.history || []), { proposed: ownerName(x.proposedOwnerId), rejectedBy: persona.user, reason, at: Date.now() + (p.clockOffset || 0) }] } } : x)) }));
    if (f?.taskId) pushTimeline(f.taskId, `Assignment rejected by ${persona.user}: ${reason} · store remains Unowned · returned to analyst for reassignment or escalation`);
    logAudit("Assignment rejected — store remains Unowned", `${findingId} · ${reason}`);
    addEvidence("Assignment rejected", `Finding ${findingId}`, reason);
  };
  const declineOwnership = rejectAssignment;
  const delegateTask = (findingId, delegateId) => {
    const f = s.findings.find((x) => x.id === findingId);
    patch((p) => ({ findings: p.findings.map((x) => (x.id === findingId ? { ...x, ownership: "Delegated", delegateId } : x)) }));
    if (f?.taskId) pushTimeline(f.taskId, `Execution delegated to ${ownerName(delegateId)} · ${persona.user} remains accountable`);
    logAudit("Delegated execution — accountability retained", `${findingId} → executes: ${ownerName(delegateId)} · accountable: ${persona.user}`);
  };
  const disputeClassification = (findingId, reason) => {
    const f = s.findings.find((x) => x.id === findingId);
    patch((p) => ({ findings: p.findings.map((x) => (x.id === findingId ? { ...x, dispute: { by: actor, reason, ts: nowLabel(), outcome: null } } : x)) }));
    if (f?.taskId) pushTimeline(f.taskId, `Classification disputed by owner: ${reason} · routed to analyst · task remains open`);
    logAudit("Disputed classification (no reclassification by owner)", `${findingId} · ${reason}`);
  };

  // ----- Task lifecycle (OWN) --------------------------------------------
  const startTask = (id) => { const t0 = now(); setTask(id, (t) => ({ state: "In Progress", startedAt: t.startedAt || t0, acknowledgedAt: t.acknowledgedAt || t0 })); pushTimeline(id, "Task started (In Progress)"); logAudit("Started work", `Task ${id}`); };

  const pauseTask = (id, { category, detail, nextAction, reviewDate }) => {
    const t0 = now();
    const task = s.tasks.find((t) => t.id === id); const pol = TASK_POLICIES[task?.priority];
    setTask(id, (t) => ({ state: "Paused", pauses: [...(t.pauses || []), { category, detail, nextAction, reviewDate, by: actor, at: t0, resumedAt: null, treatment: pol?.pauseTreatment }] }));
    pushTimeline(id, `Paused · ${category}${detail ? ` — ${detail}` : ""} · next action: ${nextAction} · review ${reviewDate} · SLA ${pol?.pauseTreatment === "pauses" ? "paused" : "continues"}`);
    logAudit(`Paused task (SLA ${pol?.pauseTreatment === "pauses" ? "paused" : "continues"} per ${pol?.policy} v${pol?.version})`, `Task ${id} · ${category} · review ${reviewDate}`);
    addEvidence("Task paused", `Task ${id}`, `${category} · SLA ${pol?.pauseTreatment}`);
  };
  const resumeTask = (id) => { const t0 = now(); setTask(id, (t) => ({ state: "In Progress", pauses: (t.pauses || []).map((p) => (p.resumedAt ? p : { ...p, resumedAt: t0 })) })); pushTimeline(id, "Resumed (In Progress)"); logAudit("Resumed task", `Task ${id}`); };

  // Owners record what they did. The first containment record stops the containment clock.
  const recordAction = (id, rec) => {
    const t0 = now();
    setTask(id, (t) => ({ actions: [...(t.actions || []), { ...rec, at: t0, actor }], containedAt: t.containedAt || (rec.containment ? t0 : null) }));
    pushTimeline(id, `${rec.containment ? "Containment completed: " : "Action recorded: "}${rec.action} · systems: ${rec.systems} · result: ${rec.result}${rec.evidence ? ` · evidence: ${rec.evidence}` : ""}`);
    logAudit(rec.containment ? "Containment action recorded" : "Remediation action recorded", `Task ${id} · ${rec.action} · ${rec.result}`);
    addEvidence(rec.containment ? "Containment recorded" : "Action recorded", `Task ${id}`, `${rec.action} · ${rec.evidence || "no attachment"}`);
  };

  // Submit for verification never closes. Attestation alone cannot close a task.
  const submitForVerification = (id) => {
    const t0 = now();
    setTask(id, () => ({ state: "Pending Verification", submittedAt: t0 }));
    pushTimeline(id, "Evidence submitted · independent verification required before closure");
    logAudit("Submitted for independent verification (not closed)", `Task ${id}`);
    addEvidence("Remediation submitted", `Task ${id}`, "Pending Verification");
  };
  const completeTask = submitForVerification;

  const runVerification = (id) => {
    setBusy((b) => ({ ...b, [id]: "verify" }));
    pushTimeline(id, "Verification scan started", "Verification Scanner");
    setTimeout(() => {
      const task = sRef.current.tasks.find((t) => t.id === id); if (!task) return;
      const t0 = now(); const pol = TASK_POLICIES[task.priority];
      if (!task.willFail) {
        setS((p) => ({
          ...p,
          tasks: p.tasks.map((t) => (t.id === id ? { ...t, state: "Verified Closed", verifiedAt: t0, closedTs: nowLabel(t0), lastVerification: { result: "Passed", at: t0, by: "Verification Scanner", detail: "Re-scan of the affected path found 0 of 0 sampled records reachable through the exposure path.", policyVersion: pol?.version } } : t)),
          findings: p.findings.map((f) => (f.id === task.findingId ? { ...f, state: "Verified Closed" } : f)),
        }));
        pushTimeline(id, `Verification passed · 0 exposed records · policy v${pol?.version}`, "Verification Scanner");
        pushTimeline(id, "Task closed (Verified Closed)", "Verification Scanner");
        logAudit("Verification scan passed", `Task ${id} → Verified Closed`, "finding", "Verification Scanner");
        addEvidence("Verification scan passed", `Task ${id} / Finding ${task.findingId}`, "Verified Closed", "Verification Scanner");
      } else {
        const detail = "Re-scan still detects 3 of 3 sampled records reachable through the exposure path. Containment did not take effect on the replica endpoint.";
        setS((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, state: "Verification Failed", lastVerification: { result: "Failed", at: t0, by: "Verification Scanner", detail, policyVersion: pol?.version } } : t)) }));
        pushTimeline(id, `Verification failed · ${detail}`, "Verification Scanner");
        logAudit("Verification scan failed", `Task ${id} → Verification Failed`, "finding", "Verification Scanner");
        addEvidence("Verification scan failed", `Task ${id} / Finding ${task.findingId}`, "Verification Failed", "Verification Scanner");
        // Failed verification reopens the task automatically. Resolution clock restarts from here.
        setTimeout(() => {
          setTask(id, () => ({ state: "In Progress", willFail: false, submittedAt: null, verifiedAt: null }));
          pushTimeline(id, "Reopened automatically → In Progress. Owner must continue remediation.", "SLA Monitor");
          logAudit("Reopened after failed verification → In Progress", `Task ${id}`, "finding", "SLA Monitor");
        }, 2500);
      }
      setBusy((b) => { const n = { ...b }; delete n[id]; return n; });
    }, 1400);
  };
  const reopenTask = (id) => { setTask(id, () => ({ state: "In Progress", willFail: false, submittedAt: null })); pushTimeline(id, "Reopened → In Progress"); logAudit("Reopened after failed verification → In Progress", `Task ${id}`); };

  // ----- Exceptions & approvals (SoD enforced) ---------------------------
  const requestException = (findingId, reason, days) => {
    const f = s.findings.find((x) => x.id === findingId);
    const src = s.sources.find((x) => x.id === f?.sourceId);
    const tier = f?.label === "Restricted" ? 2 : 1;
    const ex = { id: uid("e"), kind: "exception", scope: `${src?.name} — ${f?.dataType}`, findingId, requestedBy: { name: persona.user, code: persona.code }, tier, state: "Requested", reason, approvals: [], expiry: `In ${days} days`, created: nowLabel() };
    patch((p) => ({ exceptions: [ex, ...p.exceptions] }));
    if (f?.taskId) pushTimeline(f.taskId, `Tier-${tier} exception requested · ${days} days · ${reason}`);
    logAudit(`Requested Tier-${tier} exception`, `${ex.scope} · ${days} days`);
  };
  const canApprove = (ex) => {
    if (persona.readOnly) return { ok: false, why: "Read-only persona" };
    if (ex.state !== "Requested") return { ok: false, why: "Not awaiting approval" };
    if (ex.requestedBy?.name === persona.user) return { ok: false, why: "Requester ≠ Approver (separation of duties)" };
    if (ex.approvals.some((a) => a.code === persona.code)) return { ok: false, why: `${persona.code} already approved` };
    if (ex.kind === "policy") {
      if (ex.authoredBy === persona.user) return { ok: false, why: "Policy Author ≠ High-Risk Approver" };
      if (persona.code !== "ASR-A") return { ok: false, why: "High-risk policy requires ASR-A" };
      return { ok: true };
    }
    if (ex.tier === 1 && persona.code !== "POL") return { ok: false, why: "Tier-1 requires POL" };
    if (ex.tier === 2 && !["POL", "ASR-A"].includes(persona.code)) return { ok: false, why: "Tier-2 requires POL + ASR-A" };
    return { ok: true };
  };
  const approveException = (id) => {
    const ex = s.exceptions.find((e) => e.id === id); if (!ex) return;
    const c = canApprove(ex); if (!c.ok) { logAudit("Approval blocked", `${id} · ${c.why}`); return; }
    const approvals = [...ex.approvals, { by: persona.user, code: persona.code, ts: nowLabel() }];
    const required = ex.kind === "policy" ? ["ASR-A"] : ex.tier === 2 ? ["POL", "ASR-A"] : ["POL"];
    const complete = required.every((r) => approvals.some((a) => a.code === r));
    patch((p) => ({ exceptions: p.exceptions.map((e) => (e.id === id ? { ...e, approvals, state: complete ? "Approved" : "Requested" } : e)) }));
    logAudit(complete ? "Approved (all required approvals present)" : `Approved (${approvals.length} of ${required.length} approvals)`, `${ex.scope}`);
    if (complete && ex.kind === "policy") applyPolicy(ex.draftRules, ex.id);
    if (complete) addEvidence(ex.kind === "policy" ? "Policy approved" : `Tier-${ex.tier} exception approved`, ex.scope, `Approvers: ${approvals.map((a) => a.code).join(" + ")}`);
  };
  const activateException = (id) => { patch((p) => ({ exceptions: p.exceptions.map((e) => (e.id === id ? { ...e, state: "Active" } : e)) })); logAudit("Activated exception", id); };
  const revokeException = (id, reason) => {
    patch((p) => ({ exceptions: p.exceptions.map((e) => (e.id === id ? { ...e, state: "Revoked", revokeReason: reason } : e)) }));
    logAudit("Revoked exception", `${id} · ${reason}`); addEvidence("Exception revoked", id, reason);
  };

  // ----- Policy & taxonomy (POL) -----------------------------------------
  const addTaxonomy = (label, meaning, crosswalk) => {
    patch((p) => ({ taxonomy: [...p.taxonomy, { label, meaning: meaning || "Custom taxonomy — defined by tenant", handling: "Configurable", crosswalk: crosswalk || "—" }], taxonomyVersion: p.taxonomyVersion + 1 }));
    logAudit("Added custom taxonomy", `${label} · taxonomy v${s.taxonomyVersion + 1}`);
    addEvidence("Taxonomy version published", `Taxonomy v${s.taxonomyVersion + 1}`, `Added: ${label}`);
  };
  const simulatePolicy = (draftRules) => {
    const affected = []; let slaChanges = 0, newObligations = 0, invalidated = 0;
    for (const f of s.findings) {
      if (["Rejected", "Verified Closed", "Superseded"].includes(f.state)) continue;
      const before = evaluatePolicy(f, s.rules), after = evaluatePolicy(f, draftRules);
      if (!before && after) { newObligations++; affected.push({ f, before, after, change: "New obligation" }); }
      else if (before && after && (before.priority !== after.priority || before.slaDays !== after.slaDays)) { slaChanges++; affected.push({ f, before, after, change: "SLA / priority change" }); }
      else if (before && !after) affected.push({ f, before, after, change: "Obligation removed" });
      if (after?.priority === "P0" && s.exceptions.some((e) => e.kind === "exception" && e.findingId === f.id && e.state === "Active" && e.tier === 1)) invalidated++;
    }
    const stores = new Set(affected.map((a) => a.f.sourceId)).size;
    const highRisk = invalidated > 0 || affected.some((a) => a.after?.priority === "P0" || a.f.label === "Restricted" || (a.change === "Obligation removed" && a.before?.priority === "P0"));
    return { affected, slaChanges, newObligations, invalidated, stores, requiresSecondApproval: highRisk };
  };
  const applyPolicy = (draftRules, approvalId) => {
    setS((p) => {
      const version = p.policyVersion + 1;
      const tasks = p.tasks.map((t) => {
        const f = p.findings.find((x) => x.id === t.findingId);
        if (!f || t.state === "Verified Closed" || t.state === "Cancelled") return t;
        const r = evaluatePolicy(f, draftRules);
        if (!r || r.priority === t.priority) return t;
        const pol = TASK_POLICIES[r.priority];
        return { ...t, priority: r.priority, policyVersion: pol.version, sla: slaLabel(r), due: `In ${r.slaDays} days`, slaChangedBy: `policy v${version}` };
      });
      return { ...p, rules: draftRules, policyVersion: version, tasks };
    });
    logAudit("Policy published", `policy v${s.policyVersion + 1}${approvalId ? ` · approval ${approvalId}` : ""}`, "finding", "Policy Engine");
    addEvidence("Policy version published", `Policy v${s.policyVersion + 1}`, "Re-evaluated open findings and SLAs", "Policy Engine");
  };
  const publishPolicy = (draftRules, summary) => {
    const sim = simulatePolicy(draftRules);
    if (sim.requiresSecondApproval) {
      const req = { id: uid("pa"), kind: "policy", scope: `Policy change: ${summary}`, authoredBy: persona.user, requestedBy: { name: persona.user, code: persona.code }, tier: 2, state: "Requested", reason: `${sim.affected.length} findings affected · ${sim.stores} stores · ${sim.invalidated} exceptions invalidated`, approvals: [], draftRules, created: nowLabel(), expiry: "—" };
      patch((p) => ({ exceptions: [req, ...p.exceptions] }));
      logAudit("Policy change submitted for ASR-A approval", summary);
      return { queued: true };
    }
    applyPolicy(draftRules); return { queued: false };
  };

  // ----- DSAR ---------------------------------------------------------------
  const createErasureTask = (sourceId, identifierType, hashed) => {
    const src = s.sources.find((x) => x.id === sourceId);
    const fid = uid("f"), tid = uid("t"), t0 = now(); const owned = !!src?.ownerId;
    patch((p) => ({
      findings: [{ id: fid, sourceId, dataType: `DSAR erasure — ${identifierType} (hashed)`, identifierTypes: [identifierType], label: "Restricted", confidence: 100, exposure: "Limited", layers: ["EDM"], modelVersion: "edm-1.2", state: "Remediation Required", ownership: owned ? "Accepted" : "Unowned", ownerId: src?.ownerId || null, taskId: tid, plain: `Erase located instances of ${identifierType} ${hashed} in ${src?.name}.`, detectedTs: nowLabel(), dsar: true }, ...p.findings],
      tasks: [{ id: tid, findingId: fid, type: "Erasure", state: "Open", due: "In 30 days", sla: "30 days (DPDP)", priority: "P1", policyVersion: "1.1", createdAt: t0, acknowledgedAt: owned ? t0 : null, willFail: false, actions: [], pauses: [], escalations: [], action: `Erase or anonymize all located records matching ${identifierType} ${hashed}; verification re-scan must find zero matches.`, timeline: [{ at: t0, actor, event: `DSAR erasure task created for ${src?.name}` }] }, ...p.tasks],
    }));
    logAudit("DSAR erasure task created", `${src?.name} · ${identifierType} ${hashed}`);
    addEvidence("Data-principal request logged", `${src?.name} · ${identifierType}`, `Erasure task ${tid}`);
  };

  // ----- Connectors & scans (OPS) ----------------------------------------
  const setSource = (id, fn) => patch((p) => ({ sources: p.sources.map((x) => (x.id === id ? { ...x, ...fn(x) } : x)) }));
  const addSource = (src) => {
    patch((p) => ({ sources: [...p.sources, { ...src, id: uid("src"), criticality: "Standard", connectorState: "Registered", status: "Not Yet Scanned", scanMode: "—", lastScan: "Never", coverage: 0, agent: "v1.8.2", egress: "Metadata only", errorRate: 0, coverageGaps: [], history: [] }] }));
    logAudit("Registered data source", `${src.name} · ${src.type} · ${src.credential.broker} · TTL ${src.credential.ttl} min · ${src.credential.role}`, "system");
  };
  const runScan = (id, mode, throttle) => {
    const src = s.sources.find((x) => x.id === id); if (!src) return;
    setBusy((b) => ({ ...b, [id]: 0 }));
    setSource(id, () => ({ status: "Running", scanMode: mode }));
    let pct = 0;
    const tk = setInterval(() => {
      pct += 12 + Math.round(Math.random() * 10);
      if (pct < 100) { setBusy((b) => ({ ...b, [id]: pct })); return; }
      clearInterval(tk);
      const failed = src.connectorState === "Degraded";
      setSource(id, (x) => ({
        status: failed ? "Failed" : "Completed", connectorState: failed ? "Degraded" : "Active", lastScan: nowLabel(),
        coverage: failed ? x.coverage : Math.min(100, x.coverage + (mode === "Full" ? 15 : 6)), credentialTTL: failed ? 0 : 60,
        history: [{ ts: nowLabel(), mode, result: failed ? "Failed" : "Completed", objects: mode === "Full" ? 40000 + Math.round(Math.random() * 9000) : 1200 + Math.round(Math.random() * 900), throttle }, ...x.history],
      }));
      logAudit(failed ? "Scan failed — connector degraded" : `Scan completed (${mode}, ${throttle})`, src.name, "system", "Scanner");
      setBusy((b) => { const n = { ...b }; delete n[id]; return n; });
    }, 260);
  };
  const setSchedule = (id, schedule) => { setSource(id, () => ({ schedule })); logAudit("Changed scan schedule", `${id} → ${schedule}`, "system"); };
  const degradeConnector = (id) => {
    setSource(id, (x) => ({ connectorState: "Degraded", status: "Failed", credentialTTL: 0, errorRate: 42, coverageGaps: [{ id: uid("gap"), from: nowLabel(), to: null, reason: "Simulated: source unreachable (circuit breaker open)", affected: "All objects since gap start" }, ...x.coverageGaps] }));
    logAudit("Connector degraded — coverage gap opened", id, "system", "Connector Monitor");
  };
  const restoreConnector = (id) => {
    setSource(id, (x) => ({ connectorState: "Active", status: "Completed", credentialTTL: 60, errorRate: 0.2, agent: "v1.8.2", coverageGaps: x.coverageGaps.map((g) => (g.to ? g : { ...g, to: nowLabel() })) }));
    logAudit("Connector restored — historical gap retained", id, "system", "Connector Monitor");
    addEvidence("Coverage gap closed (record retained)", id, "Connector Active", "Connector Monitor");
  };
  const rotateCredential = (id) => { setSource(id, () => ({ credentialTTL: 60 })); logAudit("Rotated broker credential (short-lived, read-only)", id, "system"); };
  const exportEvidencePack = (scope) => { logAudit("Exported evidence pack", scope); addEvidence("Evidence pack exported", scope, "Integrity verified · watermarked"); };

  return {
    ...s, ...derived, busy, actor, now: now(), tick,
    decisionFor,
    actions: {
      resetDemo, advanceClock, verifyChain, exportEvidencePack,
      startReview, confirmFinding, rejectFinding, reclassifyFinding, upholdClassification,
      assignOwner, acceptOwnership, rejectAssignment, declineOwnership, delegateTask, disputeClassification,
      startTask, pauseTask, resumeTask, recordAction, submitForVerification, completeTask, runVerification, reopenTask,
      requestException, canApprove, approveException, activateException, revokeException,
      addTaxonomy, simulatePolicy, publishPolicy,
      createErasureTask,
      addSource, runScan, setSchedule, degradeConnector, restoreConnector, rotateCredential,
    },
  };
}
