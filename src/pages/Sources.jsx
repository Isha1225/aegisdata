import { useState } from "react";
import { AlertTriangle, Lock, Play, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { Panel, Modal, Button, Badge, Field, inputCls, Note, Th, EmptyState, MetricCard } from "../ui.jsx";
import { STATE_TONE, SCHEDULES, OWNERS } from "../data.js";
import { ownerName } from "../store.js";

const TYPES = ["RDBMS", "Data Warehouse", "File Share", "SharePoint", "Email", "Object Storage", "SaaS", "HL7/FHIR", "DICOM/PACS"];
const ROLE_FOR_TYPE = {
  "RDBMS": "SELECT-only login on target schemas", "Data Warehouse": "Read-only warehouse role (no UNLOAD/EXPORT)",
  "File Share": "Read-only SMB/NFS service account", "SharePoint": "Graph Sites.Read.All (app-only)", "Email": "Graph Mail.Read (app-only, no send)",
  "Object Storage": "Bucket-scoped GetObject/ListBucket IAM role", "SaaS": "OAuth2 client with read scopes only",
  "HL7/FHIR": "FHIR client with system/*.read scope", "DICOM/PACS": "C-FIND/C-MOVE query AE title, no C-STORE",
};

export default function SourcesPage({ store, persona }) {
  const { sources, busy, actions } = store;
  const [wizard, setWizard] = useState(false);
  const [scanFor, setScanFor] = useState(null);
  const [detail, setDetail] = useState(null);
  const ops = persona.code === "OPS";
  const canAct = !persona.readOnly;

  const degraded = sources.filter((s) => s.connectorState === "Degraded").length;
  const expiring = sources.filter((s) => s.connectorState === "Active" && s.credentialTTL < 15).length;
  const openGaps = sources.flatMap((s) => s.coverageGaps.filter((g) => !g.to)).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Connectors active" value={sources.filter((s) => s.connectorState === "Active").length} sub={`${sources.length} registered`} />
        <MetricCard label="Degraded" value={degraded} sub="Circuit breaker open" tone={degraded ? "text-red-600" : "text-emerald-600"} />
        <MetricCard label="Credentials expiring < 15 min" value={expiring} sub="Broker-issued, short-lived" tone={expiring ? "text-amber-600" : undefined} />
        <MetricCard label="Open coverage gaps" value={openGaps} sub="Gaps persist after recovery" tone={openGaps ? "text-amber-600" : "text-emerald-600"} />
      </div>

      {ops && <Note tone="blue"><b>Operations boundary.</b> This persona sees connector health, freshness, coverage, credential status, agent state and egress. Finding content, classifications and remediation decisions are structurally unavailable here.</Note>}

      <Panel
        title="Connector health & scan management"
        subtitle="Scan-in-place agents. Egress filter permits metadata, counts, hashes and confidence only."
        action={canAct && <Button onClick={() => setWizard(true)}>+ Register data source</Button>}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr><Th>Source</Th><Th>Connector</Th><Th>Last scan</Th><Th>Schedule</Th><Th>Coverage</Th><Th>Cred. TTL</Th><Th>Agent</Th><Th>Egress</Th><Th>Owner</Th><Th></Th></tr></thead>
            <tbody>
              {sources.map((s) => {
                const running = typeof busy[s.id] === "number";
                const openGap = s.coverageGaps.find((g) => !g.to);
                return (
                  <tr key={s.id} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-3">
                      <button className="font-medium text-left hover:underline" onClick={() => setDetail(s)}>{s.name}</button>
                      <div className="text-slate-400">{s.type}</div>
                    </td>
                    <td className="py-2 pr-3"><Badge tone={STATE_TONE[s.connectorState]}>{s.connectorState}</Badge></td>
                    <td className="py-2 pr-3">
                      {running ? (
                        <div className="w-28"><div className="h-1.5 bg-slate-100 rounded"><div className="h-1.5 rounded" style={{ width: `${busy[s.id]}%`, backgroundColor: "#2F5FA3" }} /></div><div className="text-[10px] text-slate-400 mt-0.5">{s.scanMode} scan · {busy[s.id]}%</div></div>
                      ) : (<><Badge tone={STATE_TONE[s.status]}>{s.status}</Badge><div className="text-slate-400 mt-0.5">{s.lastScan} · {s.scanMode}</div></>)}
                    </td>
                    <td className="py-2 pr-3">
                      {canAct ? (
                        <select value={s.schedule} onChange={(e) => actions.setSchedule(s.id, e.target.value)} className="border border-slate-200 rounded px-1 py-0.5 text-[11px] bg-white">
                          {SCHEDULES.map((x) => <option key={x}>{x}</option>)}
                        </select>
                      ) : s.schedule}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={s.coverage < 60 ? "text-red-600 font-medium" : "text-slate-600"}>{s.coverage}%</span>
                      {openGap && <div className="text-[11px] text-red-600 mt-1 flex items-start gap-1"><AlertTriangle size={11} className="mt-0.5 shrink-0" /><span>Gap since {openGap.from}: {openGap.reason}</span></div>}
                      {!openGap && s.coverageGaps.length > 0 && <div className="text-[11px] text-slate-400 mt-1">{s.coverageGaps.length} historical gap{s.coverageGaps.length > 1 ? "s" : ""} retained</div>}
                    </td>
                    <td className="py-2 pr-3">{s.connectorState === "Registered" ? "—" : <span className={s.credentialTTL === 0 ? "text-red-600" : s.credentialTTL < 15 ? "text-amber-600" : "text-slate-600"}>{s.credentialTTL === 0 ? "Expired" : `${s.credentialTTL} min`}</span>}</td>
                    <td className="py-2 pr-3 text-slate-500">{s.agent}</td>
                    <td className="py-2 pr-3 text-slate-500 flex items-center gap-1">{s.egress !== "—" && <ShieldCheck size={11} className="text-emerald-600" />}{s.egress}</td>
                    <td className="py-2 pr-3 text-slate-500">{ownerName(s.ownerId)}</td>
                    <td className="py-2">
                      {canAct && (
                        <div className="flex flex-col gap-1 items-start">
                          {!running && s.connectorState !== "Registered" && <Button small variant="ghost" onClick={() => setScanFor(s)}><Play size={11} /> Run scan</Button>}
                          {!running && s.connectorState === "Registered" && <Button small variant="ghost" onClick={() => setScanFor(s)}><Play size={11} /> Initial full scan</Button>}
                          {s.connectorState === "Active" && <Button small variant="ghost" onClick={() => actions.rotateCredential(s.id)}><RefreshCw size={11} /> Rotate credential</Button>}
                          {s.connectorState === "Degraded" && <Button small onClick={() => actions.restoreConnector(s.id)}>Restore connector</Button>}
                          {s.connectorState === "Active" && ops && <Button small variant="ghost" onClick={() => actions.degradeConnector(s.id)} title="Demo: simulate an outage"><Zap size={11} /> Simulate outage</Button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {scanFor && <RunScanModal source={scanFor} onClose={() => setScanFor(null)} onRun={(mode, throttle) => { actions.runScan(scanFor.id, mode, throttle); setScanFor(null); }} />}
      {wizard && <OnboardingWizard onClose={() => setWizard(false)} onSubmit={(src) => { actions.addSource(src); setWizard(false); }} />}
      {detail && <SourceDetail source={sources.find((x) => x.id === detail.id) || detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function RunScanModal({ source, onClose, onRun }) {
  const [mode, setMode] = useState(source.status === "Not Yet Scanned" ? "Full" : "Incremental");
  const [throttle, setThrottle] = useState("Normal (≤5% source headroom)");
  const degraded = source.connectorState === "Degraded";
  return (
    <Modal title={`Run scan — ${source.name}`} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Scan mode" hint={mode === "Full" ? "Baseline or quarterly reconciliation. Enumerates everything, then classifies by risk-weighted sampling." : "Uses the source's native change signal (CDC, delta tokens, storage events). Falls back to hash/timestamp diff."}>
          <div className="flex gap-2">
            {["Incremental", "Full"].map((m) => <button key={m} onClick={() => setMode(m)} className={`text-xs px-3 py-1.5 rounded-md border ${mode === m ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600"}`}>{m}</button>)}
          </div>
        </Field>
        <Field label="Throttle profile" hint="Adaptive concurrency ceiling with back-off and a per-source circuit breaker.">
          <select value={throttle} onChange={(e) => setThrottle(e.target.value)} className={inputCls}>
            <option>Low (≤2% source headroom)</option><option>Normal (≤5% source headroom)</option><option>Maintenance window (burst)</option>
          </select>
        </Field>
        {degraded && <Note tone="red">Connector is Degraded. The scan will fail until the connector is restored. The run and its failure are still recorded.</Note>}
        <Button onClick={() => onRun(mode, throttle)}><Play size={12} /> Start {mode.toLowerCase()} scan</Button>
      </div>
    </Modal>
  );
}

function SourceDetail({ source, onClose }) {
  return (
    <Modal title={source.name} onClose={onClose} wide>
      <div className="grid md:grid-cols-2 gap-4 text-xs">
        <Panel title="Coverage gap history" subtitle="Restoring a connector never deletes the record of lost coverage.">
          {source.coverageGaps.length === 0 ? <EmptyState text="No coverage gaps recorded." /> : (
            <table className="w-full"><thead><tr><Th>From</Th><Th>To</Th><Th>Reason</Th><Th>Affected</Th></tr></thead>
              <tbody>{source.coverageGaps.map((g) => <tr key={g.id} className="border-t border-slate-100"><td className="py-1.5 pr-2">{g.from}</td><td className="py-1.5 pr-2">{g.to || <span className="text-red-600">Open</span>}</td><td className="py-1.5 pr-2 text-slate-500">{g.reason}</td><td className="py-1.5 text-slate-500">{g.affected}</td></tr>)}</tbody></table>
          )}
        </Panel>
        <Panel title="Scan history">
          {source.history.length === 0 ? <EmptyState text="Never scanned." /> : (
            <table className="w-full"><thead><tr><Th>When</Th><Th>Mode</Th><Th>Result</Th><Th>Objects</Th></tr></thead>
              <tbody>{source.history.map((h, i) => <tr key={i} className="border-t border-slate-100"><td className="py-1.5 pr-2">{h.ts}</td><td className="py-1.5 pr-2">{h.mode}</td><td className="py-1.5 pr-2"><Badge tone={STATE_TONE[h.result]}>{h.result}</Badge></td><td className="py-1.5 text-slate-500">{h.objects.toLocaleString()}</td></tr>)}</tbody></table>
          )}
        </Panel>
      </div>
    </Modal>
  );
}

// 4-step onboarding: details → credential broker → scope & schedule → review.
function OnboardingWizard({ onClose, onSubmit }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", type: "RDBMS", ownerId: "", broker: "HashiCorp Vault", ttl: 60, scope: "Full estate", scopeDetail: "", schedule: "Daily incremental", window: "01:00–05:00 IST" });
  const set = (k, v) => setF({ ...f, [k]: v });
  const steps = ["Source", "Credentials", "Scope & schedule", "Review"];
  const valid = [f.name.trim().length > 0, true, true, true][step];
  const healthcare = f.type === "HL7/FHIR" || f.type === "DICOM/PACS";

  return (
    <Modal title="Register data source" onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        {steps.map((s, i) => <div key={s} className={`text-[11px] px-2 py-0.5 rounded ${i === step ? "bg-blue-50 text-blue-700 font-medium" : i < step ? "text-emerald-700" : "text-slate-400"}`}>{i + 1}. {s}</div>)}
      </div>
      <div className="space-y-3">
        {step === 0 && (<>
          <Field label="Source name"><input value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls} placeholder="e.g. Regional Lab Feed" /></Field>
          <Field label="Source type" hint={healthcare ? "Healthcare-native connector: parses HL7 segments / FHIR resources / DICOM headers directly rather than treating them as opaque text." : undefined}>
            <select value={f.type} onChange={(e) => set("type", e.target.value)} className={inputCls}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </Field>
          <Field label="Proposed accountable owner" hint="Assignment does not create accountability. The owner must accept.">
            <select value={f.ownerId} onChange={(e) => set("ownerId", e.target.value)} className={inputCls}><option value="">Unowned (flagged as risk)</option>{OWNERS.map((o) => <option key={o.id} value={o.id}>{o.name} — {o.unit}</option>)}</select>
          </Field>
        </>)}
        {step === 1 && (<>
          <Note tone="blue"><div className="font-medium flex items-center gap-1 mb-1"><Lock size={12} /> Credential broker</div>AegisData never stores a long-lived secret. The agent requests a short-lived, read-only credential from your secrets manager at scan time. Static keys are disallowed and flagged if detected.</Note>
          <Field label="Secrets manager"><select value={f.broker} onChange={(e) => set("broker", e.target.value)} className={inputCls}><option>HashiCorp Vault</option><option>Azure Key Vault</option><option>AWS Secrets Manager</option></select></Field>
          <Field label="Least-privilege role (auto-derived from source type)"><input readOnly value={ROLE_FOR_TYPE[f.type]} className={`${inputCls} bg-slate-50 text-slate-600`} /></Field>
          <Field label="Token TTL (minutes)" hint="Rotated automatically; break-glass access is logged, never silent."><input type="number" min={5} max={240} value={f.ttl} onChange={(e) => set("ttl", Number(e.target.value))} className={inputCls} /></Field>
          <div className="text-xs text-emerald-700 flex items-center gap-1"><ShieldCheck size={12} /> Least-privilege check passed: no write, export or delete capability in requested role.</div>
        </>)}
        {step === 2 && (<>
          <Field label="Scan scope"><select value={f.scope} onChange={(e) => set("scope", e.target.value)} className={inputCls}><option>Full estate</option><option>Specific schema / path</option><option>Date range</option></select></Field>
          {f.scope !== "Full estate" && <Field label={f.scope === "Date range" ? "Date range" : "Schema / path filter"}><input value={f.scopeDetail} onChange={(e) => set("scopeDetail", e.target.value)} className={inputCls} placeholder={f.scope === "Date range" ? "e.g. 2023-01-01 → today" : "e.g. clinical.*, /shares/claims/**"} /></Field>}
          <Field label="Schedule" hint="An initial full scan always runs first to establish the baseline."><select value={f.schedule} onChange={(e) => set("schedule", e.target.value)} className={inputCls}>{SCHEDULES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Maintenance window for heavy scans"><input value={f.window} onChange={(e) => set("window", e.target.value)} className={inputCls} /></Field>
        </>)}
        {step === 3 && (
          <div className="text-xs space-y-1.5 text-slate-600">
            {[["Source", `${f.name} · ${f.type}`], ["Owner", f.ownerId ? ownerName(f.ownerId) : "Unowned — will appear as a risk"], ["Credential", `${f.broker} · ${ROLE_FOR_TYPE[f.type]} · TTL ${f.ttl} min`], ["Scope", f.scope + (f.scopeDetail ? ` (${f.scopeDetail})` : "")], ["Schedule", `${f.schedule} · heavy scans in ${f.window}`], ["Egress", "Metadata, counts, hashes, confidence only (hard filter)"]].map(([k, v]) => (
              <div key={k} className="flex gap-3"><span className="w-24 text-slate-400 shrink-0">{k}</span><span>{v}</span></div>
            ))}
            <Note>Registration is logged. The connector enters <b>Registered</b> until the first successful scan moves it to <b>Active</b>.</Note>
          </div>
        )}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancel" : "Back"}</Button>
          {step < 3 ? <Button disabled={!valid} onClick={() => setStep(step + 1)}>Next</Button>
            : <Button onClick={() => onSubmit({ name: f.name.trim(), type: f.type, ownerId: f.ownerId || null, schedule: f.schedule, credential: { broker: f.broker, ttl: f.ttl, role: ROLE_FOR_TYPE[f.type] }, scope: f.scope, credentialTTL: 0 })}>Register source</Button>}
        </div>
      </div>
    </Modal>
  );
}
