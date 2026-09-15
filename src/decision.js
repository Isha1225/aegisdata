// ---------------------------------------------------------------------------
// Task Decision Engine.
// One policy object per priority drives priority, urgency, SLA clocks, required
// action, evidence, approval, pause treatment, escalation chain and procedure.
// The UI derives everything from `decide()`; nothing is a standalone label.
// ---------------------------------------------------------------------------

const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

export const TASK_POLICIES = {
  P0: {
    priority: "P0", severity: "Critical", urgency: "Emergency",
    policy: "Critical Exposure Policy", version: "1.2",
    rule: "Immediate human intervention required. Automated closure is not permitted.",
    reason: "Immediate action is required because delaying containment may materially increase risk.",
    action: "Immediate containment followed by remediation",
    accountable: "Data Owner (accountability activates on acceptance)",
    executor: "Data Owner or delegated operator",
    sla: { ack: 10 * MIN, containment: 30 * MIN, resolution: 24 * HOUR, verification: 2 * HOUR },
    slaLabels: { ack: "Acknowledge", containment: "Initial containment", resolution: "Resolution", verification: "Verification" },
    evidence: ["Action record (who, what, when)", "Configuration / change evidence", "Access-control evidence (before and after)", "Independent verification result"],
    approval: "None required. Containment is pre-authorized under P0 policy.",
    pauseTreatment: "continues",
    pauseNote: "P0 SLA clocks continue during a pause. A documented blocker, expected next action and review date are mandatory.",
    escalation: [{ level: 1, to: "ANL", label: "Security Analyst", trigger: "ack" }, { level: 2, to: "ASR-A", label: "Security Director / Assurance Approver", trigger: "containment" }],
    procedure: [
      "Review the affected access path in the access graph (who and what can reach the store).",
      "Confirm the exposure against the classification evidence. Do not open raw records.",
      "Apply containment: revoke or restrict the exposing grant, share or endpoint scope.",
      "Validate that access is restricted (re-check the access path, test as a non-privileged principal).",
      "Record the action taken: systems changed, result, time.",
      "Attach evidence: change record and access-control state before and after.",
      "Submit for independent verification. Do not attest closure yourself.",
    ],
  },
  P1: {
    priority: "P1", severity: "High", urgency: "High",
    policy: "Elevated Exposure Policy", version: "1.1",
    rule: "Human review required within the acknowledgement window. Remediation follows the standard change process.",
    reason: "Sensitive data is exposed beyond its intended audience, but no external or unauthenticated path is present.",
    action: "Review exposure and restrict access to the minimum set of consumers",
    accountable: "Data Owner (accountability activates on acceptance)",
    executor: "Data Owner or delegated operator",
    sla: { ack: 4 * HOUR, containment: 24 * HOUR, resolution: 14 * DAY, verification: 48 * HOUR },
    slaLabels: { ack: "Acknowledge", containment: "Initial action", resolution: "Resolution", verification: "Verification" },
    evidence: ["Action record", "Access-control evidence", "Independent verification result"],
    approval: "None required for access restriction. Data movement or deletion requires POL approval.",
    pauseTreatment: "pauses",
    pauseNote: "P1 SLA clocks pause while a documented blocker is open. The original SLA and pause duration are retained for audit.",
    escalation: [{ level: 1, to: "ANL", label: "Security Analyst", trigger: "ack" }, { level: 2, to: "ASR-A", label: "Security Director / Assurance Approver", trigger: "containment" }],
    procedure: [
      "Review who currently has access and why.",
      "Confirm the intended audience with the business owner.",
      "Restrict access to the minimum set of consumers.",
      "Validate the change.",
      "Record the action and attach evidence.",
      "Submit for independent verification.",
    ],
  },
  P2: {
    priority: "P2", severity: "Moderate", urgency: "Normal",
    policy: "Standard Review Policy", version: "1.0",
    rule: "Scheduled review within the standard cycle.",
    reason: "Limited exposure of lower-sensitivity data. Monitor and review within the standard cycle.",
    action: "Review and document the exposure decision",
    accountable: "Data Owner (accountability activates on acceptance)",
    executor: "Data Owner",
    sla: { ack: 2 * DAY, containment: 7 * DAY, resolution: 30 * DAY, verification: 7 * DAY },
    slaLabels: { ack: "Acknowledge", containment: "Initial action", resolution: "Resolution", verification: "Verification" },
    evidence: ["Review record", "Independent verification result"],
    approval: "None required.",
    pauseTreatment: "pauses",
    pauseNote: "P2 SLA clocks pause while a documented blocker is open.",
    escalation: [{ level: 1, to: "ANL", label: "Security Analyst", trigger: "containment" }],
    procedure: ["Review the exposure.", "Document the decision.", "Submit for verification."],
  },
};

export const PAUSE_REASONS = ["Classification dispute", "Dependency on another team", "Required system change window", "Approved operational constraint", "Awaiting required information", "Other"];

const SENSITIVITY = { Restricted: 40, Confidential: 25, Internal: 10, Public: 0 };
const EXPOSURE = { External: 30, Broad: 22, Limited: 10, None: 0 };
const CRITICALITY = { Critical: 15, High: 10, Standard: 5 };

export function regulatoryScope(finding) {
  const s = [];
  if (finding.identifierTypes?.includes("Card PAN")) s.push("PCI-DSS Req. 3, 7, 10");
  if (finding.identifierTypes?.includes("MRN")) s.push("HIPAA Security Rule 45 CFR §164.308–312");
  if (finding.label === "Restricted") s.push("DPDP Act 2023 (sensitive personal data)", "GDPR Art. 9 / Art. 32");
  else if (finding.label === "Confidential") s.push("DPDP Act 2023 (personal data)", "GDPR Art. 32");
  return s.length ? s : ["No regulatory scope identified"];
}

export function assessRisk(finding, source) {
  const crit = source?.criticality || "Standard";
  const reg = finding.identifierTypes?.includes("Card PAN") || finding.label === "Restricted" ? 9 : finding.label === "Confidential" ? 5 : 1;
  const factors = [
    { name: "Data sensitivity", value: finding.label, points: SENSITIVITY[finding.label] ?? 0, max: 40 },
    { name: "Exposure", value: finding.exposure, points: EXPOSURE[finding.exposure] ?? 0, max: 30 },
    { name: "Business criticality", value: crit, points: CRITICALITY[crit], max: 15 },
    { name: "Regulatory impact", value: reg >= 9 ? "High" : reg >= 5 ? "Medium" : "Low", points: reg, max: 10 },
    { name: "Classifier confidence", value: `${finding.confidence}%`, points: finding.confidence >= 90 ? 0 : -5, max: 0 },
  ];
  const score = Math.max(0, Math.min(100, factors.reduce((a, f) => a + f.points, 0)));
  return { score, factors };
}

// Priority comes from the published policy rule when one matches; otherwise from the risk score.
export function decide(finding, source, rules, evaluatePolicy, forcePriority) {
  const risk = assessRisk(finding, source);
  const rule = evaluatePolicy ? evaluatePolicy(finding, rules) : null;
  const priority = forcePriority || rule?.priority || (risk.score >= 85 ? "P0" : risk.score >= 60 ? "P1" : "P2");
  const policy = TASK_POLICIES[priority];
  return {
    priority, policy, risk, rule,
    obligation: rule?.obligation || (priority === "P0" ? "Remediation" : "Review"),
    source: forcePriority && rule?.priority !== forcePriority ? `${policy.policy} v${policy.version} · decided at task creation` : rule ? `${policy.policy} v${policy.version} · rule ${rule.id} (${rule.label} + ${rule.exposures ? rule.exposures.join("/") : rule.ownership})` : `${policy.policy} v${policy.version} · risk-score threshold`,
    regulatory: regulatoryScope(finding),
  };
}

// ----- SLA clocks -----------------------------------------------------------
export const fmtDuration = (ms) => {
  const neg = ms < 0; ms = Math.abs(ms);
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60), d = Math.floor(h / 24);
  const out = d >= 1 ? `${d}d ${h % 24}h` : h >= 1 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return (neg ? "−" : "") + out;
};

export function pausedMs(task, now) {
  return (task.pauses || []).reduce((a, p) => a + ((p.resumedAt || now) - p.at), 0);
}

// Returns the four clocks with status: On Track | At Risk | SLA Breached | Met | Not started
export function slaClocks(task, now) {
  const policy = TASK_POLICIES[task.priority];
  if (!policy || !task.createdAt) return null;
  const paused = policy.pauseTreatment === "pauses" ? pausedMs(task, now) : 0;
  const clock = (key, start, end) => {
    const target = policy.sla[key];
    if (!start) return { key, label: policy.slaLabels[key], target, status: "Not started" };
    if (end) { const took = end - start; return { key, label: policy.slaLabels[key], target, took, status: took <= target ? "Met" : "Missed" }; }
    const elapsed = now - start - (key === "ack" ? 0 : paused);
    const remaining = target - elapsed;
    const status = remaining < 0 ? "SLA Breached" : remaining < target * 0.3 ? "At Risk" : "On Track";
    return { key, label: policy.slaLabels[key], target, elapsed, remaining, status, pct: Math.min(100, Math.round((elapsed / target) * 100)) };
  };
  return [
    clock("ack", task.createdAt, task.acknowledgedAt),
    clock("containment", task.acknowledgedAt || task.createdAt, task.containedAt),
    clock("resolution", task.acknowledgedAt || task.createdAt, task.submittedAt),
    clock("verification", task.submittedAt, task.verifiedAt),
  ];
}

export function escalationStatus(task, now) {
  const clocks = slaClocks(task, now);
  if (!clocks) return { status: "On Track", reason: "" };
  if ((task.escalations || []).length) { const last = task.escalations[task.escalations.length - 1]; const breached = clocks.some((c) => c.status === "SLA Breached"); return { status: breached ? "SLA Breached" : "Escalated", reason: last.reason }; }
  const breached = clocks.find((c) => c.status === "SLA Breached");
  if (breached) return { status: "SLA Breached", reason: `${breached.label} target exceeded by ${fmtDuration(-breached.remaining)}.` };
  const risk = clocks.find((c) => c.status === "At Risk");
  if (risk) return { status: "At Risk", reason: `${task.priority} ${breached ? "" : risk.label.toLowerCase()} threshold approaching (${fmtDuration(risk.remaining)} left).` };
  return { status: "On Track", reason: "All active SLA clocks within target." };
}
