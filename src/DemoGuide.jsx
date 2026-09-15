import { X } from "lucide-react";

const STEPS = [
  ["ASR-A", "Executive Posture", "Note the P0 panel: a Restricted HL7 task is already escalated because its owner never acknowledged. Note the Verified-Closed Rate."],
  ["ANL", "Triage Queue", "Click the P0 finding name to open Why P0: risk 94/100, factors, policy v1.2, regulatory scope. Start review, then Confirm classification."],
  ["ANL", "Triage Queue", "The Task Decision Engine creates the task: action, accountable, executor, four SLA targets, evidence, approval, escalation. Assign owner with reason and scope. Status: Awaiting Acceptance, store Unowned."],
  ["OWN", "My Tasks", "The red acceptance card shows Why P0, SLA, time remaining and escalation consequence. Accept ownership. The ack clock stops; the task starts."],
  ["OWN", "My P0 Task", "Read What happened / Why it matters / What must I do. Record action with containment ticked: the 30-minute clock stops. Resolution keeps running."],
  ["OWN", "My P0 Task", "Try Pause: reason, next action, review date, SLA treatment shown (P0 continues). Try Delegate: executor changes, accountability stays."],
  ["OWN", "My P0 Task", "Submit for verification. There is no Mark Complete. Run verification. On the seeded FHIR task, watch it fail and reopen to In Progress automatically."],
  ["ANL", "Escalation monitor", "Press +25 min on a task awaiting acceptance. Watch it move At Risk → SLA Breached → Escalated to ANL, then ASR-A."],
  ["POL", "Approvals Inbox", "An exception raised by the owner arrives here. POL cannot approve their own request; Tier-2 also needs ASR-A."],
  ["OPS", "Connector Health", "No findings, classifications or remediation decisions are visible. Only connector health and coverage gaps."],
  ["ASR-R", "Evidence Center", "Verify chain integrity. Every step above is a hash-chained event. The task's own timeline shows the full sequence with actors and times."],
  ["ASR-A", "Executive Posture", "The Verified-Closed Rate moved. Risk became an accountable, executed, verified and evidenced action."],
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
