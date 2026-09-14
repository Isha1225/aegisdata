import { useState } from "react";
import { Panel, Button, Badge, LayerChain, EmptyState, Modal, Field, inputCls, Note, Th } from "../ui.jsx";
import { STATE_TONE, LABEL_TONE, OWNERS } from "../data.js";
import { ownerName, evaluatePolicy } from "../store.js";

// Priority order: conflicting/disputed, unowned Restricted, SLA risk, exposure, then confidence.
const rank = (f) => (f.dispute && !f.dispute.outcome ? 0 : 1) * 100 + (f.label === "Restricted" && f.ownership === "Unowned" ? 0 : 1) * 50 + ({ External: 0, Broad: 1, Limited: 2, None: 3 }[f.exposure] || 3) * 10 + f.confidence / 100;

export default function TriagePage({ store }) {
  const { findings, sources, rules, actions } = store;
  const srcName = (id) => sources.find((s) => s.id === id)?.name || id;
  const [assignFor, setAssignFor] = useState(null);
  const [reclassFor, setReclassFor] = useState(null);

  const queue = findings.filter((f) => ["Detected", "Under Review"].includes(f.state) || (f.dispute && !f.dispute.outcome)).sort((a, b) => rank(a) - rank(b));
  const needsOwner = findings.filter((f) => f.ownership === "Unowned" && ["Confirmed", "Remediation Required"].includes(f.state));
  const rest = findings.filter((f) => !queue.includes(f));

  const Row = ({ f, actionsCell }) => {
    const rule = evaluatePolicy(f, rules);
    return (
      <tr className="border-t border-slate-100 align-top">
        <td className="py-2 pr-3"><Badge tone={LABEL_TONE[f.label]}>{f.label}</Badge>{f.previousLabel && <div className="text-[10px] text-slate-400 mt-0.5">was {f.previousLabel}</div>}</td>
        <td className="py-2 pr-3"><div className="font-medium">{srcName(f.sourceId)}</div><div className="text-slate-400">{f.dataType}</div></td>
        <td className="py-2 pr-3"><span className={f.confidence < 70 ? "text-amber-700 font-medium" : ""}>{f.confidence}%</span><div className="text-[10px] text-slate-400">{f.modelVersion}</div></td>
        <td className="py-2 pr-3"><LayerChain layers={f.layers} /></td>
        <td className="py-2 pr-3"><span className={["Broad", "External"].includes(f.exposure) ? "text-red-600 font-medium" : "text-slate-500"}>{f.exposure}</span></td>
        <td className="py-2 pr-3"><Badge tone={STATE_TONE[f.ownership]}>{f.ownership}</Badge><div className="text-[10px] text-slate-400 mt-0.5">{f.ownership === "Assigned" ? `→ ${ownerName(f.proposedOwnerId)}` : f.ownerId ? ownerName(f.ownerId) : ""}</div></td>
        <td className="py-2 pr-3"><Badge tone={STATE_TONE[f.state]}>{f.state}</Badge>{f.dispute && !f.dispute.outcome && <div className="text-[10px] text-amber-700 mt-0.5">Disputed by owner</div>}</td>
        <td className="py-2 pr-3 text-slate-400 text-[11px]">{rule ? `${rule.obligation} · ${rule.priority}` : "none"}</td>
        {actionsCell && <td className="py-2">{actionsCell(f)}</td>}
      </tr>
    );
  };
  const head = (withActions) => (
    <thead><tr><Th>Label</Th><Th>Source · data type</Th><Th>Confidence</Th><Th>Layers</Th><Th>Exposure</Th><Th>Ownership</Th><Th>State</Th><Th>Policy would fire</Th>{withActions && <Th></Th>}</tr></thead>
  );

  return (
    <div className="space-y-6">
      <Note tone="blue"><b>Analyst authority.</b> Only ANL adjudicates or reclassifies. Every decision records the analyst, model version and detection layers. Only adjudicated outcomes feed classifier training.</Note>

      <Panel title={`Review queue (${queue.length})`} subtitle="Ranked by: owner disputes, unowned Restricted stores, exposure, then confidence. Confirming runs the policy engine, which decides the obligation.">
        {queue.length === 0 ? <EmptyState text="No findings require adjudication." /> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">{head(true)}
            <tbody>{queue.map((f) => <Row key={f.id} f={f} actionsCell={(x) => (
              <div className="flex flex-col gap-1 items-start">
                {x.dispute && !x.dispute.outcome && (<>
                  <div className="text-[11px] text-amber-800 bg-amber-50 rounded px-2 py-1 max-w-[220px]">Owner: “{x.dispute.reason}”</div>
                  <Button small variant="ghost" onClick={() => actions.upholdClassification(x.id)}>Uphold</Button>
                  <Button small variant="ghost" onClick={() => setReclassFor(x)}>Reclassify</Button>
                </>)}
                {x.state === "Detected" && <Button small onClick={() => actions.startReview(x.id)}>Start review</Button>}
                {x.state === "Under Review" && (<><Button small onClick={() => actions.confirmFinding(x.id)}>Confirm</Button><Button small variant="ghost" onClick={() => actions.rejectFinding(x.id)}>Reject</Button></>)}
              </div>
            )} />)}</tbody></table></div>
        )}
      </Panel>

      <Panel title={`Ownership assignment (${needsOwner.length})`} subtitle="Every store must resolve to exactly one accepted owner. Assignment alone does not create accountability.">
        {needsOwner.length === 0 ? <EmptyState text="Every confirmed finding has an assigned or accepted owner." /> : (
          <div className="overflow-x-auto"><table className="w-full text-xs">{head(true)}
            <tbody>{needsOwner.map((f) => <Row key={f.id} f={f} actionsCell={(x) => <Button small onClick={() => setAssignFor(x)}>Assign owner</Button>} />)}</tbody></table></div>
        )}
      </Panel>

      <Panel title="All other findings" subtitle="Rejected and superseded records remain visible for audit. Nothing is suppressed.">
        <div className="overflow-x-auto"><table className="w-full text-xs">{head(false)}<tbody>{rest.map((f) => <Row key={f.id} f={f} />)}</tbody></table></div>
      </Panel>

      {assignFor && <AssignModal finding={assignFor} onClose={() => setAssignFor(null)} onAssign={(o) => { actions.assignOwner(assignFor.id, o); setAssignFor(null); }} />}
      {reclassFor && <ReclassModal finding={reclassFor} onClose={() => setReclassFor(null)} onSave={(l, r) => { actions.reclassifyFinding(reclassFor.id, l, r); setReclassFor(null); }} />}
    </div>
  );
}

function AssignModal({ finding, onClose, onAssign }) {
  const [o, setO] = useState(OWNERS[0].id);
  return (
    <Modal title="Assign accountable owner" onClose={onClose}>
      <div className="space-y-3">
        <div className="text-xs text-slate-500">{finding.plain}</div>
        <Field label="Proposed owner" hint="The store stays operationally Unowned until this person accepts."><select value={o} onChange={(e) => setO(e.target.value)} className={inputCls}>{OWNERS.map((x) => <option key={x.id} value={x.id}>{x.name} — {x.unit}</option>)}</select></Field>
        <Button onClick={() => onAssign(o)}>Send ownership request</Button>
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
        <Note tone="amber">The prior classification is superseded, not deleted. Model version {finding.modelVersion} and your identity are recorded. If the finding was in remediation it returns to Under Review.</Note>
        <Field label="New label"><select value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls}>{["Public", "Internal", "Confidential", "Restricted"].map((l) => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Reason (required)"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. Records confirmed de-identified under expert determination" /></Field>
        <Button disabled={!reason.trim() || label === finding.label} onClick={() => onSave(label, reason.trim())}>Reclassify</Button>
      </div>
    </Modal>
  );
}
