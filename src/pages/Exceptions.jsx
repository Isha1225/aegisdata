import { useState } from "react";
import { Panel, Button, Badge, EmptyState, Modal, Field, inputCls, Note } from "../ui.jsx";
import { STATE_TONE } from "../data.js";

export default function ExceptionsPage({ store, persona }) {
  const { exceptions, actions } = store;
  const [revoke, setRevoke] = useState(null);
  const [reason, setReason] = useState("");
  const inbox = exceptions.filter((e) => e.state === "Requested");
  const register = exceptions.filter((e) => e.state !== "Requested");
  const canManage = ["POL", "ASR-A"].includes(persona.code);

  const Row = ({ e }) => {
    const c = actions.canApprove(e);
    const required = e.kind === "policy" ? ["ASR-A"] : e.tier === 2 ? ["POL", "ASR-A"] : ["POL"];
    return (
      <div className="flex items-start justify-between border border-slate-100 rounded-md px-3 py-2.5 gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="font-medium text-sm">{e.scope}</span>
            <Badge tone={STATE_TONE[e.state]}>{e.state}</Badge>
            <Badge>{e.kind === "policy" ? "Policy change" : `Tier ${e.tier}`}</Badge>
          </div>
          <div className="text-xs text-slate-500">{e.reason}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Requested by {e.requestedBy.name} ({e.requestedBy.code}) · {e.created} · expiry {e.expiry}
            {e.approvals.length > 0 && <> · approved by {e.approvals.map((a) => `${a.by} (${a.code})`).join(", ")}</>}
            {e.state === "Requested" && <> · required: {required.join(" + ")} ({e.approvals.length}/{required.length})</>}
            {e.revokeReason && <> · revoked: {e.revokeReason}</>}
          </div>
        </div>
        <div className="flex flex-col gap-1.5 items-end shrink-0">
          {e.state === "Requested" && <Button onClick={() => actions.approveException(e.id)} disabled={!c.ok} title={c.why}>Approve as {persona.code}</Button>}
          {e.state === "Requested" && !c.ok && <div className="text-[10px] text-slate-400 max-w-[180px] text-right">{c.why}</div>}
          {e.state === "Approved" && e.kind !== "policy" && canManage && <Button variant="ghost" onClick={() => actions.activateException(e.id)}>Activate</Button>}
          {e.state === "Active" && canManage && <Button variant="ghost" onClick={() => setRevoke(e)}>Revoke</Button>}
          {e.state === "Expired" && <span className="text-xs text-slate-400">New request required — no silent renewal</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Note tone="blue"><b>What requires my authority?</b> Separation of duties is enforced: Requester ≠ Approver, Policy Author ≠ High-Risk Approver, Tier-2 needs POL + ASR-A. Tenant Admin cannot bypass these rules.</Note>
      <Panel title={`Approvals inbox (${inbox.length})`}>
        {inbox.length === 0 ? <EmptyState text="Nothing awaiting your approval." /> : <div className="space-y-2">{inbox.map((e) => <Row key={e.id} e={e} />)}</div>}
      </Panel>
      <Panel title="Exception register" subtitle="Approved → Active → Expired / Revoked. Every record keeps scope, reason, approvers, creation time and expiry.">
        <div className="space-y-2">{register.map((e) => <Row key={e.id} e={e} />)}</div>
      </Panel>
      {revoke && (
        <Modal title="Revoke exception" onClose={() => setRevoke(null)}>
          <div className="space-y-3">
            <div className="text-xs text-slate-500">{revoke.scope}</div>
            <Field label="Reason"><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="e.g. Compensating control removed" /></Field>
            <Button variant="danger" disabled={!reason.trim()} onClick={() => { actions.revokeException(revoke.id, reason.trim()); setRevoke(null); setReason(""); }}>Revoke</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
