import { useState } from "react";
import { ShieldAlert, ChevronRight } from "lucide-react";
import { Badge, Button, EmptyState, Note, Panel } from "../ui.jsx";
import { STATE_TONE, LABEL_TONE, PRIORITY_TONE } from "../data.js";
import { slaClocks, escalationStatus, fmtDuration } from "../decision.js";
import { ownerName } from "../store.js";
import { TaskDetail } from "../components/TaskOps.jsx";

const ESC_TONE = { "On Track": "bg-emerald-50 text-emerald-700", "At Risk": "bg-amber-50 text-amber-800", "Escalated": "bg-orange-50 text-orange-800", "SLA Breached": "bg-red-50 text-red-700" };

export default function TasksPage({ store, persona }) {
  const { tasks, findings, sources, now, actions } = store;
  const me = persona.ownerId;
  const [openId, setOpenId] = useState(null);

  const mine = tasks.map((t) => ({ t, f: findings.find((x) => x.id === t.findingId) })).filter(({ f }) => f && (f.ownerId === me || f.proposedOwnerId === me || f.delegateId === me));
  const order = { "Verification Failed": 0, "Pending Verification": 1, "In Progress": 2, "Open": 3, "Paused": 4, "Verified Closed": 5, "Cancelled": 6 };
  const pOrder = { P0: 0, P1: 1, P2: 2 };
  mine.sort((a, b) => (pOrder[a.t.priority] - pOrder[b.t.priority]) || (order[a.t.state] - order[b.t.state]));
  const srcOf = (f) => sources.find((s) => s.id === f.sourceId);
  const awaiting = mine.filter(({ f }) => f.ownership === "Assigned" && f.proposedOwnerId === me);

  const open = openId && mine.find(({ t }) => t.id === openId);
  if (open) {
    return <TaskDetail task={open.t} finding={open.f} source={srcOf(open.f)} decision={store.decisionFor(open.f, open.t.priority)} store={store} persona={persona} onBack={() => setOpenId(null)} />;
  }

  return (
    <div className="space-y-4">
      <Note tone="blue"><b>What must I do?</b> Only tasks where you are the accountable, proposed or delegated owner appear here. You can dispute a classification but never change it. Submitting evidence never closes a task. Independent verification does.</Note>

      {awaiting.length > 0 && (
        <div className="space-y-2">
          {awaiting.map(({ t, f }) => {
            const d = store.decisionFor(f, t.priority); const ack = slaClocks(t, now)?.find((c) => c.key === "ack");
            return (
              <button key={t.id} onClick={() => setOpenId(t.id)} className="w-full text-left border-2 border-red-300 bg-red-50 rounded-md p-4 hover:bg-red-100/60">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2"><ShieldAlert size={16} className="text-red-700" /><span className="text-sm font-semibold text-red-900">{t.priority} {d.policy.severity} finding requires your acceptance</span><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></div>
                  <span className="text-xs text-red-800 font-mono">{ack?.remaining !== undefined ? `ack ${fmtDuration(ack.remaining)} · ${ack.status}` : ""}</span>
                </div>
                <div className="text-xs text-slate-700 mt-1">{f.title || f.dataType} · {srcOf(f)?.name} · risk {d.risk.score}/100 · {d.policy.action}</div>
                <div className="text-[11px] text-slate-500 mt-1">Proposed owner: {ownerName(f.proposedOwnerId)} · Accountability status: Awaiting Acceptance · Store status: Unowned. Open to review why this is {t.priority} and accept or reject.</div>
              </button>
            );
          })}
        </div>
      )}

      {mine.length === 0 ? <EmptyState text="No tasks assigned to you." /> : (
        <Panel title={`My tasks (${mine.length})`} subtitle="Sorted by priority, then state. Click a task for the full decision, SLA clocks, escalation and evidence timeline.">
          <div className="divide-y divide-slate-100">
            {mine.map(({ t, f }) => {
              const clocks = slaClocks(t, now); const esc = escalationStatus(t, now);
              const live = clocks?.filter((c) => c.remaining !== undefined) || [];
              const nextClock = live.sort((a, b) => a.remaining - b.remaining)[0];
              return (
                <button key={t.id} onClick={() => setOpenId(t.id)} className="w-full text-left py-3 flex items-start justify-between gap-4 hover:bg-slate-50 px-1 rounded">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                      <Badge tone={LABEL_TONE[f.label]}>{f.label}</Badge>
                      <Badge tone={STATE_TONE[t.state]}>{t.state}</Badge>
                      <Badge tone={STATE_TONE[f.ownership]}>{f.ownership === "Assigned" ? "Awaiting Acceptance" : f.ownership}</Badge>
                      {clocks && !["Verified Closed", "Cancelled"].includes(t.state) && <Badge tone={ESC_TONE[esc.status]}>{esc.status}</Badge>}
                      {f.dispute && !f.dispute.outcome && <Badge tone="bg-amber-50 text-amber-700">Dispute open</Badge>}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{f.title || f.plain}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{srcOf(f)?.name} · {t.action}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Accountable: {f.ownerId ? ownerName(f.ownerId) : f.ownership === "Assigned" ? `proposed ${ownerName(f.proposedOwnerId)} (not yet accountable)` : "Unowned"}{f.delegateId ? ` · Executor: ${ownerName(f.delegateId)}` : ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {nextClock && !["Verified Closed", "Cancelled"].includes(t.state) ? (<><div className="text-[10px] text-slate-400">{nextClock.label}</div><div className={`font-mono text-sm font-semibold ${nextClock.remaining < 0 ? "text-red-600" : nextClock.status === "At Risk" ? "text-amber-700" : "text-slate-800"}`}>{fmtDuration(nextClock.remaining)}</div></>) : <div className="text-xs text-slate-400">{t.state === "Verified Closed" ? "Verified & evidenced" : t.due}</div>}
                    <ChevronRight size={14} className="text-slate-300 inline mt-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>
      )}
      <div className="text-[11px] text-slate-400">Demo clock: <Button small variant="ghost" onClick={() => actions.advanceClock(5)}>+5 min</Button> <Button small variant="ghost" onClick={() => actions.advanceClock(25)}>+25 min</Button> advances every SLA clock so escalation can be shown live.</div>
    </div>
  );
}
