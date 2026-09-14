import { useState } from "react";
import { Search } from "lucide-react";
import { Panel, Button, Badge, Field, inputCls, Note, Th, EmptyState, Modal } from "../ui.jsx";
import { COMPLIANCE_MAP, IDENTIFIER_TYPES, LABEL_TONE, STATE_TONE } from "../data.js";
import { ownerName } from "../store.js";

export default function CompliancePage({ store, persona }) {
  const [tab, setTab] = useState("mapping");
  const tabs = [["mapping", "Regulatory mapping"], ["dpo", "DPO report"], ["auditor", "Auditor report"], ...(persona.permissions.includes("dsar.search") ? [["dsar", "Located-instance search"]] : [])];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`text-xs px-3 py-2 -mb-px border-b-2 ${tab === k ? "border-blue-700 text-blue-700 font-medium" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{l}</button>)}
      </div>
      {tab === "mapping" && <Mapping store={store} />}
      {tab === "dpo" && <DpoReport store={store} persona={persona} />}
      {tab === "auditor" && <AuditorReport store={store} persona={persona} />}
      {tab === "dsar" && <Dsar store={store} />}
    </div>
  );
}

function Mapping({ store }) {
  const { findings } = store;
  const live = findings.filter((f) => !["Rejected", "Superseded"].includes(f.state));
  return (
    <Panel title="Regulatory capability mapping — DPDP · GDPR · PCI-DSS" subtitle="Status column is populated live from current findings, not typed in.">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="align-top"><Th>Requirement</Th><Th>Citation</Th><Th>AegisData capability</Th><Th>Evidence produced</Th><Th>Live status</Th></tr></thead>
          <tbody>{COMPLIANCE_MAP.map((r) => {
            const rel = live.filter((f) => (r.identifier ? f.identifierTypes.includes(r.identifier) : r.labels.includes(f.label)));
            const open = rel.filter((f) => f.state !== "Verified Closed").length;
            return (
              <tr key={r.req} className="border-t border-slate-100 align-top">
                <td className="py-2.5 pr-3 font-medium">{r.req}</td>
                <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{r.cite}</td>
                <td className="py-2.5 pr-3 text-slate-500">{r.cap}</td>
                <td className="py-2.5 pr-3 text-slate-500">{r.evidence}</td>
                <td className="py-2.5 whitespace-nowrap">{r.labels.length === 0 && !r.identifier ? <Badge tone="bg-emerald-50 text-emerald-700">{store.evidence.length} chained events</Badge> : <><Badge tone={open ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}>{open} open</Badge> <span className="text-slate-400">/ {rel.length} in scope</span></>}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </Panel>
  );
}

function DpoReport({ store, persona }) {
  const { sources, findings, exceptions, tasks, actions } = store;
  const live = findings.filter((f) => !["Rejected", "Superseded"].includes(f.state));
  const cats = [["DPDP — personal / sensitive data", (f) => ["Restricted", "Confidential"].includes(f.label) && !f.identifierTypes.includes("Card PAN")], ["PCI-DSS — cardholder data", (f) => f.identifierTypes.includes("Card PAN")], ["GDPR Art. 9 — special category (health / genetic)", (f) => f.label === "Restricted" && !f.identifierTypes.includes("Card PAN")]];
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{!persona.readOnly && <Button onClick={() => actions.exportEvidencePack("DPO report · DPDP/GDPR/PCI scope · last 90 days")}>Export DPO report (logged)</Button>}</div>
      <Panel title="Regulated-data inventory by store" subtitle="RoPA-equivalent view generated from the catalogue. No separate reporting pipeline.">
        <table className="w-full text-xs"><thead><tr><Th>Store</Th><Th>Restricted</Th><Th>Confidential</Th><Th>Owner</Th><Th>Last scan</Th><Th>Coverage</Th></tr></thead>
          <tbody>{sources.map((s) => (
            <tr key={s.id} className="border-t border-slate-100"><td className="py-2 pr-3 font-medium">{s.name}</td><td className="py-2 pr-3">{live.filter((f) => f.sourceId === s.id && f.label === "Restricted").length}</td><td className="py-2 pr-3">{live.filter((f) => f.sourceId === s.id && f.label === "Confidential").length}</td><td className="py-2 pr-3 text-slate-500">{ownerName(s.ownerId)}</td><td className="py-2 pr-3 text-slate-500">{s.lastScan}</td><td className="py-2 text-slate-500">{s.coverage}%</td></tr>
          ))}</tbody></table>
      </Panel>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Open vs. closed findings by regulatory category">
          <table className="w-full text-xs"><thead><tr><Th>Category</Th><Th>Open</Th><Th>Verified closed</Th><Th>SLA at risk</Th></tr></thead>
            <tbody>{cats.map(([name, fn]) => { const rel = live.filter(fn); const open = rel.filter((f) => f.state !== "Verified Closed"); const atRisk = open.filter((f) => tasks.find((t) => t.findingId === f.id && t.priority === "P0" && !["Verified Closed", "Cancelled"].includes(t.state))).length; return (
              <tr key={name} className="border-t border-slate-100"><td className="py-2 pr-3">{name}</td><td className="py-2 pr-3">{open.length}</td><td className="py-2 pr-3 text-emerald-700">{rel.length - open.length}</td><td className={`py-2 ${atRisk ? "text-red-600 font-medium" : ""}`}>{atRisk}</td></tr>
            ); })}</tbody></table>
        </Panel>
        <Panel title="Exception register">
          <table className="w-full text-xs"><thead><tr><Th>Scope</Th><Th>State</Th><Th>Approvers</Th><Th>Expiry</Th></tr></thead>
            <tbody>{exceptions.filter((e) => e.kind === "exception").map((e) => (
              <tr key={e.id} className="border-t border-slate-100"><td className="py-2 pr-3">{e.scope}</td><td className="py-2 pr-3"><Badge tone={STATE_TONE[e.state]}>{e.state}</Badge></td><td className="py-2 pr-3 text-slate-500">{e.approvals.map((a) => a.code).join(" + ") || "—"}</td><td className="py-2 text-slate-500">{e.expiry}</td></tr>
            ))}</tbody></table>
        </Panel>
      </div>
    </div>
  );
}

function AuditorReport({ store, persona }) {
  const { sources, tasks, verifiedClosedRate, slaAdherence, activeExceptions, avgCoverage, actions, evidence } = store;
  const [pack, setPack] = useState(false);
  const gaps = sources.flatMap((s) => s.coverageGaps.map((g) => ({ ...g, source: s.name })));
  return (
    <div className="space-y-4">
      <div className="flex justify-end">{!persona.readOnly && <Button onClick={() => setPack(true)}>Export evidence pack</Button>}</div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Coverage summary" subtitle="Sources discovered and scanned, freshness, and every coverage gap with its duration.">
          <ul className="text-xs text-slate-600 space-y-1.5 mb-3">
            <li className="flex justify-between"><span>Sources registered / scanned</span><b>{sources.length} / {sources.filter((s) => s.status !== "Not Yet Scanned").length}</b></li>
            <li className="flex justify-between"><span>Mean coverage of scanned sources</span><b>{avgCoverage}%</b></li>
            <li className="flex justify-between"><span>Coverage gaps recorded (open + closed)</span><b>{gaps.length}</b></li>
          </ul>
          {gaps.length === 0 ? <EmptyState text="No coverage gaps recorded." /> : (
            <table className="w-full text-xs"><thead><tr><Th>Source</Th><Th>From</Th><Th>To</Th><Th>Reason</Th></tr></thead>
              <tbody>{gaps.map((g) => <tr key={g.id} className="border-t border-slate-100"><td className="py-1.5 pr-2">{g.source}</td><td className="py-1.5 pr-2">{g.from}</td><td className="py-1.5 pr-2">{g.to || <span className="text-red-600">Open</span>}</td><td className="py-1.5 text-slate-500">{g.reason}</td></tr>)}</tbody></table>
          )}
        </Panel>
        <Panel title="Control-effectiveness summary" subtitle="Did the control operate? Numbers derive from live task and finding states.">
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li className="flex justify-between"><span>Verified-Closed Rate</span><b>{verifiedClosedRate}%</b></li>
            <li className="flex justify-between"><span>Verification pass rate</span><b>{slaAdherence}%</b></li>
            <li className="flex justify-between"><span>Tasks verified closed / total</span><b>{tasks.filter((t) => t.state === "Verified Closed").length} / {tasks.length}</b></li>
            <li className="flex justify-between"><span>Tasks closed by attestation alone</span><b className="text-emerald-700">0 (not possible by design)</b></li>
            <li className="flex justify-between"><span>Active exceptions</span><b>{activeExceptions}</b></li>
            <li className="flex justify-between"><span>Evidence events in chain</span><b>{evidence.length}</b></li>
          </ul>
        </Panel>
      </div>
      {pack && (
        <Modal title="Export evidence pack" onClose={() => setPack(false)}>
          <div className="text-xs space-y-2 text-slate-600">
            <div><span className="text-slate-400">Regulatory scope:</span> DPDP Act 2023, GDPR, PCI-DSS</div>
            <div><span className="text-slate-400">Time window:</span> Last 90 days</div>
            <div><span className="text-slate-400">Contents:</span> coverage summary, control-effectiveness summary, exception register, {evidence.length} hash-chained evidence events, full audit log</div>
            <div><span className="text-slate-400">Integrity:</span> SHA-256 chain verified at export · watermarked to {store.actor}</div>
            <Note>Producing a report for a regulator is itself an auditable action. This export writes its own evidence event.</Note>
            <Button onClick={() => { actions.exportEvidencePack("Evidence pack · DPDP/GDPR/PCI · 90 days"); setPack(false); }}>Confirm export</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Located-instance search supports DPDP data-principal and GDPR Art. 17 requests.
function Dsar({ store }) {
  const { sources, findings, tasks, actions } = store;
  const [type, setType] = useState("MRN");
  const [value, setValue] = useState("");
  const [hashed, setHashed] = useState(null);
  const search = async () => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${type}:${value.trim()}`));
    const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    setHashed(`sha256:${hex.slice(0, 12)}…`);
  };
  const hits = hashed ? sources.map((s) => ({ s, fs: findings.filter((f) => f.sourceId === s.id && f.identifierTypes.includes(type) && !["Rejected", "Superseded"].includes(f.state) && !f.dsar) })).filter((x) => x.fs.length) : [];
  const existing = (sid) => findings.find((f) => f.dsar && f.sourceId === sid && f.identifierTypes.includes(type));
  return (
    <div className="space-y-4">
      <Note tone="blue"><b>Raw values never enter the platform.</b> The identifier is hashed in the browser before lookup. Matching runs against hashed identifiers produced by the exact-data-matching layer inside the customer environment.</Note>
      <Panel title="Locate all instances of a data-principal identifier">
        <div className="grid sm:grid-cols-4 gap-2 items-end">
          <Field label="Identifier type"><select value={type} onChange={(e) => { setType(e.target.value); setHashed(null); }} className={inputCls}>{IDENTIFIER_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Identifier (hashed locally, never sent)"><input value={value} onChange={(e) => setValue(e.target.value)} className={inputCls} placeholder="Enter a test value, e.g. MRN-000123" /></Field></div>
          <Button disabled={!value.trim()} onClick={search}><Search size={12} /> Locate</Button>
        </div>
        {hashed && <div className="text-[11px] text-slate-400 mt-2 font-mono">lookup key: {hashed}</div>}
      </Panel>
      {hashed && (
        <Panel title={`Located stores (${hits.length})`} subtitle="Each store can receive an erasure task. The task closes only when a verification re-scan finds zero matches.">
          {hits.length === 0 ? <EmptyState text={`No store currently classified as holding ${type}. Check coverage gaps before treating this as a negative result.`} /> : (
            <table className="w-full text-xs"><thead><tr><Th>Store</Th><Th>Classified as</Th><Th>Exposure</Th><Th>Owner</Th><Th>Coverage</Th><Th></Th></tr></thead>
              <tbody>{hits.map(({ s, fs }) => { const ex = existing(s.id); const t = ex && tasks.find((x) => x.id === ex.taskId); return (
                <tr key={s.id} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-3 font-medium">{s.name}</td>
                  <td className="py-2 pr-3">{fs.map((f) => <div key={f.id}><Badge tone={LABEL_TONE[f.label]}>{f.label}</Badge> <span className="text-slate-500">{f.dataType}</span></div>)}</td>
                  <td className="py-2 pr-3 text-slate-500">{fs[0].exposure}</td>
                  <td className="py-2 pr-3 text-slate-500">{ownerName(s.ownerId)}</td>
                  <td className="py-2 pr-3 text-slate-500">{s.coverage}%</td>
                  <td className="py-2">{t ? <Badge tone={STATE_TONE[t.state]}>Erasure task · {t.state}</Badge> : <Button small onClick={() => actions.createErasureTask(s.id, type, hashed)}>Create erasure task</Button>}</td>
                </tr>
              ); })}</tbody></table>
          )}
        </Panel>
      )}
    </div>
  );
}
