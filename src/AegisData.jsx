import { useState } from "react";
import {
  Shield, Database, Activity, FolderKanban, ClipboardList, UserCheck, Tag, FileText, Fingerprint, Settings,
  Lock, ChevronDown, RotateCcw, BookOpen,
} from "lucide-react";
import { PERSONAS, NAV, TENANT } from "./data.js";
import { useAegisStore } from "./store.js";
import { navy } from "./ui.jsx";
import DashboardPage from "./pages/Dashboard.jsx";
import SourcesPage from "./pages/Sources.jsx";
import TriagePage from "./pages/Triage.jsx";
import TasksPage from "./pages/Tasks.jsx";
import ExceptionsPage from "./pages/Exceptions.jsx";
import PoliciesPage from "./pages/Policies.jsx";
import CompliancePage from "./pages/Compliance.jsx";
import EvidencePage from "./pages/Evidence.jsx";
import AdminPage from "./pages/Admin.jsx";
import DemoGuide from "./DemoGuide.jsx";

const ICONS = { dashboard: Activity, sources: Database, triage: FolderKanban, tasks: ClipboardList, exceptions: UserCheck, policies: Tag, compliance: FileText, evidence: Fingerprint, admin: Settings };
const PAGES = { dashboard: DashboardPage, sources: SourcesPage, triage: TriagePage, tasks: TasksPage, exceptions: ExceptionsPage, policies: PoliciesPage, compliance: CompliancePage, evidence: EvidencePage, admin: AdminPage };

export default function AegisData() {
  const [personaCode, setPersonaCode] = useState("ASR-A");
  const [page, setPage] = useState("dashboard");
  const [guide, setGuide] = useState(false);
  const persona = PERSONAS.find((p) => p.code === personaCode);
  const store = useAegisStore(persona);

  // Multi-role users must switch operating context explicitly (Appendix A.5.6).
  const switchPersona = (code) => { setPersonaCode(code); setPage(PERSONAS.find((p) => p.code === code).home); };
  const allowed = (key) => NAV.find((n) => n.key === key)?.personas.includes(personaCode);
  const Page = PAGES[page];
  const visibleNav = NAV.filter((n) => n.personas.includes(personaCode));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans text-sm">
      <aside className="w-56 shrink-0 flex flex-col" style={{ backgroundColor: navy }}>
        <div className="px-4 py-4 flex items-center gap-2 border-b border-white/10">
          <Shield size={18} color="white" />
          <span className="text-white font-serif text-base tracking-tight">AegisData</span>
        </div>
        {/* Only the pages this persona may open are rendered. Nothing is merely greyed out. */}
        <nav className="py-3">
          {visibleNav.map((n) => {
            const Icon = ICONS[n.key];
            const active = page === n.key;
            return (
              <button key={n.key} onClick={() => setPage(n.key)} className={`w-full flex items-center gap-2 px-4 py-2 text-left text-[13px] ${active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"}`}>
                <Icon size={14} />{n.label}
              </button>
            );
          })}
        </nav>
        <div className="px-4 py-3 mt-auto border-t border-white/10 text-[11px] text-slate-400 leading-relaxed">
          <Lock size={12} className="inline mr-1 -mt-0.5" />
          Raw PHI never leaves the customer's environment. Only metadata, counts, hashes and confidence signals cross the boundary.
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-slate-200 bg-white px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-slate-800 font-medium">{NAV.find((n) => n.key === page)?.label || "AegisData"}</div>
            <div className="text-[11px] text-slate-400 truncate">
              Acting as <b className="text-slate-600">{persona.user}</b> · {persona.code} · {TENANT.name} · {TENANT.region}
              {persona.readOnly && <span className="ml-2 text-blue-700">read-only</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setGuide(!guide)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1.5"><BookOpen size={12} /> Demo script</button>
            <button onClick={() => { if (confirm("Reset all demo data to the seed state?")) store.actions.resetDemo(); }} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1.5" title="Reset demo data"><RotateCcw size={12} /> Reset</button>
            <span className="text-xs text-slate-400">Switch persona</span>
            <div className="relative">
              <select value={personaCode} onChange={(e) => switchPersona(e.target.value)} className="appearance-none border border-slate-200 rounded-md pl-3 pr-8 py-1.5 text-xs font-medium text-slate-700 bg-white">
                {PERSONAS.map((p) => <option key={p.code} value={p.code}>{p.label} ({p.code})</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </header>
        <div className="px-6 py-1.5 bg-white border-b border-slate-100 flex gap-1 flex-wrap">
          {persona.permissions.map((p) => <span key={p} className="font-mono text-[10px] text-slate-500 bg-slate-50 border border-slate-100 rounded px-1.5">{p}</span>)}
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {allowed(page) ? <Page store={store} persona={persona} /> : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Lock size={24} className="mb-2" />
              <div className="text-sm">This section is not available to the {persona.label} persona.</div>
              <div className="text-xs mt-1">Authorization is evaluated on persona, resource and action. This attempt is logged.</div>
            </div>
          )}
        </main>
      </div>
      {guide && <DemoGuide onClose={() => setGuide(false)} />}
    </div>
  );
}
