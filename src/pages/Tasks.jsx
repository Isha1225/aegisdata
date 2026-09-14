import { useState } from "react";
import { CheckCircle2, RefreshCw, XCircle, Users, MapPin, Eye, Clock } from "lucide-react";
import { Badge, Button, EmptyState, Modal, Field, inputCls, Note } from "../ui.jsx";
import { STATE_TONE, LABEL_TONE, OWNERS, PRIORITY_TONE } from "../data.js";
import { ownerName } from "../store.js";

export default function TasksPage({ store, persona }) {
  const { tasks, findings, sources, busy, actions } = store;
  const me = persona.ownerId;
  const [modal, setModal] = useState(null); // {type, task, finding}

  const mine = tasks.map((t) => ({ t, f: findings.find((x) => x.id === t.findingId) })).filter(({ f }) => f && (f.ownerId === me || f.proposedOwnerId === me || f.delegateId === me));
  const order = { "Verification Failed": 0, "Pending Verification": 1, "In Progress": 2, "Open": 3, "Paused": 4, "Verified Closed": 5, "Cancelled": 6 };
  mine.sort((a, b) => order[a.t.state] - order[b.t.state]);
  const srcName = (id) => sources.find((s) => s.id === id)?.name || id;

  return (
    <div className="space-y-3">
      <Note tone="blue"><b>What must I do?</b> Only tasks where you are the accountable, proposed or delegated owner appear here. You can dispute a classification but never change it. Marking a task complete never closes it. An independent verification scan does.</Note>
      {mine.length === 0 ? <EmptyState text="No tasks assigned to you." /> : mine.map(({ t, f }) => {
        const verifying = busy[t.id] === "verify";
        const proposedToMe = f.ownership === "Assigned" && f.proposedOwnerId === me;
        const active = ["Accepted", "Delegated"].includes(f.ownership);
        return (
          <div key={t.id} className="border border-slate-200 rounded-md bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge tone={LABEL_TONE[f.label]}>{f.label}</Badge>
                  <Badge tone={STATE_TONE[t.state]}>{t.state}</Badge>
                  <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  <Badge>{t.type}</Badge>
                  <Badge tone={STATE_TONE[f.ownership]}>{f.ownership}</Badge>
                  {f.dispute && !f.dispute.outcome && <Badge tone="bg-amber-50 text-amber-700">Dispute open</Badge>}
                  {f.dispute?.outcome && <Badge tone="bg-slate-100 text-slate-600">Dispute: {f.dispute.outcome}</Badge>}
                </div>
                <div className="text-sm font-medium text-slate-800">{f.plain}</div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 mt-2">
                  <div className="flex items-center gap-1"><MapPin size={11} /> {srcName(f.sourceId)}</div>
                  <div className="flex items-center gap-1"><Eye size={11} /> Access exposure: <b className={["Broad", "External"].includes(f.exposure) ? "text-red-600" : ""}>{f.exposure}</b></div>
                  <div className="flex items-center gap-1"><Clock size={11} /> Due {t.due} · SLA {t.sla}{t.slaChangedBy && <span className="text-amber-700"> (changed by {t.slaChangedBy})</span>}</div>
                  <div className="flex items-center gap-1"><Users size={11} /> Accountable: {f.ownerId ? ownerName(f.ownerId) : proposedToMe ? "you (pending acceptance)" : "Unowned"}{f.delegateId && ` · Executing: ${ownerName(f.delegateId)}`}</div>
                </div>
                <div className="text-xs mt-2 border-l-2 border-slate-200 pl-2 text-slate-600"><span className="text-slate-400">Recommended remediation:</span> {t.action}</div>
                <div className="text-[11px] text-slate-400 mt-1">Why it matters: {f.label === "Restricted" ? "Regulated data (PHI / payment / genetic). Exposure creates breach-notification and DPDP liability." : "Personal data with confidentiality obligations under DPDP / GDPR."} Evidence required: verification re-scan showing zero exposed matches.</div>
                {t.pause && t.state === "Paused" && <div className="text-[11px] text-violet-700 mt-1">Paused: {t.pause.reason} · next review {t.pause.nextReview} · original SLA retained</div>}
                {t.state === "Verification Failed" && <div className="text-[11px] text-red-600 mt-1 flex items-center gap-1"><XCircle size={11} /> {t.failReason}</div>}
                {t.state === "Cancelled" && <div className="text-[11px] text-slate-500 mt-1">Cancelled: {t.cancelReason}</div>}
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {proposedToMe && (<>
                  <Button onClick={() => actions.acceptOwnership(f.id)}>Accept ownership</Button>
                  <Button variant="ghost" onClick={() => setModal({ type: "decline", t, f })}>Decline</Button>
                </>)}
                {active && t.state === "Open" && <Button onClick={() => actions.startTask(t.id)}>Start work</Button>}
                {active && t.state === "In Progress" && (<>
                  <Button onClick={() => actions.completeTask(t.id)}>Mark complete</Button>
                  <Button variant="ghost" onClick={() => setModal({ type: "pause", t, f })}>Pause</Button>
                </>)}
                {active && t.state === "Paused" && <Button onClick={() => actions.resumeTask(t.id)}>Resume</Button>}
                {t.state === "Pending Verification" && (
                  <Button onClick={() => actions.runVerification(t.id)} disabled={verifying}>{verifying ? <><RefreshCw size={11} className="animate-spin" /> Verifying…</> : "Run verification scan"}</Button>
                )}
                {t.state === "Verification Failed" && <Button variant="ghost" onClick={() => actions.reopenTask(t.id)}>Reopen → In Progress</Button>}
                {t.state === "Verified Closed" && <div className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Verified & evidenced</div>}
                {active && !["Verified Closed", "Cancelled"].includes(t.state) && (
                  <div className="flex gap-1 pt-1 border-t border-slate-100 mt-1">
                    {f.ownership === "Accepted" && <Button small variant="ghost" onClick={() => setModal({ type: "delegate", t, f })}>Delegate</Button>}
                    {!(f.dispute && !f.dispute.outcome) && <Button small variant="ghost" onClick={() => setModal({ type: "dispute", t, f })}>Dispute label</Button>}
                    <Button small variant="ghost" onClick={() => setModal({ type: "exception", t, f })}>Request exception</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {modal && <TaskModal modal={modal} onClose={() => setModal(null)} actions={actions} me={me} />}
    </div>
  );
}

function TaskModal({ modal, onClose, actions, me }) {
  const { type, t, f } = modal;
  const [text, setText] = useState("");
  const [extra, setExtra] = useState(type === "delegate" ? OWNERS.find((o) => o.id !== me)?.id : type === "exception" ? "30" : "In 7 days");
  const go = (fn) => { fn(); onClose(); };
  if (type === "pause") return (
    <Modal title="Pause task" onClose={onClose}><div className="space-y-3">
      <Note tone="amber">A pause needs a documented reason and a next-action date. The finding stays visible, the task stays open, and the original SLA is retained for audit.</Note>
      <Field label="Reason"><input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder="e.g. Waiting for change-window approval from clinical ops" /></Field>
      <Field label="Expected next action / review"><input value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls} /></Field>
      <Button disabled={!text.trim()} onClick={() => go(() => actions.pauseTask(t.id, text.trim(), extra))}>Pause task</Button>
    </div></Modal>
  );
  if (type === "dispute") return (
    <Modal title="Dispute classification" onClose={onClose}><div className="space-y-3">
      <Note tone="amber"><b>Owner ≠ Classifier.</b> You cannot change the label. Your dispute goes to the analyst queue for adjudication. The task remains open meanwhile.</Note>
      <Field label="Why do you believe the label is wrong?"><input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder="e.g. This extract is de-identified under expert determination dated …" /></Field>
      <Button disabled={!text.trim()} onClick={() => go(() => actions.disputeClassification(f.id, text.trim()))}>Submit dispute</Button>
    </div></Modal>
  );
  if (type === "delegate") return (
    <Modal title="Delegate execution" onClose={onClose}><div className="space-y-3">
      <Note tone="blue">Delegation moves the work, not the accountability. You remain the accountable owner and the SLA remains yours.</Note>
      <Field label="Delegate to"><select value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls}>{OWNERS.filter((o) => o.id !== me).map((o) => <option key={o.id} value={o.id}>{o.name} — {o.unit}</option>)}</select></Field>
      <Button onClick={() => go(() => actions.delegateTask(f.id, extra))}>Delegate</Button>
    </div></Modal>
  );
  if (type === "decline") return (
    <Modal title="Decline ownership" onClose={onClose}><div className="space-y-3">
      <Note tone="red">If you decline, the store returns to <b>Unowned</b>, which is itself a tracked risk. Accountability does not transfer to you.</Note>
      <Field label="Reason"><input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder="e.g. This feed is operated by the Integration team" /></Field>
      <Button variant="danger" disabled={!text.trim()} onClick={() => go(() => actions.declineOwnership(f.id, text.trim()))}>Decline</Button>
    </div></Modal>
  );
  return (
    <Modal title={`Request ${f.label === "Restricted" ? "Tier-2" : "Tier-1"} exception`} onClose={onClose}><div className="space-y-3">
      <Note tone="amber">Risk acceptance is only possible through a time-bound, scoped exception. {f.label === "Restricted" ? "Restricted scope needs both POL and ASR-A approval." : "POL approval is required."} You cannot approve your own request. There is no snooze.</Note>
      <Field label="Business justification"><input value={text} onChange={(e) => setText(e.target.value)} className={inputCls} placeholder="e.g. Vendor migration completes in 30 days; compensating control: IP allow-list" /></Field>
      <Field label="Requested duration (days)"><input type="number" min={1} max={180} value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls} /></Field>
      <Button disabled={!text.trim()} onClick={() => go(() => actions.requestException(f.id, text.trim(), Number(extra)))}>Submit request</Button>
    </div></Modal>
  );
}
