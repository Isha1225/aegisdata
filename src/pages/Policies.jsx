import { useState } from "react";
import { Panel, Button, Badge, inputCls, Note, Th, EmptyState } from "../ui.jsx";
import { LABEL_TONE, PRIORITY_TONE } from "../data.js";

export default function PoliciesPage({ store }) {
  const { taxonomy, taxonomyVersion, rules, policyVersion, sources, actions } = store;
  const [tx, setTx] = useState({ label: "", meaning: "", crosswalk: "" });
  const [draft, setDraft] = useState(null); // array of rules being edited
  const [sim, setSim] = useState(null);
  const [result, setResult] = useState(null);
  const srcName = (id) => sources.find((s) => s.id === id)?.name || id;

  const startDraft = () => { setDraft(rules.map((r) => ({ ...r }))); setSim(null); setResult(null); };
  const setRule = (i, k, v) => setDraft(draft.map((r, j) => (j === i ? { ...r, [k]: k === "slaDays" ? Number(v) : v } : r)));
  const addRule = () => setDraft([...draft, { id: `r-${Date.now().toString(36)}`, label: "Confidential", exposures: ["Limited"], ownership: null, obligation: "Review", priority: "P2", slaDays: 30 }]);
  const summary = () => {
    const changed = draft.filter((d) => { const o = rules.find((r) => r.id === d.id); return !o || o.priority !== d.priority || o.slaDays !== d.slaDays || o.obligation !== d.obligation; });
    return changed.map((d) => `${d.label}+${d.exposures ? d.exposures.join("/") : d.ownership} → ${d.obligation} ${d.priority}/${d.slaDays}d`).join("; ") || "no effective change";
  };

  return (
    <div className="space-y-6">
      <Note tone="blue"><b>Define → Simulate → Assess impact → Approve → Publish.</b> Rules are declarative OPA policies, version-controlled. A change that creates P0 obligations is high-risk and requires ASR-A approval. The author cannot approve it.</Note>

      <Panel title={`Classification taxonomy · v${taxonomyVersion}`} subtitle="Baseline labels map to regulatory categories through a configurable crosswalk. Custom taxonomies extend the baseline without forking detection logic.">
        <table className="w-full text-xs mb-3">
          <thead><tr><Th>Label</Th><Th>Meaning</Th><Th>Default handling</Th><Th>Regulatory crosswalk</Th></tr></thead>
          <tbody>{taxonomy.map((t) => (
            <tr key={t.label} className="border-t border-slate-100"><td className="py-2 pr-3"><Badge tone={LABEL_TONE[t.label] || "bg-indigo-50 text-indigo-700"}>{t.label}</Badge></td><td className="py-2 pr-3 text-slate-500">{t.meaning}</td><td className="py-2 pr-3 text-slate-500">{t.handling}</td><td className="py-2 text-slate-500">{t.crosswalk}</td></tr>
          ))}</tbody>
        </table>
        <div className="grid sm:grid-cols-4 gap-2">
          <input value={tx.label} onChange={(e) => setTx({ ...tx, label: e.target.value })} placeholder="Label, e.g. Genomic Research Data" className={inputCls} />
          <input value={tx.meaning} onChange={(e) => setTx({ ...tx, meaning: e.target.value })} placeholder="Meaning" className={inputCls} />
          <input value={tx.crosswalk} onChange={(e) => setTx({ ...tx, crosswalk: e.target.value })} placeholder="Crosswalk, e.g. DPDP sensitive" className={inputCls} />
          <Button disabled={!tx.label.trim()} onClick={() => { actions.addTaxonomy(tx.label.trim(), tx.meaning.trim(), tx.crosswalk.trim()); setTx({ label: "", meaning: "", crosswalk: "" }); }}>Add taxonomy (new version)</Button>
        </div>
      </Panel>

      <Panel title={`Policy rules · published v${policyVersion}`} subtitle="Classification + exposure + ownership → obligation, priority, SLA." action={!draft && <Button onClick={startDraft}>Draft a change</Button>}>
        <RuleTable rules={rules} />
      </Panel>

      {draft && (
        <Panel title="Draft policy change" subtitle="Edit or add rules, then simulate against the live estate before publishing." action={<Button variant="ghost" onClick={() => { setDraft(null); setSim(null); }}>Discard draft</Button>}>
          <table className="w-full text-xs mb-3">
            <thead><tr><Th>Label</Th><Th>Exposure condition</Th><Th>Ownership condition</Th><Th>Obligation</Th><Th>Priority</Th><Th>SLA days</Th></tr></thead>
            <tbody>{draft.map((r, i) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="py-1.5 pr-2"><select value={r.label} onChange={(e) => setRule(i, "label", e.target.value)} className={inputCls}>{taxonomy.map((t) => <option key={t.label}>{t.label}</option>)}</select></td>
                <td className="py-1.5 pr-2"><select value={r.exposures ? r.exposures.join("/") : "any"} onChange={(e) => setRule(i, "exposures", e.target.value === "any" ? null : e.target.value.split("/"))} className={inputCls}><option value="any">any</option><option value="Broad/External">Broad/External</option><option value="External">External</option><option value="Limited">Limited</option><option value="Limited/Broad/External">Limited/Broad/External</option></select></td>
                <td className="py-1.5 pr-2"><select value={r.ownership || "any"} onChange={(e) => setRule(i, "ownership", e.target.value === "any" ? null : e.target.value)} className={inputCls}><option value="any">any</option><option>Unowned</option></select></td>
                <td className="py-1.5 pr-2"><select value={r.obligation} onChange={(e) => setRule(i, "obligation", e.target.value)} className={inputCls}><option>Remediation</option><option>Review</option><option>Ownership assignment</option></select></td>
                <td className="py-1.5 pr-2"><select value={r.priority} onChange={(e) => setRule(i, "priority", e.target.value)} className={inputCls}><option>P0</option><option>P1</option><option>P2</option></select></td>
                <td className="py-1.5"><input type="number" min={1} value={r.slaDays} onChange={(e) => setRule(i, "slaDays", e.target.value)} className={inputCls} /></td>
              </tr>
            ))}</tbody>
          </table>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={addRule}>+ Add rule</Button>
            <Button onClick={() => { setSim(actions.simulatePolicy(draft)); setResult(null); }}>Simulate against live estate</Button>
            {sim && <Button onClick={() => setResult(actions.publishPolicy(draft, summary()))} disabled={!!result}>{sim.requiresSecondApproval ? "Submit for ASR-A approval" : "Publish policy"}</Button>}
          </div>
          {sim && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 text-xs">
                {[["Findings affected", sim.affected.length], ["New obligations", sim.newObligations], ["SLA / priority changes", sim.slaChanges], ["Exceptions invalidated", sim.invalidated], ["Stores in blast radius", sim.stores], ["Second approval", sim.requiresSecondApproval ? "Required (ASR-A)" : "Not required"]].map(([k, v]) => (
                  <div key={k} className="border border-slate-200 rounded p-2"><div className="text-slate-400">{k}</div><div className="font-semibold text-slate-800">{v}</div></div>
                ))}
              </div>
              {sim.affected.length === 0 ? <EmptyState text="No open finding changes obligation under this draft." /> : (
                <table className="w-full text-xs"><thead><tr><Th>Finding</Th><Th>Store</Th><Th>Change</Th><Th>Before</Th><Th>After</Th></tr></thead>
                  <tbody>{sim.affected.map(({ f, before, after, change }) => (
                    <tr key={f.id} className="border-t border-slate-100"><td className="py-1.5 pr-2"><Badge tone={LABEL_TONE[f.label]}>{f.label}</Badge> {f.dataType}</td><td className="py-1.5 pr-2 text-slate-500">{srcName(f.sourceId)}</td><td className="py-1.5 pr-2">{change}</td><td className="py-1.5 pr-2 text-slate-500">{before ? `${before.obligation} ${before.priority}/${before.slaDays}d` : "—"}</td><td className="py-1.5 text-slate-500">{after ? `${after.obligation} ${after.priority}/${after.slaDays}d` : "—"}</td></tr>
                  ))}</tbody></table>
              )}
              {result && <Note tone={result.queued ? "amber" : "green"}>{result.queued ? "Submitted. The change is queued in the Approvals inbox for ASR-A. It publishes automatically once approved, and open task SLAs are re-evaluated." : `Published as policy v${policyVersion}. Open task SLAs were re-evaluated and an evidence event was written.`}</Note>}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function RuleTable({ rules }) {
  return (
    <table className="w-full text-xs">
      <thead><tr><Th>Condition</Th><Th>Obligation</Th><Th>Priority</Th><Th>SLA</Th></tr></thead>
      <tbody>{rules.map((r) => (
        <tr key={r.id} className="border-t border-slate-100">
          <td className="py-2 pr-3"><Badge tone={LABEL_TONE[r.label] || "bg-indigo-50 text-indigo-700"}>{r.label}</Badge> + {r.exposures ? `${r.exposures.join(" / ")} exposure` : ""}{r.ownership ? `${r.exposures ? " + " : ""}${r.ownership}` : ""}</td>
          <td className="py-2 pr-3 text-slate-500">{r.obligation}</td>
          <td className="py-2 pr-3"><Badge tone={PRIORITY_TONE[r.priority]}>{r.priority}</Badge></td>
          <td className="py-2 text-slate-500">{r.slaDays === 2 ? "48 hours" : `${r.slaDays} days`}</td>
        </tr>
      ))}</tbody>
    </table>
  );
}
