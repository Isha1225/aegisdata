import { useState } from "react";
import { Panel, Button, Badge, LayerChain, EmptyState, Modal, Field, inputCls, Note, Th } from "../ui.jsx";
import { STATE_TONE, LABEL_TONE, OWNERS, PRIORITY_TONE } from "../data.js";
import { ownerName } from "../store.js";
import { slaClocks, escalationStatus, fmtDuration } from "../decision.js";
import { DecisionPanel, TaskDecision, TaskDetail, fmtTarget } from "../components/TaskOps.jsx";

const ESC_TONE = { "On Track": "bg-emerald-50 text-emerald-700", "At Risk": "bg-amber-50 text-amber-800", "Escalated": "bg-orange-50 text-orange-800", "SLA Breached": "bg-red-50 text-red-700" };
const rank = (f) => (f.dispute && !f.dispute.outcome ? 0 : 1) * 100 + (f.label === "Restricted" && f.ownership === "Unowned" ? 0 : 1) * 50 + ({ External: 0, Broad: 1, Limited: 2, None: 3 }[f.exposure] || 3) * 10 + f.confidence / 100;

export default function TriagePage({ store, persona }) {
  const { findings, sources, tasks, now, actions } = store;
  const srcOf = (f) => sources.find((s) => s.id === f.sourceId);
  const [assignFor, setAssignFor] = useState(null);
  const [reclassFor, setReclassFor] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [monitorId, setMonitorId] = useState(null);

  const queue = findings.filter((f) => ["Detected", "Under Review"].includes(f.state) || (f.dispute && !f.dispute.outcome)).sort((a, b) => rank(a) - rank(b));
  const needsOwner = findings.filter((f) => f.ownership === "Unowned" && ["Confirmed", "Remediation Required"].includes(f.state));
  const monitor = tasks.map((t) => ({ t, f: findings.find((x) => x.id === t.findingId) })).filter(({ t, f }) => f && t.createdAt && !["Verified Closed", "Cancelled"].includes(t.state)).sort((a, b) => ({ P0: 0, P1: 1, P2: 2 }[a.t.priority] - { P0: 0, P1: 1, P2: 2 }[b.t.priority]));
  const rest = findings.filter((f) => !queue.includes(f));

  if (monitorId) {
    const m = monitor.find((x) => x.t.id === monitorId) || tasks.map((t) => ({ t, f: findings.find((x) => x.id === t.findingId) })).find((x) => x.t.id === monitorId);
    if (m) return <TaskDetail task={m.t} finding={m.f} source={srcOf(m.f)} decision={store.decisionFor(m.f, m.t.priority)} store={store} persona={persona} readOnly onBack={() => setMonitorId(null)} />;
  }

  const head = (withActions) => (
    <thead><tr><Th>Label</Th><Th>Finding · store</Th><Th>Confidence</Th><Th>Layers</Th><Th>Exposure</Th><Th>Ownership</Th><Th>State</Th><Th>Priority decision</Th>{withActions && <Th></Th>}</tr></thead>
  );

  return (
    <div className="space-y-6">
      <Note tone="blue"><b>Analyst authority.</b> ANL reviews findings, validates classification, assesses risk, confirms priority, proposes owners and monitors assignment and escalation. ANL never becomes the owner by assigning one, and never approves its own high-risk decisions. Click a finding name to see the full Why-P0 decision.</Note>

      <Panel title={`Review queue (${queue.length})`} subtitle="Ranked by owner disputes, unowned Restricted stores, exposure, then confidence. Confirming runs the Task Decision Engine, which sets priority, urgency, SLA clocks, evidence and escalation.">
        {queue.length === 0 ? <EmptyState text="No findings require adjudication." /> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">{head(true)}
            <tbody>{queue.map((f) => <FindingRow key={f.id} f={f} store={store} srcOf={srcOf} expanded={expanded} setExpanded={setExpanded} actionsCell={(x) => (
              <div className="flex flex-col gap-1 items-start">
                {x.dispute && !x.dispute.outcome && (<>
                  <div className="text-[11px] text-amber-800 bg-amber-50 rounded px-2 py-1 max-w-[220px]">Owner: “{x.dispute.reason}”</div>
                  <Button small variant="ghost" onClick={() => actions.upholdClassification(x.id)}>Uphold</Button>
                  <Button small variant="ghost" onClick={() => setReclassFor(x)}>Reclassify</Button>
                </>)}
                {x.state === "Detected" && <Button small onClick={() => actions.startReview(x.id)}>Start review</Button>}
                {x.state === "Under Review" && (<><Button small onClick={() => actions.confirmFinding(x.id)}>Confirm classification</Button><Button small variant="ghost" onClick={() => actions.rejectFinding(x.id)}>Reject</Button></>)}
              </div>
            )} />)}</tbody></table></div>
        )}
      </Panel>

      <Panel title={`Ownership assignment (${needsOwner.length})`} subtitle="Every store must resolve to exactly one accepted owner. Sending an assignment proposes an owner. The store remains Unowned until acceptance.">
        {needsOwner.length === 0 ? <EmptyState text="Every confirmed finding has a proposed or accepted owner." /> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">{head(true)}
            <tbody>{needsOwner.map((f) => <FindingRow key={f.id} f={f} store={store} srcOf={srcOf} expanded={expanded} setExpanded={setExpanded} actionsCell={(x) => <Button small onClick={() => setAssignFor(x)}>Assign owner</Button>} />)}</tbody></table></div>
        )}
      </Panel>

      <Panel title={`Assignment & escalation monitor (${monitor.length})`} subtitle="Open tasks with live SLA clocks. Analysts monitor acceptance and escalation but do not execute remediation.">
        {monitor.length === 0 ? <EmptyState text="No open tasks with SLA clocks." /> : (
          <table className="w-full text-xs"><thead><tr><Th>Priority</Th><Th>Finding</Th><Th>Task state</Th><Th>Accountability</Th><Th>Acknowledge</Th><Th>Containment</Th><Th>Resolution</Th><Th>Escalation</Th><Th></Th></tr></thead>
            <tbody>{monitor.map(({ t, f }) => { const c = slaClocks(t, now); const esc = escalationStatus(t, now); const cell = (k) => { const x = c.find((y) => y.key === k); return x.status === "Not started" ? <span className="text-slate-300">—</span> : x.took !== undefined ? <span className="text-emerald-700">met in {fmtDuration(x.took)}</span> : <span className={x.remaining < 0 ? "text-red-600 font-medium" : x.status === "At Risk" ? "text-amber-700" : ""}>{fmtDuration(x.remaining)}</span>; };
              return (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="py-2 pr-3"><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></td>
                  <td className="py-2 pr-3"><div className="font-medium">{f.title || f.dataType}</div><div className="text-slate-400">{srcOf(f)?.name}</div></td>
                  <td className="py-2 pr-3"><Badge tone={STATE_TONE[t.state]}>{t.state}</Badge></td>
                  <td className="py-2 pr-3"><Badge tone={STATE_TONE[f.ownership]}>{f.ownership === "Assigned" ? "Awaiting Acceptance" : f.ownership}</Badge><div className="text-[10px] text-slate-400">{f.ownership === "Assigned" ? `proposed ${ownerName(f.proposedOwnerId)}` : f.ownerId ? ownerName(f.ownerId) : "Unowned"}{f.delegateId ? ` · exec ${ownerName(f.delegateId)}` : ""}</div></td>
                  <td className="py-2 pr-3 font-mono">{cell("ack")}</td><td className="py-2 pr-3 font-mono">{cell("containment")}</td><td className="py-2 pr-3 font-mono">{cell("resolution")}</td>
                  <td className="py-2 pr-3"><Badge tone={ESC_TONE[esc.status]}>{esc.status}</Badge>{t.escalations?.length > 0 && <div className="text-[10px] text-red-700 mt-0.5">→ {t.escalations.map((e) => e.to).join(", ")}</div>}</td>
                  <td className="py-2"><Button small variant="ghost" onClick={() => setMonitorId(t.id)}>Monitor</Button></td>
                </tr>
              ); })}</tbody></table>
        )}
        <div className="text-[11px] text-slate-400 mt-2">Demo clock: <Button small variant="ghost" onClick={() => actions.advanceClock(5)}>+5 min</Button> <Button small variant="ghost" onClick={() => actions.advanceClock(25)}>+25 min</Button></div>
      </Panel>

      <Panel title="All other findings" subtitle="Rejected and superseded records remain visible for audit. Nothing is suppressed.">
        <div className="overflow-x-auto"><table className="w-full text-xs">{head(false)}<tbody>{rest.map((f) => <FindingRow key={f.id} f={f} store={store} srcOf={srcOf} expanded={expanded} setExpanded={setExpanded} />)}</tbody></table></div>
      </Panel>

      {assignFor && <AssignModal finding={assignFor} decision={store.decisionFor(assignFor)} source={srcOf(assignFor)} onClose={() => setAssignFor(null)} onAssign={(fields) => { actions.assignOwner(assignFor.id, fields); setAssignFor(null); }} />}
      {reclassFor && <ReclassModal finding={reclassFor} onClose={() => setReclassFor(null)} onSave={(l, r) => { actions.reclassifyFinding(reclassFor.id, l, r); setReclassFor(null); }} />}
    </div>
  );
}

function FindingRow({ f, actionsCell, store, srcOf, expanded, setExpanded }) {
  const d = store.decisionFor(f);
  return (<>
    <tr className="border-t border-slate-100 align-top">
      <td className="py-2 pr-3"><Badge tone={LABEL_TONE[f.label]}>{f.label}</Badge>{f.previousLabel && <div className="text-[10px] text-slate-400 mt-0.5">was {f.previousLabel}</div>}</td>
      <td className="py-2 pr-3"><button className="font-medium text-left hover:underline" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>{f.title || srcOf(f)?.name}</button><div className="text-slate-400">{f.title ? `${srcOf(f)?.name} · ` : ""}{f.dataType}</div></td>
      <td className="py-2 pr-3"><span className={f.confidence < 70 ? "text-amber-700 font-medium" : ""}>{f.confidence}%</span><div className="text-[10px] text-slate-400">{f.modelVersion}</div></td>
      <td className="py-2 pr-3"><LayerChain layers={f.layers} /></td>
      <td className="py-2 pr-3"><span className={["Broad", "External"].includes(f.exposure) ? "text-red-600 font-medium" : "text-slate-500"}>{f.exposure}</span></td>
      <td className="py-2 pr-3"><Badge tone={STATE_TONE[f.ownership]}>{f.ownership === "Assigned" ? "Awaiting Acceptance" : f.ownership}</Badge><div className="text-[10px] text-slate-400 mt-0.5">{f.ownership === "Assigned" ? `proposed ${ownerName(f.proposedOwnerId)}` : f.ownerId ? ownerName(f.ownerId) : ""}</div></td>
      <td className="py-2 pr-3"><Badge tone={STATE_TONE[f.state]}>{f.state}</Badge>{f.dispute && !f.dispute.outcome && <div className="text-[10px] text-amber-700 mt-0.5">Disputed by owner</div>}</td>
      <td className="py-2 pr-3"><Badge tone={PRIORITY_TONE[d.priority]}>{d.priority}</Badge><div className="text-[10px] text-slate-400 mt-0.5">risk {d.risk.score} · {d.policy.urgency}</div></td>
      {actionsCell && <td className="py-2">{actionsCell(f, d)}</td>}
    </tr>
    {expanded === f.id && <tr><td colSpan={9} className="pb-3"><div className="space-y-3"><DecisionPanel decision={d} finding={f} source={srcOf(f)} /><TaskDecision decision={d} /></div></td></tr>}
  </>);
}

function AssignModal({ finding, decision, source, onClose, onAssign }) {
  const [o, setO] = useState(finding.sourceId === "src-4" ? "own-priya" : OWNERS[0].id);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState(source?.name || "");
  const [sent, setSent] = useState(false);
  const p = decision.policy;
  if (sent) return (
    <Modal title="Assignment sent" onClose={onClose}>
      <div className="space-y-3 text-xs">
        <Note tone="amber"><b>Assignment sent.</b> The proposed owner has been notified. Accountability does not exist yet.</Note>
        <div className="space-y-1"><div><span className="text-slate-400">Proposed owner:</span> <b>{ownerName(o)}</b></div><div><span className="text-slate-400">Accountability status:</span> <b>Awaiting Acceptance</b></div><div><span className="text-slate-400">Store status:</span> <b>Unowned</b></div><div><span className="text-slate-400">Acknowledgement SLA:</span> {fmtTarget(p.sla.ack)} · escalates to {p.escalation[0].label} on breach</div></div>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
  return (
    <Modal title="Assign owner (propose)" onClose={onClose} wide>
      <div className="space-y-3">
        <DecisionPanel decision={decision} finding={finding} source={source} compact />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Proposed owner" hint="Selecting a person does not make them accountable. They must accept."><select value={o} onChange={(e) => setO(e.target.value)} className={inputCls}>{OWNERS.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.unit}</option>)}</select></Field>
          <Field label="Reason for assignment"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. Operates the claims batch pipeline and SFTP share" /></Field>
          <Field label="Scope"><input value={scope} onChange={(e) => setScope(e.target.value)} className={inputCls} /></Field>
          <Field label="Priority (from decision)"><input readOnly value={`${decision.priority} — ${p.severity} · urgency ${p.urgency}`} className={`${inputCls} bg-slate-50 text-slate-600`} /></Field>
          <Field label="SLA (from decision)"><input readOnly value={`Ack ≤${fmtTarget(p.sla.ack)} · containment ≤${fmtTarget(p.sla.containment)} · resolution ≤${fmtTarget(p.sla.resolution)}`} className={`${inputCls} bg-slate-50 text-slate-600`} /></Field>
          <Field label="Required action (from decision)"><input readOnly value={p.action} className={`${inputCls} bg-slate-50 text-slate-600`} /></Field>
        </div>
        <Button disabled={!reason.trim()} onClick={() => { onAssign({ ownerId: o, reason: reason.trim(), scope }); setSent(true); }}>Send assignment</Button>
      </div>
    </Modal>
  );
}

function ReclassModal({ finding, onClose, onSave }) {
  const [label, setLabel] = useState(finding.label);
  const [reason, setReason] = useState("");
  return (
    <Modal title="Reclassify finding (attributable)" onClose={onClose}>
      <div className="space-y-3">
        <Note tone="amber">The prior classification is superseded, not deleted. Model version {finding.modelVersion} and your identity are recorded.</Note>
        <Field label="New label"><select value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls}>{["Public", "Internal", "Confidential", "Restricted"].map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Reason (required)"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} /></Field>
        <Button disabled={!reason.trim() || label === finding.label} onClick={() => onSave(label, reason.trim())}>Reclassify</Button>
      </div>
    </Modal>
  );
}
