import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  seedSources, seedFindings, seedTasks, seedExceptions, seedAudit, seedEvidence,
  BASE_TAXONOMY, BASE_RULES, OWNERS,
} from "./data.js";

const STORAGE_KEY = "aegisdata-demo-state-v3";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export const nowLabel = () => {
  const d = new Date();
  return `Today ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
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
  const [busy, setBusy] = useState({}); // { [id]: 'scan' | 'verify' | progress number }
  const chainLock = useRef(Promise.resolve());

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);

  const actor = `${persona.user} (${persona.code})`;
  const patch = (fn) => setS((prev) => ({ ...prev, ...fn(prev) }));

  const logAudit = useCallback((action, object, kind = "finding", who) => {
    setS((prev) => ({ ...prev, auditLog: [{ id: uid("a"), ts: nowLabel(), actor: who || actor, action, object, kind }, ...prev.auditLog] }));
  }, [actor]);

  // Evidence is append-only and hash-chained. Writes are serialized so prevHash is always the true head.
  const addEvidence = useCallback((event, object, result, who) => {
    chainLock.current = chainLock.current.then(async () => {
      const entry = { id: uid("ev"), event, ts: nowLabel(), actor: who || actor, object, result };
      let prevHash = "genesis";
      await new Promise((resolve) => setS((prev) => { prevHash = prev.evidence[0]?.hash || "genesis"; resolve(); return prev; }));
      const hash = await sha256(evidencePayload(entry, prevHash));
      setS((prev) => ({ ...prev, evidence: [{ ...entry, prevHash, hash }, ...prev.evidence] }));
    });
    return chainLock.current;
  }, [actor]);

  // Chain the seed evidence on first load (seed entries carry no hash).
  useEffect(() => {
    if (s.evidence.some((e) => !e.hash)) {
      (async () => {
        const oldestFirst = [...s.evidence].reverse();
        let prev = "genesis";
        const out = [];
        for (const e of oldestFirst) {
          const hash = await sha256(evidencePayload(e, prev));
          out.unshift({ ...e, prevHash: prev, hash });
          prev = hash;
        }
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
    const slaAdherence = doneTasks ? Math.round((doneTasks / (doneTasks + s.tasks.filter((t) => t.state === "Verification Failed").length)) * 100) : 0;
    const activeExceptions = s.exceptions.filter((e) => e.kind === "exception" && e.state === "Active").length;
    return { verifiedClosedRate, unownedRestricted, avgCoverage, openGaps, slaAdherence, activeExceptions };
  }, [s.findings, s.sources, s.tasks, s.exceptions]);

  // ----- Finding lifecycle (ANL) -----------------------------------------
  const startReview = (id) => {
    patch((p) => ({ findings: p.findings.map((f) => (f.id === id ? { ...f, state: "Under Review" } : f)) }));
    logAudit("Started review", id);
  };

  // Confirm → Confirmed → policy engine evaluates → Remediation Required + task, or stays Confirmed (monitored).
  const confirmFinding = (id) => {
    const f = s.findings.find((x) => x.id === id);
    if (!f) return;
    const rule = evaluatePolicy(f, s.rules);
    patch((p) => ({ findings: p.findings.map((x) => (x.id === id ? { ...x, state: "Confirmed", adjudicatedBy: actor, dispute: null } : x)) }));
    logAudit("Confirmed finding", `${id} — ${f.dataType} · model ${f.modelVersion} · layers ${f.layers.join("→")}`);
    setTimeout(() => {
      if (!rule) { logAudit("Policy evaluated — no obligation", `${id} remains Confirmed (monitored)`, "finding", "Policy Engine"); return; }
      const taskId = uid("t");
      setS((p) => ({
        ...p,
        findings: p.findings.map((x) => (x.id === id ? { ...x, state: "Remediation Required", taskId } : x)),
        tasks: [{ id: taskId, findingId: id, type: rule.obligation === "Ownership assignment" ? "Ownership" : "Remediation", state: "Open", due: `In ${rule.slaDays} days`, sla: slaLabel(rule), priority: rule.priority, willFail: false, action: rule.obligation === "Review" ? "Review exposure and restrict access to the minimum set of consumers." : "Restrict access and remove the exposure path; re-scan verifies." }, ...p.tasks],
      }));
      logAudit(`Policy rule matched: ${rule.label} + ${rule.exposures ? rule.exposures.join("/") : rule.ownership} → ${rule.obligation} ${rule.priority}`, `${id} → Remediation Required · task ${taskId} · policy v${s.policyVersion}`, "finding", "Policy Engine");
    }, 900);
  };

  const rejectFinding = (id) => {
    patch((p) => ({
      findings: p.findings.map((f) => (f.id === id ? { ...f, state: "Rejected", adjudicatedBy: actor, dispute: null } : f)),
      // A task whose obligation is no longer valid may be cancelled (Appendix A.3).
      tasks: p.tasks.map((t) => (t.findingId === id && !["Verified Closed", "Cancelled"].includes(t.state) ? { ...t, state: "Cancelled", cancelReason: "Finding rejected" } : t)),
    }));
    logAudit("Rejected finding", `${id} — outcome recorded as labelled training data`);
  };

  // Reclassify is attributable and supersedes the old record; only ANL may do this.
  const reclassifyFinding = (id, newLabel, reason) => {
    const f = s.findings.find((x) => x.id === id);
    if (!f || f.label === newLabel) return;
    patch((p) => ({
      findings: p.findings.map((x) => (x.id === id ? { ...x, label: newLabel, previousLabel: f.label, reclassifiedBy: actor, dispute: null, state: x.state === "Remediation Required" ? "Under Review" : x.state } : x)),
    }));
    logAudit("Reclassified finding", `${id}: ${f.label} → ${newLabel} · reason: ${reason} · model ${f.modelVersion}`);
    addEvidence("Classification superseded", `Finding ${id}`, `${f.label} → ${newLabel}`);
  };

  const upholdClassification = (id) => {
    patch((p) => ({ findings: p.findings.map((x) => (x.id === id ? { ...x, dispute: { ...x.dispute, outcome: "Upheld" } } : x)) }));
    logAudit("Dispute reviewed — classification upheld", id);
  };

  // ----- Ownership lifecycle ---------------------------------------------
  const assignOwner = (findingId, ownerId) => {
    patch((p) => ({ findings: p.findings.map((f) => (f.id === findingId ? { ...f, ownership: "Assigned", proposedOwnerId: ownerId } : f)) }));
    logAudit("Assigned owner (pending acceptance)", `${findingId} → ${ownerName(ownerId)}`);
  };
  const acceptOwnership = (findingId) => {
    const f = s.findings.find((x) => x.id === findingId);
    patch((p) => ({
      findings: p.findings.map((x) => (x.id === findingId ? { ...x, ownership: "Accepted", ownerId: x.proposedOwnerId || persona.ownerId, proposedOwnerId: null, acceptedTs: nowLabel() } : x)),
      tasks: p.tasks.map((t) => (t.findingId === findingId && t.type === "Ownership" && t.state !== "Verified Closed" ? { ...t, state: "Verified Closed", closedBy: "Ownership accepted" } : t)),
    }));
    logAudit("Accepted ownership — SLA activated", `${findingId} — ${f?.dataType}`);
    addEvidence("Ownership accepted", `Finding ${findingId}`, `Accountable: ${persona.user}`);
  };
  const declineOwnership = (findingId, reason) => {
    patch((p) => ({ findings: p.findings.map((x) => (x.id === findingId ? { ...x, ownership: "Unowned", proposedOwnerId: null } : x)) }));
    logAudit("Declined ownership — store remains Unowned", `${findingId} · ${reason}`);
  };
  const delegateTask = (findingId, delegateId) => {
    patch((p) => ({ findings: p.findings.map((x) => (x.id === findingId ? { ...x, ownership: "Delegated", delegateId } : x)) }));
    logAudit("Delegated execution — accountability retained", `${findingId} → executes: ${ownerName(delegateId)} · accountable: ${persona.user}`);
  };
  const disputeClassification = (findingId, reason) => {
    patch((p) => ({ findings: p.findings.map((x) => (x.id === findingId ? { ...x, dispute: { by: actor, reason, ts: nowLabel(), outcome: null } } : x)) }));
    logAudit("Disputed classification (no reclassification by owner)", `${findingId} · ${reason}`);
  };

  // ----- Task lifecycle (OWN) --------------------------------------------
  const setTask = (id, fn) => patch((p) => ({ tasks: p.tasks.map((t) => (t.id === id ? { ...t, ...fn(t) } : t)) }));
  const startTask = (id) => { setTask(id, () => ({ state: "In Progress" })); logAudit("Started work", `Task ${id}`); };
  const pauseTask = (id, reason, nextReview) => {
    setTask(id, () => ({ state: "Paused", pause: { reason, nextReview, by: actor, ts: nowLabel() } }));
    logAudit("Paused task (SLA retained for audit)", `Task ${id} · ${reason} · next review ${nextReview}`);
  };
  const resumeTask = (id) => { setTask(id, () => ({ state: "In Progress" })); logAudit("Resumed task", `Task ${id}`); };
  const completeTask = (id) => {
    // Mark Complete never closes a task. Attestation alone cannot close (Appendix A.3).
    setTask(id, () => ({ state: "Pending Verification" }));
    logAudit("Marked complete — pending independent verification", `Task ${id}`);
  };
  const runVerification = (id) => {
    setBusy((b) => ({ ...b, [id]: "verify" }));
    setTimeout(() => {
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return;
      if (!task.willFail) {
        setS((p) => ({
          ...p,
          tasks: p.tasks.map((t) => (t.id === id ? { ...t, state: "Verified Closed", closedTs: nowLabel() } : t)),
          findings: p.findings.map((f) => (f.id === task.findingId ? { ...f, state: "Verified Closed" } : f)),
        }));
        logAudit("Verification scan passed", `Task ${id} → Verified Closed`, "finding", "Verification Scanner");
        addEvidence("Verification scan passed", `Task ${id} / Finding ${task.findingId}`, "Verified Closed", "Verification Scanner");
      } else {
        setS((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, state: "Verification Failed", failReason: "Re-scan still detects 3 of 3 sampled records with the exposure path present." } : t)) }));
        logAudit("Verification scan failed", `Task ${id} → Verification Failed`, "finding", "Verification Scanner");
        addEvidence("Verification scan failed", `Task ${id} / Finding ${task.findingId}`, "Verification Failed", "Verification Scanner");
      }
      setBusy((b) => { const n = { ...b }; delete n[id]; return n; });
    }, 1400);
  };
  const reopenTask = (id) => { setTask(id, () => ({ state: "In Progress", willFail: false })); logAudit("Reopened after failed verification → In Progress", `Task ${id}`); };

  // ----- Exceptions & approvals (SoD enforced) ---------------------------
  const requestException = (findingId, reason, days) => {
    const f = s.findings.find((x) => x.id === findingId);
    const src = s.sources.find((x) => x.id === f?.sourceId);
    const tier = f?.label === "Restricted" ? 2 : 1;
    const ex = { id: uid("e"), kind: "exception", scope: `${src?.name} — ${f?.dataType}`, findingId, requestedBy: { name: persona.user, code: persona.code }, tier, state: "Requested", reason, approvals: [], expiry: `In ${days} days`, created: nowLabel() };
    patch((p) => ({ exceptions: [ex, ...p.exceptions] }));
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
    const ex = s.exceptions.find((e) => e.id === id);
    if (!ex) return;
    const c = canApprove(ex);
    if (!c.ok) { logAudit("Approval blocked", `${id} · ${c.why}`); return; }
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
    logAudit("Revoked exception", `${id} · ${reason}`);
    addEvidence("Exception revoked", id, reason);
  };

  // ----- Policy & taxonomy (POL) -----------------------------------------
  const addTaxonomy = (label, meaning, crosswalk) => {
    patch((p) => ({ taxonomy: [...p.taxonomy, { label, meaning: meaning || "Custom taxonomy — defined by tenant", handling: "Configurable", crosswalk: crosswalk || "—" }], taxonomyVersion: p.taxonomyVersion + 1 }));
    logAudit("Added custom taxonomy", `${label} · taxonomy v${s.taxonomyVersion + 1}`);
    addEvidence("Taxonomy version published", `Taxonomy v${s.taxonomyVersion + 1}`, `Added: ${label}`);
  };

  // Simulation: what would change if draftRules replaced the published rules.
  const simulatePolicy = (draftRules) => {
    const affected = [];
    let slaChanges = 0, newObligations = 0, invalidated = 0;
    for (const f of s.findings) {
      if (["Rejected", "Verified Closed", "Superseded"].includes(f.state)) continue;
      const before = evaluatePolicy(f, s.rules);
      const after = evaluatePolicy(f, draftRules);
      if (!before && after) { newObligations++; affected.push({ f, before, after, change: "New obligation" }); }
      else if (before && after && (before.priority !== after.priority || before.slaDays !== after.slaDays)) { slaChanges++; affected.push({ f, before, after, change: "SLA / priority change" }); }
      else if (before && !after) affected.push({ f, before, after, change: "Obligation removed" });
      if (after?.priority === "P0" && s.exceptions.some((e) => e.kind === "exception" && e.findingId === f.id && e.state === "Active" && e.tier === 1)) invalidated++;
    }
    const stores = new Set(affected.map((a) => a.f.sourceId)).size;
    // High-risk = the change itself creates P0 obligations, touches Restricted data, or invalidates exceptions.
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
        if (!r || (r.priority === t.priority && slaLabel(r) === t.sla)) return t;
        return { ...t, priority: r.priority, sla: slaLabel(r), due: `In ${r.slaDays} days`, slaChangedBy: `policy v${version}` };
      });
      return { ...p, rules: draftRules, policyVersion: version, tasks };
    });
    logAudit("Policy published", `policy v${s.policyVersion + 1}${approvalId ? ` · approval ${approvalId}` : ""}`, "finding", "Policy Engine");
    addEvidence("Policy version published", `Policy v${s.policyVersion + 1}`, "Re-evaluated open findings and SLAs", "Policy Engine");
  };

  // Publish: high-risk changes require ASR-A approval (Policy Author ≠ High-Risk Approver).
  const publishPolicy = (draftRules, summary) => {
    const sim = simulatePolicy(draftRules);
    if (sim.requiresSecondApproval) {
      const req = { id: uid("pa"), kind: "policy", scope: `Policy change: ${summary}`, authoredBy: persona.user, requestedBy: { name: persona.user, code: persona.code }, tier: 2, state: "Requested", reason: `${sim.affected.length} findings affected · ${sim.stores} stores · ${sim.invalidated} exceptions invalidated`, approvals: [], draftRules, created: nowLabel(), expiry: "—" };
      patch((p) => ({ exceptions: [req, ...p.exceptions] }));
      logAudit("Policy change submitted for ASR-A approval", summary);
      return { queued: true };
    }
    applyPolicy(draftRules);
    return { queued: false };
  };

  // ----- DSAR / located-instance search ----------------------------------
  const createErasureTask = (sourceId, identifierType, hashed) => {
    const src = s.sources.find((x) => x.id === sourceId);
    const fid = uid("f"), tid = uid("t");
    const owned = !!src?.ownerId;
    patch((p) => ({
      findings: [{ id: fid, sourceId, dataType: `DSAR erasure — ${identifierType} (hashed)`, identifierTypes: [identifierType], label: "Restricted", confidence: 100, exposure: "Limited", layers: ["EDM"], modelVersion: "edm-1.2", state: "Remediation Required", ownership: owned ? "Accepted" : "Unowned", ownerId: src?.ownerId || null, taskId: tid, plain: `Erase located instances of ${identifierType} ${hashed} in ${src?.name}.`, detectedTs: nowLabel(), dsar: true }, ...p.findings],
      tasks: [{ id: tid, findingId: fid, type: "Erasure", state: "Open", due: "In 30 days", sla: "30 days (DPDP)", priority: "P1", willFail: false, action: `Erase or anonymize all located records matching ${identifierType} ${hashed}; verification re-scan must find zero matches.` }, ...p.tasks],
    }));
    logAudit("DSAR erasure task created", `${src?.name} · ${identifierType} ${hashed}`);
    addEvidence("Data-principal request logged", `${src?.name} · ${identifierType}`, `Erasure task ${tid}`);
  };

  // ----- Connectors & scans (OPS) ----------------------------------------
  const setSource = (id, fn) => patch((p) => ({ sources: p.sources.map((x) => (x.id === id ? { ...x, ...fn(x) } : x)) }));
  const addSource = (src) => {
    patch((p) => ({ sources: [...p.sources, { ...src, id: uid("src"), connectorState: "Registered", status: "Not Yet Scanned", scanMode: "—", lastScan: "Never", coverage: 0, agent: "v1.8.2", egress: "Metadata only", errorRate: 0, coverageGaps: [], history: [] }] }));
    logAudit("Registered data source", `${src.name} · ${src.type} · ${src.credential.broker} · TTL ${src.credential.ttl} min · ${src.credential.role}`, "system");
  };
  const runScan = (id, mode, throttle) => {
    const src = s.sources.find((x) => x.id === id);
    if (!src) return;
    setBusy((b) => ({ ...b, [id]: 0 }));
    setSource(id, () => ({ status: "Running", scanMode: mode }));
    let pct = 0;
    const tick = setInterval(() => {
      pct += 12 + Math.round(Math.random() * 10);
      if (pct < 100) { setBusy((b) => ({ ...b, [id]: pct })); return; }
      clearInterval(tick);
      const failed = src.connectorState === "Degraded";
      setSource(id, (x) => ({
        status: failed ? "Failed" : "Completed",
        connectorState: failed ? "Degraded" : "Active",
        lastScan: nowLabel(),
        coverage: failed ? x.coverage : Math.min(100, x.coverage + (mode === "Full" ? 15 : 6)),
        credentialTTL: failed ? 0 : 60,
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
  // Restoring a connector closes the gap but never deletes it (Appendix A.3).
  const restoreConnector = (id) => {
    setSource(id, (x) => ({ connectorState: "Active", status: "Completed", credentialTTL: 60, errorRate: 0.2, agent: "v1.8.2", coverageGaps: x.coverageGaps.map((g) => (g.to ? g : { ...g, to: nowLabel() })) }));
    logAudit("Connector restored — historical gap retained", id, "system", "Connector Monitor");
    addEvidence("Coverage gap closed (record retained)", id, "Connector Active", "Connector Monitor");
  };
  const rotateCredential = (id) => { setSource(id, () => ({ credentialTTL: 60 })); logAudit("Rotated broker credential (short-lived, read-only)", id, "system"); };

  const exportEvidencePack = (scope) => {
    logAudit("Exported evidence pack", scope);
    addEvidence("Evidence pack exported", scope, "Integrity verified · watermarked");
  };

  return {
    ...s, ...derived, busy, actor,
    actions: {
      resetDemo, verifyChain, exportEvidencePack,
      startReview, confirmFinding, rejectFinding, reclassifyFinding, upholdClassification,
      assignOwner, acceptOwnership, declineOwnership, delegateTask, disputeClassification,
      startTask, pauseTask, resumeTask, completeTask, runVerification, reopenTask,
      requestException, canApprove, approveException, activateException, revokeException,
      addTaxonomy, simulatePolicy, publishPolicy,
      createErasureTask,
      addSource, runScan, setSchedule, degradeConnector, restoreConnector, rotateCredential,
    },
  };
}
