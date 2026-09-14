import { useState } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Panel, Button, Badge, Th, Note } from "../ui.jsx";

export default function EvidencePage({ store, persona }) {
  const { evidence, actions } = store;
  const [check, setCheck] = useState(null);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <div className="text-xs text-slate-500">Written → Chained → Verified → Exported. Entries cannot be edited or deleted. Each hash is SHA-256 over the entry and the previous hash.</div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={async () => setCheck(await actions.verifyChain())}>Verify chain integrity</Button>
          {!persona.readOnly && <Button onClick={() => actions.exportEvidencePack("Evidence Center export · full chain")}>Export evidence pack</Button>}
        </div>
      </div>
      {check && (check.ok
        ? <Note tone="green"><span className="flex items-center gap-1"><ShieldCheck size={12} /> Chain verified: {check.length} events, every hash recomputed and matched.</span></Note>
        : <Note tone="red"><span className="flex items-center gap-1"><ShieldAlert size={12} /> Chain broken at {check.at}.</span></Note>)}
      <Panel title="Evidence Center — append-only, hash-chained event log">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr><Th>Event</Th><Th>When</Th><Th>Actor</Th><Th>Object</Th><Th>Result</Th><Th>Hash</Th><Th>Prev</Th></tr></thead>
            <tbody>{evidence.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="py-2 pr-3">{e.event}</td>
                <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{e.ts}</td>
                <td className="py-2 pr-3 text-slate-500">{e.actor}</td>
                <td className="py-2 pr-3 text-slate-500">{e.object}</td>
                <td className="py-2 pr-3"><Badge tone={/fail|broken|revoked/i.test(e.result) ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}>{e.result}</Badge></td>
                <td className="py-2 pr-3 text-slate-400 font-mono text-[11px]" title={e.hash}>{e.hash ? `${e.hash.slice(0, 8)}…${e.hash.slice(-4)}` : "…"}</td>
                <td className="py-2 text-slate-300 font-mono text-[11px]" title={e.prevHash}>{e.prevHash === "genesis" ? "genesis" : e.prevHash ? `${e.prevHash.slice(0, 8)}…` : ""}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
