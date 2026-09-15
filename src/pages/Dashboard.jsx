import { Panel, MetricCard, EmptyState, Button, Badge, Note, Th } from "../ui.jsx";
import { useState } from "react";
import { STATE_TONE, PRIORITY_TONE } from "../data.js";
import { slaClocks, escalationStatus, fmtDuration } from "../decision.js";
import { TaskDetail } from "../components/TaskOps.jsx";
import { ownerName } from "../store.js";
const ESC_TONE = { "On Track": "bg-emerald-50 text-emerald-700", "At Risk": "bg-amber-50 text-amber-800", "Escalated": "bg-orange-50 text-orange-800", "SLA Breached": "bg-red-50 text-red-700" };

export default function DashboardPage({ store, persona }) {
  const { sources, findings, exceptions, tasks, verifiedClosedRate, unownedRestricted, avgCoverage, openGaps, slaAdherence, activeExceptions, actions, now } = store;
  const [openId, setOpenId] = useState(null);
  const critical = tasks.map((t) => ({ t, f: findings.find((x) => x.id === t.findingId) })).filter(({ t, f }) => f && !["Verified Closed", "Cancelled"].includes(t.state) && (t.priority === "P0" || (t.escalations || []).length > 0 || t.lastVerification?.result === "Failed"));
  const opened = openId && critical.find(({ t }) => t.id === openId);
  if (opened) return <TaskDetail task={opened.t} finding={opened.f} source={sources.find((x) => x.id === opened.f.sourceId)} decision={store.decisionFor(opened.f, opened.t.priority)} store={store} persona={persona} readOnly onBack={() => setOpenId(null)} />;
  const labels = ["Public", "Internal", "Confidential", "Restricted"];
  const live = findings.filter((f) => !["Rejected", "Superseded"].includes(f.state));
  const heat = sources.map((s) => ({ name: s.name, coverage: s.coverage, state: s.connectorState, counts: labels.map((l) => live.filter((f) => f.sourceId === s.id && f.label === l).length) }));
  const pending = exceptions.filter((e) => e.state === "Requested" && (e.tier === 2 || e.kind === "policy"));
  const openTasks = tasks.filter((t) => !["Verified Closed", "Cancelled"].includes(t.state));
  const readOnly = persona.readOnly;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Verified-Closed Rate (north star)" value={`${verifiedClosedRate}%`} sub="Owned, remediated and evidenced" tone="text-emerald-600" />
        <MetricCard label="Unowned Restricted Stores" value={unownedRestricted} sub="Unowned is itself a risk state" tone={unownedRestricted > 0 ? "text-red-600" : "text-emerald-600"} />
        <MetricCard label="Scan Coverage" value={`${avgCoverage}%`} sub={openGaps ? `${openGaps} open coverage gap${openGaps > 1 ? "s" : ""}` : "No open coverage gaps"} tone={openGaps ? "text-amber-600" : undefined} />
        <MetricCard label="Tier-2 Approvals Pending" value={pending.length} sub="Require POL + ASR-A" tone={pending.length > 0 ? "text-amber-600" : "text-emerald-600"} />
      </div>

      <Panel title={`P0 findings, escalations, SLA breaches and verification failures (${critical.length})`} subtitle="Assurance view. High-risk unresolved issues with who is accountable, whether they accepted, and where the clocks stand.">
        {critical.length === 0 ? <EmptyState text="No P0, escalated or failed-verification tasks open." /> : (
          <table className="w-full text-xs"><thead><tr className="text-left text-slate-400"><th className="py-2 pr-3 font-medium">Priority</th><th className="py-2 pr-3 font-medium">Finding</th><th className="py-2 pr-3 font-medium">State</th><th className="py-2 pr-3 font-medium">Accountable</th><th className="py-2 pr-3 font-medium">Escalation</th><th className="py-2 pr-3 font-medium">Next clock</th><th></th></tr></thead>
            <tbody>{critical.map(({ t, f }) => { const esc = escalationStatus(t, now); const live = (slaClocks(t, now) || []).filter((c) => c.remaining !== undefined).sort((a, b) => a.remaining - b.remaining)[0]; return (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="py-2 pr-3"><Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge></td>
                <td className="py-2 pr-3"><div className="font-medium">{f.title || f.dataType}</div><div className="text-slate-400">{sources.find((x) => x.id === f.sourceId)?.name}</div></td>
                <td className="py-2 pr-3"><Badge tone={STATE_TONE[t.state]}>{t.state}</Badge>{t.lastVerification?.result === "Failed" && <div className="text-[10px] text-red-700">verification failed</div>}</td>
                <td className="py-2 pr-3">{f.ownerId ? ownerName(f.ownerId) : f.ownership === "Assigned" ? `proposed ${ownerName(f.proposedOwnerId)}` : "Unowned"}<div className="text-[10px] text-slate-400">{f.ownership === "Assigned" ? "Awaiting Acceptance" : f.ownership}</div></td>
                <td className="py-2 pr-3">{t.createdAt ? <><Badge tone={ESC_TONE[esc.status]}>{esc.status}</Badge>{t.escalations?.length > 0 && <div className="text-[10px] text-red-700">→ {t.escalations.map((e) => e.to).join(", ")}</div>}</> : <span className="text-slate-300">—</span>}</td>
                <td className="py-2 pr-3 font-mono">{live ? <span className={live.remaining < 0 ? "text-red-600" : ""}>{live.label} {fmtDuration(live.remaining)}</span> : "—"}</td>
                <td className="py-2"><Button small variant="ghost" onClick={() => setOpenId(t.id)}>Open</Button></td>
              </tr>
            ); })}</tbody></table>
        )}
      </Panel>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="1 · Coverage" subtitle="A “no findings” result is only meaningful next to coverage.">
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li className="flex justify-between"><span>Sources registered</span><b>{sources.length}</b></li>
            <li className="flex justify-between"><span>Sources scanned</span><b>{sources.filter((s) => s.status !== "Not Yet Scanned").length}</b></li>
            <li className="flex justify-between"><span>Connectors degraded</span><b className={sources.some((s) => s.connectorState === "Degraded") ? "text-red-600" : ""}>{sources.filter((s) => s.connectorState === "Degraded").length}</b></li>
            <li className="flex justify-between"><span>Historical coverage gaps (retained)</span><b>{sources.flatMap((s) => s.coverageGaps).length}</b></li>
          </ul>
        </Panel>
        <Panel title="2 · Control effectiveness" subtitle="Did the control operate, not just exist?">
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li className="flex justify-between"><span>Open remediation tasks</span><b>{openTasks.length}</b></li>
            <li className="flex justify-between"><span>Pending verification</span><b>{tasks.filter((t) => t.state === "Pending Verification").length}</b></li>
            <li className="flex justify-between"><span>Verification pass rate</span><b>{slaAdherence}%</b></li>
            <li className="flex justify-between"><span>Findings under review</span><b>{findings.filter((f) => f.state === "Under Review").length}</b></li>
          </ul>
        </Panel>
        <Panel title="3 · Exceptions" subtitle="Risk acceptance is time-bound and approved. No snooze exists.">
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li className="flex justify-between"><span>Active exceptions</span><b>{activeExceptions}</b></li>
            <li className="flex justify-between"><span>Expired (renewal required)</span><b>{exceptions.filter((e) => e.state === "Expired").length}</b></li>
            <li className="flex justify-between"><span>Revoked</span><b>{exceptions.filter((e) => e.state === "Revoked").length}</b></li>
            <li className="flex justify-between"><span>Awaiting approval</span><b>{exceptions.filter((e) => e.state === "Requested").length}</b></li>
          </ul>
        </Panel>
      </div>

      <Panel title="Sensitive-data landscape — sources × classification" subtitle="Counts of live findings. Coverage shown so gaps are never mistaken for clean stores.">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr><Th>Source</Th>{labels.map((l) => <Th key={l} className="text-center">{l}</Th>)}<Th className="text-right">Coverage</Th></tr></thead>
            <tbody>
              {heat.map((row) => (
                <tr key={row.name} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{row.name} {row.state === "Degraded" && <Badge tone={STATE_TONE.Degraded}>Degraded</Badge>}</td>
                  {row.counts.map((c, i) => (
                    <td key={i} className="py-2 text-center">
                      {c > 0 ? <span className="inline-flex items-center justify-center w-7 h-7 rounded text-white text-[11px] font-medium" style={{ backgroundColor: i === 3 ? "#B91C1C" : i === 2 ? "#C2410C" : i === 1 ? "#2F5FA3" : "#94A3B8" }}>{c}</span> : <span className="text-slate-300">—</span>}
                    </td>
                  ))}
                  <td className={`py-2 text-right ${row.coverage < 60 ? "text-red-600 font-medium" : "text-slate-500"}`}>{row.coverage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="4 · Tier-2 approval queue — CISO sign-off" subtitle="Tier-2 exceptions require POL and ASR-A. High-risk policy changes require ASR-A. The requester can never approve.">
        {pending.length === 0 ? <EmptyState text="Nothing currently requires Tier-2 approval." /> : (
          <div className="space-y-2">
            {pending.map((e) => {
              const c = actions.canApprove(e);
              return (
                <div key={e.id} className="flex items-center justify-between border border-slate-100 rounded-md px-3 py-2 gap-3">
                  <div>
                    <div className="font-medium flex items-center gap-2">{e.scope} <Badge>{e.kind === "policy" ? "Policy · high-risk" : `Tier ${e.tier}`}</Badge></div>
                    <div className="text-xs text-slate-400">Requested by {e.requestedBy.name} ({e.requestedBy.code}) — {e.reason}</div>
                    <div className="text-xs text-slate-400">Approvals: {e.approvals.length ? e.approvals.map((a) => a.code).join(", ") : "none yet"} · Required: {e.kind === "policy" ? "ASR-A" : "POL + ASR-A"}</div>
                  </div>
                  {!readOnly && <Button onClick={() => actions.approveException(e.id)} disabled={!c.ok} title={c.why}>Approve as {persona.code}</Button>}
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {readOnly && <Note tone="blue">You are viewing as an external assurance reviewer. All controls are read-only. Every action you take, including report export, is itself logged as evidence.</Note>}
    </div>
  );
}
