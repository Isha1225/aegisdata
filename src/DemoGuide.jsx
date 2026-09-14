import { X } from "lucide-react";

const STEPS = [
  ["ASR-A", "Executive Posture", "Note the Verified-Closed Rate, unowned Restricted stores, and the open coverage gap on Claims SFTP."],
  ["OPS", "Connector Health", "Show the Degraded connector and its open gap. Restore it. The gap closes but the record stays. Notice OPS never sees a finding."],
  ["ANL", "Triage Queue", "Start review on the Detected card-number finding, then Confirm. Watch the policy engine fire Restricted + External → P0 and create a task."],
  ["ANL", "Ownership assignment", "Assign Priya Menon as owner. The store stays Unowned until she accepts."],
  ["OWN", "My Tasks", "Accept ownership (SLA activates). Start work. Mark complete. It only moves to Pending Verification. Run the verification scan."],
  ["OWN", "My Tasks", "Run verification on the FHIR task that is seeded to fail. It reopens to In Progress. Attestation never closes a task."],
  ["OWN", "My Tasks", "Try Dispute label. The owner cannot reclassify. Request an exception and notice it goes to POL + ASR-A."],
  ["POL", "Approvals Inbox", "Approve the Tier-2 exception as POL. It stays Requested at 1 of 2. Switch to ASR-A to complete it. Try to approve your own request: blocked."],
  ["POL", "Policies", "Draft a rule change, Simulate against the live estate, see blast radius, then Submit. High-risk changes need ASR-A."],
  ["POL", "Compliance → Located-instance", "Search an MRN. It is hashed locally. Create an erasure task on a located store."],
  ["ASR-R", "Evidence Center", "Verify chain integrity. Every action above is a hash-chained event. Export writes its own event."],
  ["ASR-A", "Executive Posture", "The Verified-Closed Rate moved. That is the accountability loop, end to end."],
];

export default function DemoGuide({ onClose }) {
  return (
    <div className="fixed right-4 bottom-4 w-[380px] max-h-[80vh] overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg z-40 text-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
        <div className="font-semibold text-slate-800">Demo script — one finding, detection to evidence</div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
      </div>
      <ol className="p-4 space-y-3">
        {STEPS.map(([who, where, what], i) => (
          <li key={i} className="flex gap-3">
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 font-medium">{i + 1}</span>
            <div><div className="text-slate-800"><b>{who}</b> · {where}</div><div className="text-slate-500 mt-0.5">{what}</div></div>
          </li>
        ))}
      </ol>
    </div>
  );
}
