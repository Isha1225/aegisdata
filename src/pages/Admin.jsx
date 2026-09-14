import { Panel, Badge, Th, Note } from "../ui.jsx";
import { PERSONAS, TENANT } from "../data.js";

export default function AdminPage({ store, persona }) {
  const ops = persona.code === "OPS";
  // OPS must not see finding details; the audit log is filtered to system/connector events.
  const log = ops ? store.auditLog.filter((a) => a.kind === "system") : store.auditLog;
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Users, personas & permissions" subtitle="RBAC gives the base persona; attribute rules decide whether an action is valid for a specific store.">
          <table className="w-full text-xs">
            <thead><tr><Th>User</Th><Th>Persona</Th><Th>Actions</Th></tr></thead>
            <tbody>{PERSONAS.map((p) => (
              <tr key={p.code} className="border-t border-slate-100 align-top">
                <td className="py-2 pr-3">{p.user}<div className="text-slate-400">{p.label}</div></td>
                <td className="py-2 pr-3"><Badge>{p.code}</Badge></td>
                <td className="py-2 text-slate-500">{p.permissions.map((x) => <span key={x} className="inline-block font-mono text-[10px] bg-slate-50 border border-slate-100 rounded px-1 mr-1 mb-1">{x}</span>)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Panel>
        <div className="space-y-4">
          <Panel title="Tenant configuration">
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex justify-between"><span>Tenant</span><b>{TENANT.name}</b></li>
              <li className="flex justify-between"><span>Management-plane region</span><b>{TENANT.region}</b></li>
              <li className="flex justify-between"><span>Deployment</span><b>{TENANT.deployment}</b></li>
              <li className="flex justify-between"><span>Identity</span><b>Keycloak · OIDC federated to tenant SSO</b></li>
              <li className="flex justify-between"><span>Encryption</span><b>AES-256 at rest · tenant-scoped keys · TLS 1.3 / mTLS</b></li>
              <li className="flex justify-between"><span>Egress filter</span><b className="text-emerald-700">Enforced (metadata only)</b></li>
              <li className="flex justify-between"><span>LLM escalation layer</span><b>Self-hosted inside customer boundary</b></li>
            </ul>
          </Panel>
          <Panel title="Separation-of-duty controls (enforced, not advisory)">
            <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
              <li>Requester ≠ Approver</li><li>Owner ≠ Classifier</li><li>Policy Author ≠ High-Risk Approver</li>
              <li>Tier-2 exceptions require POL + ASR-A</li><li>Tenant Admin cannot bypass these rules</li>
            </ul>
          </Panel>
        </div>
      </div>
      <Panel title={`Audit log — append-only${ops ? " (system events only for this persona)" : ""}`}>
        {ops && <Note tone="blue">Finding, classification and remediation events are hidden from the operations persona by design.</Note>}
        <table className="w-full text-xs mt-2">
          <thead><tr><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Object</Th></tr></thead>
          <tbody>{log.map((a) => (
            <tr key={a.id} className="border-t border-slate-100"><td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{a.ts}</td><td className="py-2 pr-3">{a.actor}</td><td className="py-2 pr-3 text-slate-600">{a.action}</td><td className="py-2 text-slate-500">{a.object}</td></tr>
          ))}</tbody>
        </table>
      </Panel>
    </div>
  );
}
