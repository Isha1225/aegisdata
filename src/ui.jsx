import React from "react";
import { ChevronRight, X } from "lucide-react";

export const accent = "#2F5FA3";
export const navy = "#1E2A44";

export function Badge({ children, tone }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${tone || "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}

export function LayerChain({ layers }) {
  return (
    <div className="flex items-center flex-wrap gap-1">
      {layers.map((l, i) => (
        <React.Fragment key={l}>
          <span className="text-xs px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 bg-white whitespace-nowrap">{l}</span>
          {i < layers.length - 1 && <ChevronRight size={12} className="text-slate-300" />}
        </React.Fragment>
      ))}
    </div>
  );
}

export function MetricCard({ label, value, sub, tone }) {
  return (
    <div className="border border-slate-200 rounded-md p-4 bg-white">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${tone || "text-slate-900"}`}>{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

export function Panel({ title, action, children, subtitle }) {
  return (
    <div className="border border-slate-200 rounded-md bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function EmptyState({ text }) {
  return <div className="text-sm text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-md">{text}</div>;
}

export function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-md border border-slate-200 ${wide ? "max-w-3xl" : "max-w-lg"} w-full max-h-[85vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Button({ children, onClick, variant = "primary", disabled, title, small }) {
  const base = `text-xs ${small ? "px-2 py-1" : "px-3 py-1.5"} rounded-md inline-flex items-center gap-1 whitespace-nowrap`;
  const styles = variant === "primary"
    ? { backgroundColor: accent, color: "white" }
    : variant === "danger"
      ? { backgroundColor: "#B91C1C", color: "white" }
      : {};
  const cls = variant === "ghost" ? "border border-slate-200 text-slate-600 hover:bg-slate-50 bg-white" : "";
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`${base} ${cls} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`} style={styles}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      {children}
      {hint && <div className="text-[11px] text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}

export const inputCls = "w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-white";

export function Th({ children, className = "" }) {
  return <th className={`py-2 pr-3 font-medium text-left text-slate-400 ${className}`}>{children}</th>;
}

export function Note({ children, tone = "slate" }) {
  const t = { slate: "bg-slate-50 border-slate-100 text-slate-500", red: "bg-red-50 border-red-100 text-red-700", amber: "bg-amber-50 border-amber-100 text-amber-800", green: "bg-emerald-50 border-emerald-100 text-emerald-800", blue: "bg-blue-50 border-blue-100 text-blue-800" }[tone];
  return <div className={`border rounded-md p-3 text-xs ${t}`}>{children}</div>;
}
