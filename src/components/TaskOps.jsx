import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, Users, FileText, ArrowUpRight } from "lucide-react";
import { Panel, Badge, Button, Modal, Field, inputCls, Note, Th } from "../ui.jsx";
import { STATE_TONE, LABEL_TONE, PRIORITY_TONE, OWNERS } from "../data.js";
import { TASK_POLICIES, PAUSE_REASONS, slaClocks, escalationStatus, fmtDuration } from "../decision.js";
import { ownerName, fmtTime } from "../store.js";

const ESC_TONE = { "On Track": "bg-emerald-50 text-emerald-700", "At Risk": "bg-amber-50 text-amber-800", "Escalated": "bg-orange-50 text-orange-800", "SLA Breached": "bg-red-50 text-red-700", "Met": "bg-emerald-50 text-emerald-700", "Missed": "bg-red-50 text-red-700", "Not started": "bg-slate-100 text-slate-500" };

// ----- Why P0? / Priority + Urgency decision panel ---------------------------
export function DecisionPanel({ decision, finding, source, compact }) {
  const { policy, risk, priority } = decision;
  return (
    <div className={`border rounded-md ${priority === "P0" ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white"}`}>
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge tone={PRIORITY_TONE[priority]}>{priority} — {policy.severity}</Badge>
          <Badge tone={priority === "P0" ? "bg-red-600 text-white" : "bg-amber-50 text-amber-800"}>Urgency: {policy.urgency}</Badge>
          <Badge tone={LABEL_TONE[finding.label]}>{finding.label}</Badge>
          <span className="text-xs text-slate-500">Risk score <b className="text-slate-800">{risk.score}/100</b></span>
        </div>
        <span className="text-[11px] text-slate-400">Decision source: {decision.source}</span>
      </div>
      <div className={`p-4 grid ${compact ? "grid-cols-1" : "lg:grid-cols-2"} gap-4 text-xs`}>
        <div>
          <div className="font-semibold text-slate-800 mb-1">Why {priority}? Priority decision</div>
          <table className="w-full"><tbody>
            {risk.factors.map((f) => <tr key={f.name} className="border-t border-slate-100"><td className="py-1 text-slate-500">{f.name}</td><td className="py-1 font-medium">{f.value}</td><td className="py-1 text-right text-slate-400">{f.points}/{f.max}</td></tr>)}
            <tr className="border-t border-slate-200"><td className="py-1 text-slate-500">Urgency</td><td className="py-1 font-medium">{policy.urgency}</td><td /></tr>
            <tr><td className="py-1 text-slate-500">Decision</td><td className="py-1 font-semibold" colSpan={2}>{priority} · {policy.severity}</td></tr>
          </tbody></table>
          <div className="mt-2 text-slate-600"><b>Reason:</b> {policy.reason}</div>
          <div className="mt-1 text-slate-600"><b>{priority} policy:</b> {policy.rule}</div>
        </div>
        <div className="space-y-1.5">
          <div className="font-semibold text-slate-800 mb-1">Context (metadata only, no raw PHI)</div>
          <Row k="Affected data store" v={`${source?.name || finding.sourceId} · ${source?.type || ""}`} />
          <Row k="Business criticality" v={source?.criticality || "Standard"} />
          <Row k="Exposure / access path" v={finding.accessPath || finding.exposure} />
          <Row k="Regulatory scope" v={decision.regulatory.join(" · ")} />
          <Row k="Classification" v={`${finding.label} · ${finding.confidence}% · ${finding.layers.join(" → ")} · model ${finding.modelVersion}`} />
          <Row k="Current owner status" v={finding.ownership === "Accepted" || finding.ownership === "Delegated" ? `Accepted — ${ownerName(finding.ownerId)}` : finding.ownership === "Assigned" ? `Awaiting acceptance — proposed ${ownerName(finding.proposedOwnerId)} · store Unowned` : "Unowned (risk state)"} />
          <Row k="Required action" v={policy.action} />
          <Row k="SLA" v={`Ack ≤${fmtTarget(policy.sla.ack)} · ${policy.slaLabels.containment.toLowerCase()} ≤${fmtTarget(policy.sla.containment)} · resolution ≤${fmtTarget(policy.sla.resolution)}`} />
        </div>
      </div>
    </div>
  );
}
const Row = ({ k, v }) => <div className="flex gap-2"><span className="w-36 shrink-0 text-slate-400">{k}</span><span className="text-slate-700">{v}</span></div>;
export const fmtTarget = (ms) => ms >= 86400e3 ? `${Math.round(ms / 86400e3)} d` : ms >= 3600e3 ? `${Math.round(ms / 3600e3)} h` : `${Math.round(ms / 60e3)} min`;

// ----- Task Decision Engine output --------------------------------------------
export function TaskDecision({ decision }) {
  const p = decision.policy;
  const items = [
    ["What action?", p.action],
    ["Who is accountable?", p.accountable],
    ["Who executes?", p.executor],
    ["How quickly?", `Acknowledgement ≤${fmtTarget(p.sla.ack)} · ${p.slaLabels.containment} ≤${fmtTarget(p.sla.containment)} · Resolution ≤${fmtTarget(p.sla.resolution)} (task-specific) · Verification ≤${fmtTarget(p.sla.verification)}`],
    ["What evidence?", p.evidence.join(" · ")],
    ["What approval?", p.approval],
    ["What if blocked?", `Pause requires a documented blocker, expected next action and review date. SLA treatment: ${p.pauseTreatment === "pauses" ? "SLA pauses" : "SLA continues"}.`],
    ["Escalation chain", ["Data Owner", ...p.escalation.map((e) => e.label)].join(" → ")],
  ];
  return (
    <Panel title="Task Decision" subtitle={`Derived from ${p.policy} v${p.version}. Every field below comes from the same decision object.`}>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
        {items.map(([k, v]) => <div key={k} className="border-b border-slate-100 pb-1.5"><div className="text-slate-400">{k}</div><div className="text-slate-700">{v}</div></div>)}
      </div>
    </Panel>
  );
}

// ----- Four separate SLA clocks --------------------------------------------------
export function SlaClocks({ task, now }) {
  const clocks = slaClocks(task, now);
  const pol = TASK_POLICIES[task.priority];
  if (!clocks) return <Note>No SLA clocks: this task predates the decision engine.</Note>;
  const paused = task.state === "Paused";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-slate-800">{task.priority} {pol.severity} response · four separate clocks</div>
        <div className="text-[11px] text-slate-400">{paused ? (pol.pauseTreatment === "pauses" ? "Paused — clocks stopped per policy" : "Paused — clocks continue per policy") : "Live"}</div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {clocks.map((c) => (
          <div key={c.key} className={`border rounded-md p-3 ${c.status === "SLA Breached" ? "border-red-300 bg-red-50" : c.status === "At Risk" ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
            <div className="text-[11px] text-slate-500">{c.label}</div>
            <div className="text-lg font-semibold font-mono text-slate-900">{c.status === "Not started" ? "—" : c.remaining !== undefined ? fmtDuration(c.remaining) : fmtDuration(c.took)}</div>
            <div className="text-[10px] text-slate-400">target {fmtTarget(c.target)}{c.took !== undefined ? ` · took ${fmtDuration(c.took)}` : c.remaining !== undefined && c.remaining < 0 ? " · over target" : " remaining"}</div>
            {c.pct !== undefined && <div className="h-1 bg-slate-100 rounded mt-1.5"><div className={`h-1 rounded ${c.status === "SLA Breached" ? "bg-red-600" : c.status === "At Risk" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${c.pct}%` }} /></div>}
            <div className="mt-1.5"><Badge tone={ESC_TONE[c.status]}>{c.status}</Badge></div>
          </div>
        ))}
      </div>
      <div className="text-[11px] text-slate-500 mt-2">{fmtTarget(pol.sla.containment)} is the required <b>initial containment</b> window, not complete remediation. Resolution has its own target. Verification starts only after evidence is submitted.</div>
    </div>
  );
}

// ----- Escalation panel -----------------------------------------------------------
export function EscalationPanel({ task, now }) {
  const pol = TASK_POLICIES[task.priority];
  const st = escalationStatus(task, now);
  const chain = [{ label: "Data Owner", level: 0 }, ...pol.escalation.map((e) => ({ label: e.label, level: e.level, trigger: e.trigger }))];
  const reached = Math.max(0, ...(task.escalations || []).map((e) => e.level));
  return (
    <Panel title="Escalation" subtitle="Automatic. If the owner does not acknowledge within the threshold, the SLA monitor escalates without waiting for anyone.">
      <div className="flex items-center gap-2 mb-3"><Badge tone={ESC_TONE[st.status]}>Status: {st.status}</Badge><span className="text-xs text-slate-500">{st.reason}</span></div>
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {chain.map((c, i) => (
          <div key={c.level} className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-md border ${c.level <= reached ? (c.level === 0 ? "border-slate-300 bg-slate-50" : "border-red-300 bg-red-50 text-red-800") : "border-slate-200 bg-white text-slate-500"}`}>
              <div className="font-medium">{c.label}</div>
              {c.trigger && <div className="text-[10px] text-slate-400">on {pol.slaLabels[c.trigger].toLowerCase()} breach</div>}
              {c.level > 0 && c.level <= reached && <div className="text-[10px] text-red-700">escalated {fmtTime((task.escalations || []).find((e) => e.level === c.level)?.at)}</div>}
            </div>
            {i < chain.length - 1 && <ArrowUpRight size={14} className="text-slate-300" />}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ----- Accountability vs execution ----------------------------------------------------
export function Accountability({ finding, task }) {
  const accountable = finding.ownership === "Accepted" || finding.ownership === "Delegated" ? ownerName(finding.ownerId) : null;
  return (
    <Panel title="Accountability" subtitle="Accountability and execution are tracked separately. Delegation never transfers accountability.">
      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div><div className="text-slate-400">Accountable owner</div><div className="font-semibold text-slate-800">{accountable || (finding.ownership === "Assigned" ? "None yet" : "None (Unowned)")}</div>
          <div className="mt-1"><Badge tone={STATE_TONE[finding.ownership]}>{finding.ownership === "Assigned" ? "Awaiting Acceptance" : finding.ownership}</Badge></div></div>
        <div><div className="text-slate-400">Task executor</div><div className="font-semibold text-slate-800">{finding.delegateId ? ownerName(finding.delegateId) : accountable || "—"}</div>{finding.delegateId && <div className="text-[11px] text-slate-500 mt-1">Delegated</div>}</div>
        <div><div className="text-slate-400">Accountability</div><div className="font-semibold text-slate-800">{accountable ? `${accountable} remains accountable` : finding.ownership === "Assigned" ? `Proposed: ${ownerName(finding.proposedOwnerId)} · store status Unowned` : "Store is Unowned — a tracked risk"}</div></div>
      </div>
      {finding.assignment?.history?.length > 0 && <div className="mt-3 text-[11px] text-slate-500">Assignment history: {finding.assignment.history.map((h, i) => <span key={i}>{h.proposed} rejected by {h.rejectedBy} ({h.reason}){i < finding.assignment.history.length - 1 ? "; " : ""}</span>)}</div>}
      {task?.escalations?.length > 0 && <div className="mt-1 text-[11px] text-red-700">Escalated to: {task.escalations.map((e) => e.label).join(" → ")}</div>}
    </Panel>
  );
}

// ----- Evidence timeline ----------------------------------------------------------
export function Timeline({ task }) {
  const items = [...(task.timeline || [])].sort((a, b) => a.at - b.at);
  return (
    <Panel title="Evidence timeline" subtitle="Append-only. Every event names the actor or system and the time. Nothing here can be edited or deleted.">
      {items.length === 0 ? <div className="text-xs text-slate-400">No events yet.</div> : (
        <ol className="text-xs space-y-1.5">
          {items.map((e, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-slate-400 w-16 shrink-0">{fmtTime(e.at)}</span>
              <span className="w-40 shrink-0 text-slate-500 truncate" title={e.actor}>{e.actor}</span>
              <span className="text-slate-700">{e.event}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

// ----- Full task detail (owner mode or read-only monitor) ------------------------------
export function TaskDetail({ task, finding, source, decision, store, persona, readOnly, onBack }) {
  const { actions, busy, now } = store;
  const pol = decision.policy;
  const [modal, setModal] = useState(null);
  const me = persona.ownerId;
  const canExecute = !readOnly && (finding.ownerId === me || finding.delegateId === me) && ["Accepted", "Delegated"].includes(finding.ownership);
  const containment = (task.actions || []).some((a) => a.containment);
  const verifying = busy[task.id] === "verify";
  const proposedToMe = !readOnly && finding.ownership === "Assigned" && finding.proposedOwnerId === me;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          {onBack && <button onClick={onBack} className="text-xs text-slate-500 hover:text-slate-800 mb-1">← Back to list</button>}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
            <h2 className="text-base font-semibold text-slate-900">{finding.title || finding.dataType}</h2>
            <Badge tone={STATE_TONE[task.state]}>{task.state}</Badge>
            <Badge>{task.type}</Badge>
            <span className="text-[11px] text-slate-400">Task {task.id} · policy v{task.policyVersion || pol.version}</span>
          </div>
        </div>
        {!readOnly && <div className="flex gap-1.5 items-center"><span className="text-[10px] text-slate-400">Demo clock</span><Button small variant="ghost" onClick={() => actions.advanceClock(5)}>+5 min</Button><Button small variant="ghost" onClick={() => actions.advanceClock(25)}>+25 min</Button></div>}
      </div>

      {proposedToMe && <AcceptanceCard finding={finding} source={source} task={task} decision={decision} onAccept={() => actions.acceptOwnership(finding.id)} onReject={() => setModal("reject")} now={now} />}

      {task.lastVerification?.result === "Failed" && task.state !== "Verified Closed" && (
        <Note tone="red"><span className="flex items-start gap-1"><ShieldAlert size={12} className="mt-0.5 shrink-0" /><span><b>Verification failed at {fmtTime(task.lastVerification.at)} ({task.lastVerification.by}).</b> {task.lastVerification.detail} The task returned to In Progress. Continue remediation and resubmit.</span></span></Note>
      )}
      {task.state === "Pending Verification" && <Note tone="amber"><span className="flex items-center gap-1"><Clock size={12} /> Remediation submitted. Independent verification required before closure. Attestation alone cannot close this task.</span></Note>}
      {task.state === "Verified Closed" && task.lastVerification && (
        <Note tone="green"><div className="flex items-start gap-1"><CheckCircle2 size={12} className="mt-0.5 shrink-0" /><div><b>Verified Closed.</b> {task.lastVerification.detail}<div className="mt-1 text-[11px]">Verified {fmtTime(task.lastVerification.at)} by {task.lastVerification.by} · policy v{task.lastVerification.policyVersion} · remediation: {(task.actions || []).map((a) => a.result).join("; ") || "recorded"}</div></div></div></Note>
      )}

      <SlaClocks task={task} now={now} />
      <DecisionPanel decision={decision} finding={finding} source={source} />
      <div className="grid lg:grid-cols-2 gap-4">
        <TaskDecision decision={decision} />
        <div className="space-y-4">
          <Accountability finding={finding} task={task} />
          <EscalationPanel task={task} now={now} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="What happened?"><div className="text-xs text-slate-700">{finding.plain}</div>{finding.accessPath && <div className="text-[11px] text-slate-500 mt-2"><b>Access path:</b> {finding.accessPath}</div>}</Panel>
        <Panel title="Why does it matter?"><div className="text-xs text-slate-700">{finding.label === "Restricted" ? "Regulated data (PHI, payment or genetic). Exposure through this path creates breach-notification duties, DPDP penalties, HIPAA violations and PCI-DSS non-compliance. " : "Personal data with confidentiality obligations under DPDP and GDPR. "}{pol.reason}</div><div className="text-[11px] text-slate-500 mt-2"><b>Regulatory scope:</b> {decision.regulatory.join(" · ")}</div></Panel>
        <Panel title="What must I do?"><ol className="text-xs text-slate-700 list-decimal pl-4 space-y-1">{pol.procedure.map((p, i) => <li key={i}>{p}</li>)}</ol></Panel>
      </div>

      {(task.actions || []).length > 0 && (
        <Panel title="Recorded actions" subtitle="Manual actions recorded by the executor. Each is also an evidence event.">
          <table className="w-full text-xs"><thead><tr><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Systems</Th><Th>Result</Th><Th>Evidence</Th></tr></thead>
            <tbody>{task.actions.map((a, i) => <tr key={i} className="border-t border-slate-100"><td className="py-1.5 pr-2 font-mono text-slate-400">{fmtTime(a.at)}</td><td className="py-1.5 pr-2">{a.actor}</td><td className="py-1.5 pr-2">{a.containment && <Badge tone="bg-red-50 text-red-700">Containment</Badge>} {a.action}</td><td className="py-1.5 pr-2 text-slate-500">{a.systems}</td><td className="py-1.5 pr-2">{a.result}</td><td className="py-1.5 text-slate-500 font-mono text-[11px]">{a.evidence || "—"}</td></tr>)}</tbody></table>
        </Panel>
      )}

      {(task.pauses || []).length > 0 && (
        <Panel title="Pause history" subtitle="Reason, actor, timestamp, expected next action and review date are retained. SLA treatment is shown, never silent.">
          <table className="w-full text-xs"><thead><tr><Th>Paused</Th><Th>Resumed</Th><Th>By</Th><Th>Reason</Th><Th>Next action</Th><Th>Review</Th><Th>SLA</Th></tr></thead>
            <tbody>{task.pauses.map((p, i) => <tr key={i} className="border-t border-slate-100"><td className="py-1.5 pr-2 font-mono text-slate-400">{fmtTime(p.at)}</td><td className="py-1.5 pr-2 font-mono text-slate-400">{p.resumedAt ? fmtTime(p.resumedAt) : "open"}</td><td className="py-1.5 pr-2">{p.by}</td><td className="py-1.5 pr-2">{p.category}{p.detail ? ` — ${p.detail}` : ""}</td><td className="py-1.5 pr-2 text-slate-500">{p.nextAction}</td><td className="py-1.5 pr-2 text-slate-500">{p.reviewDate}</td><td className="py-1.5">{p.treatment === "pauses" ? "Paused" : "Continues"}</td></tr>)}</tbody></table>
        </Panel>
      )}

      {!readOnly && !proposedToMe && (
        <Panel title="Actions available to you" subtitle={canExecute ? `${task.state} · ${pol.pauseNote}` : "You are not the accountable owner or delegated executor of this task."}>
          <div className="flex gap-2 flex-wrap">
            {canExecute && task.state === "Open" && <Button onClick={() => actions.startTask(task.id)}>Start work</Button>}
            {canExecute && task.state === "In Progress" && (<>
              <Button onClick={() => setModal("record")}><FileText size={12} /> Record action</Button>
              <Button onClick={() => actions.submitForVerification(task.id)} disabled={(task.actions || []).length === 0} title={(task.actions || []).length === 0 ? "Record at least one action with evidence first" : undefined}>Submit for verification</Button>
              <Button variant="ghost" onClick={() => setModal("pause")}>Pause task</Button>
            </>)}
            {canExecute && task.state === "Paused" && <Button onClick={() => actions.resumeTask(task.id)}>Resume</Button>}
            {task.state === "Pending Verification" && <Button onClick={() => actions.runVerification(task.id)} disabled={verifying}>{verifying ? "Verifying…" : "Run independent verification (simulate)"}</Button>}
            {canExecute && !["Verified Closed", "Cancelled", "Pending Verification"].includes(task.state) && (<>
              {finding.ownership === "Accepted" && <Button variant="ghost" onClick={() => setModal("delegate")}><Users size={12} /> Delegate execution</Button>}
              {!(finding.dispute && !finding.dispute.outcome) && <Button variant="ghost" onClick={() => setModal("dispute")}>Dispute classification</Button>}
              <Button variant="ghost" onClick={() => setModal("exception")}>Request exception</Button>
            </>)}
          </div>
          {canExecute && task.state === "In Progress" && !containment && task.priority === "P0" && <div className="text-[11px] text-amber-800 mt-2 flex items-center gap-1"><AlertTriangle size={11} /> The containment clock stops only when you record an action marked as containment.</div>}
        </Panel>
      )}

      <Timeline task={task} />

      {modal === "record" && <RecordActionModal task={task} persona={persona} onClose={() => setModal(null)} onSave={(rec) => { actions.recordAction(task.id, rec); setModal(null); }} />}
      {modal === "pause" && <PauseModal task={task} onClose={() => setModal(null)} onSave={(p) => { actions.pauseTask(task.id, p); setModal(null); }} />}
      {modal === "reject" && <ReasonModal title="Reject assignment" tone="red" note="If you reject, the store stays Unowned and the assignment returns to the analyst for reassignment or escalation. You do not become accountable. The rejection is recorded." placeholder="e.g. This feed is operated by the Integration team, not Clinical Systems" cta="Reject assignment" onClose={() => setModal(null)} onSave={(r) => { actions.rejectAssignment(finding.id, r); setModal(null); }} />}
      {modal === "dispute" && <ReasonModal title="Dispute classification" tone="amber" note="Owner ≠ Classifier. You cannot change the label. The dispute goes to the analyst queue. The task and its SLA clocks remain open." placeholder="e.g. This extract is de-identified under expert determination dated …" cta="Submit dispute" onClose={() => setModal(null)} onSave={(r) => { actions.disputeClassification(finding.id, r); setModal(null); }} />}
      {modal === "delegate" && <DelegateModal me={me} onClose={() => setModal(null)} onSave={(d) => { actions.delegateTask(finding.id, d); setModal(null); }} />}
      {modal === "exception" && <ExceptionModal finding={finding} onClose={() => setModal(null)} onSave={(r, d) => { actions.requestException(finding.id, r, d); setModal(null); }} />}
    </div>
  );
}

function AcceptanceCard({ finding, source, task, decision, onAccept, onReject, now }) {
  const clocks = slaClocks(task, now); const ack = clocks?.find((c) => c.key === "ack");
  const pol = decision.policy;
  return (
    <div className="border-2 border-red-300 bg-red-50 rounded-md p-4">
      <div className="flex items-center gap-2 mb-2"><ShieldAlert size={16} className="text-red-700" /><div className="text-sm font-semibold text-red-900">{task.priority} {pol.severity} finding requires your acceptance</div></div>
      <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-700">
        <Row k="Finding" v={finding.title || finding.dataType} />
        <Row k="Why P0" v={`${pol.urgency} urgency · risk ${decision.risk.score}/100 · ${pol.reason}`} />
        <Row k="Affected data store" v={`${source?.name || finding.sourceId} · ${source?.type || ""} · criticality ${source?.criticality || "Standard"}`} />
        <Row k="Required action" v={pol.action} />
        <Row k="Current SLA" v={`Ack ≤${fmtTarget(pol.sla.ack)} · containment ≤${fmtTarget(pol.sla.containment)} · resolution ≤${fmtTarget(pol.sla.resolution)}`} />
        <Row k="Time remaining (ack)" v={ack?.remaining !== undefined ? `${fmtDuration(ack.remaining)} · ${ack.status}` : "—"} />
        <Row k="Expected evidence" v={pol.evidence.join(" · ")} />
        <Row k="Escalation consequence" v={`If not acknowledged in ${fmtTarget(pol.sla.ack)}: escalates to ${pol.escalation[0].label}. If not contained in ${fmtTarget(pol.sla.containment)}: escalates to ${pol.escalation[pol.escalation.length - 1].label}.`} />
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={onAccept}>Accept ownership</Button>
        <Button variant="ghost" onClick={onReject}>Reject assignment</Button>
      </div>
      <div className="text-[11px] text-slate-500 mt-2">Accepting makes you the accountable owner of this data store and starts the task. Rejecting keeps the store Unowned.</div>
    </div>
  );
}

function RecordActionModal({ task, persona, onClose, onSave }) {
  const [f, setF] = useState({ action: "", systems: "", result: "", evidence: "", notes: "", containment: task.priority === "P0" && !(task.actions || []).some((a) => a.containment) });
  const set = (k, v) => setF({ ...f, [k]: v });
  const ok = f.action.trim() && f.systems.trim() && f.result.trim();
  return (
    <Modal title="Record action" onClose={onClose}>
      <div className="space-y-3">
        <Note>Actor: <b>{persona.user} ({persona.code})</b> · Date/time: recorded automatically. This record becomes an append-only evidence event.</Note>
        <Field label="Action performed"><input value={f.action} onChange={(e) => set("action", e.target.value)} className={inputCls} placeholder="e.g. Revoked vendor SFTP account; moved /claims/outbound to restricted share" /></Field>
        <Field label="Systems affected"><input value={f.systems} onChange={(e) => set("systems", e.target.value)} className={inputCls} placeholder="e.g. Claims SFTP, IAM group claims-vendors" /></Field>
        <Field label="Result"><input value={f.result} onChange={(e) => set("result", e.target.value)} className={inputCls} placeholder="e.g. External path removed; internal batch job unaffected" /></Field>
        <Field label="Evidence attachment (reference)"><input value={f.evidence} onChange={(e) => set("evidence", e.target.value)} className={inputCls} placeholder="e.g. change-4482.json, acl-before-after.png" /></Field>
        <Field label="Notes"><input value={f.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} /></Field>
        <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={f.containment} onChange={(e) => set("containment", e.target.checked)} /> This action completes initial containment (stops the containment clock)</label>
        <Button disabled={!ok} onClick={() => onSave(f)}>Save action record</Button>
      </div>
    </Modal>
  );
}

function PauseModal({ task, onClose, onSave }) {
  const pol = TASK_POLICIES[task.priority];
  const [f, setF] = useState({ category: PAUSE_REASONS[1], detail: "", nextAction: "", reviewDate: "" });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <Modal title="Pause task" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Reason"><select value={f.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>{PAUSE_REASONS.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Blocker detail"><input value={f.detail} onChange={(e) => set("detail", e.target.value)} className={inputCls} placeholder="What exactly is blocking?" /></Field>
        <Field label="Expected next action"><input value={f.nextAction} onChange={(e) => set("nextAction", e.target.value)} className={inputCls} placeholder="e.g. Network team applies firewall change in tonight's window" /></Field>
        <Field label="Review date/time"><input type="datetime-local" value={f.reviewDate} onChange={(e) => set("reviewDate", e.target.value)} className={inputCls} /></Field>
        <Note tone={pol.pauseTreatment === "pauses" ? "blue" : "amber"}><b>SLA treatment under {pol.policy} v{pol.version}:</b> {pol.pauseTreatment === "pauses" ? "SLA pauses" : "SLA continues"}. {pol.pauseNote}</Note>
        <Button disabled={!f.nextAction.trim() || !f.reviewDate} onClick={() => onSave(f)}>Pause task</Button>
      </div>
    </Modal>
  );
}

export function ReasonModal({ title, note, tone, placeholder, cta, onClose, onSave }) {
  const [r, setR] = useState("");
  return (
    <Modal title={title} onClose={onClose}><div className="space-y-3">
      <Note tone={tone}>{note}</Note>
      <Field label="Reason (required)"><input value={r} onChange={(e) => setR(e.target.value)} className={inputCls} placeholder={placeholder} /></Field>
      <Button variant={tone === "red" ? "danger" : "primary"} disabled={!r.trim()} onClick={() => onSave(r.trim())}>{cta}</Button>
    </div></Modal>
  );
}
function DelegateModal({ me, onClose, onSave }) {
  const [d, setD] = useState(OWNERS.find((o) => o.id !== me)?.id);
  return (
    <Modal title="Delegate execution" onClose={onClose}><div className="space-y-3">
      <Note tone="blue">Delegation moves the work, not the accountability. You remain the accountable owner and the SLA clocks remain yours.</Note>
      <Field label="Task executor"><select value={d} onChange={(e) => setD(e.target.value)} className={inputCls}>{OWNERS.filter((o) => o.id !== me).map((o) => <option key={o.id} value={o.id}>{o.name} — {o.unit}</option>)}</select></Field>
      <Button onClick={() => onSave(d)}>Delegate</Button>
    </div></Modal>
  );
}
function ExceptionModal({ finding, onClose, onSave }) {
  const [r, setR] = useState(""); const [d, setD] = useState("30");
  return (
    <Modal title={`Request ${finding.label === "Restricted" ? "Tier-2" : "Tier-1"} exception`} onClose={onClose}><div className="space-y-3">
      <Note tone="amber">Risk acceptance is only possible through a time-bound, scoped exception. {finding.label === "Restricted" ? "Restricted scope needs POL and ASR-A approval." : "POL approval is required."} You cannot approve your own request.</Note>
      <Field label="Business justification"><input value={r} onChange={(e) => setR(e.target.value)} className={inputCls} /></Field>
      <Field label="Requested duration (days)"><input type="number" min={1} max={180} value={d} onChange={(e) => setD(e.target.value)} className={inputCls} /></Field>
      <Button disabled={!r.trim()} onClick={() => onSave(r.trim(), Number(d))}>Submit request</Button>
    </div></Modal>
  );
}
