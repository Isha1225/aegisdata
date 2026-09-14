const pptxgen = require("pptxgenjs");
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5

const NAVY = "1E2A44", STEEL = "2F5FA3", ICE = "EAF0FA", SLATE = "475569", MUTED = "94A3B8", LINE = "E2E8F0";
const GREEN = "059669", AMBER = "B45309", RED = "B91C1C", WHITE = "FFFFFF", INK = "111827";
const HFONT = "Cambria", BFONT = "Calibri";
const W = 13.33;

const T = (s, text, o) => s.addText(text, { fontFace: BFONT, color: INK, isTextBox: true, margin: 0, valign: "top", ...o });
const title = (s, text, sub, dark) => {
  T(s, text, { x: 0.6, y: 0.45, w: 12.1, h: 0.75, fontSize: 32, bold: true, fontFace: HFONT, color: dark ? WHITE : NAVY });
  if (sub) T(s, sub, { x: 0.6, y: 1.2, w: 12.1, h: 0.4, fontSize: 15, color: dark ? "CBD5E1" : SLATE, italic: true });
};
const footer = (s, n, dark) => T(s, `AegisData · TPM assignment · ${n}`, { x: 0.6, y: 7.05, w: 12.1, h: 0.25, fontSize: 9, color: dark ? "64748B" : MUTED });
const rect = (s, x, y, w, h, fill, o = {}) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: o.line || fill, width: o.lw ?? 0.75 }, rectRadius: o.r ?? 0.08, ...(o.shadow ? { shadow: { type: "outer", blur: 6, offset: 2, angle: 90, color: "000000", opacity: 0.12 } } : {}) });
const circle = (s, x, y, d, fill, label, color = WHITE) => {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
  T(s, label, { x, y, w: d, h: d, align: "center", valign: "middle", fontSize: d > 0.5 ? 16 : 12, bold: true, color });
};
const card = (s, x, y, w, h, head, body, o = {}) => {
  rect(s, x, y, w, h, o.fill || WHITE, { line: o.fill ? o.fill : LINE, shadow: !o.fill });
  T(s, head, { x: x + 0.2, y: y + 0.18, w: w - 0.4, h: 0.4, fontSize: o.hs || 15, bold: true, color: o.hc || NAVY });
  T(s, body, { x: x + 0.2, y: y + 0.6, w: w - 0.4, h: h - 0.75, fontSize: o.bs || 12, color: o.bc || SLATE, paraSpaceAfter: 4 });
};
const bullets = (items, o = {}) => items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, ...o } }));
const loop = (s, y, active) => {
  const steps = ["Discover", "Classify", "Contextualize", "Prioritize", "Act", "Prove"];
  const w = 1.75, gap = 0.22, x0 = (W - (steps.length * w + (steps.length - 1) * gap)) / 2;
  steps.forEach((st, i) => {
    const x = x0 + i * (w + gap), on = active === undefined || active.includes(i);
    rect(s, x, y, w, 0.5, on ? STEEL : ICE, { r: 0.25 });
    T(s, st, { x, y, w, h: 0.5, align: "center", valign: "middle", fontSize: 13, bold: true, color: on ? WHITE : MUTED });
    if (i < steps.length - 1) T(s, "›", { x: x + w, y, w: gap, h: 0.5, align: "center", valign: "middle", fontSize: 16, color: MUTED });
  });
};
const arrow = (s, x, y, w, h, o = {}) => s.addShape(pres.ShapeType.rightArrow, { x, y, w, h, fill: { color: o.fill || MUTED }, line: { color: o.fill || MUTED } });
const table = (s, rows, x, y, w, colW, o = {}) => {
  const data = rows.map((r, i) => r.map((c) => ({ text: c, options: { bold: i === 0, color: i === 0 ? WHITE : (o.bodyColor || INK), fill: { color: i === 0 ? NAVY : (i % 2 ? "F8FAFC" : WHITE) }, fontSize: o.fs || 11, fontFace: BFONT, valign: "middle", margin: 0.06 } })));
  s.addTable(data, { x, y, w, colW, border: { type: "solid", pt: 0.5, color: LINE }, rowH: o.rowH || 0.38 });
};

// 1 — Title
{
  const s = pres.addSlide(); s.background = { color: NAVY };
  T(s, "AegisData", { x: 0.8, y: 1.9, w: 11, h: 1.1, fontSize: 60, bold: true, fontFace: HFONT, color: WHITE });
  T(s, "The accountability layer for regulated healthcare data", { x: 0.8, y: 3.0, w: 11, h: 0.6, fontSize: 24, color: "CBD5E1" });
  T(s, "From “we found sensitive data” to “this is who owns it, what was done, and here is the proof.”", { x: 0.8, y: 3.7, w: 11, h: 0.5, fontSize: 16, italic: true, color: "94A3B8" });
  loop(s, 5.0);
  T(s, "Technical Product Manager assignment · Product strategy, technical solution design and working prototype", { x: 0.8, y: 6.5, w: 11.5, h: 0.4, fontSize: 12, color: "64748B" });
}

// 2 — Problem
{
  const s = pres.addSlide(); title(s, "Healthcare cannot answer four basic questions about its regulated data", "PHI, payment, genetic and minors' data is spread across EMRs, imaging, claims, labs, SaaS and legacy systems.");
  const qs = [["Where is it?", "Discovery tools exist, but coverage gaps are invisible and “no findings” is mistaken for “clean”."], ["Who can access it?", "Access intelligence lives in IAM tools that do not know which stores hold PHI."], ["Who is accountable?", "Findings land in a security queue. No named owner, no SLA, no consequence."], ["Can we prove it?", "Boards, DPOs and regulators need evidence that the control worked, not a scan report."]];
  qs.forEach(([h, b], i) => { const x = 0.6 + i * 3.1; circle(s, x, 1.95, 0.55, STEEL, String(i + 1)); card(s, x, 2.65, 2.85, 2.1, h, b); });
  rect(s, 0.6, 5.1, 12.1, 1.6, ICE, { line: ICE });
  T(s, "$2.2B → $6.2B", { x: 0.9, y: 5.25, w: 3.6, h: 0.7, fontSize: 30, bold: true, fontFace: HFONT, color: NAVY });
  T(s, "Global DSPM category, 2025 → 2033 (≈14% CAGR). Context only, not the planning number.", { x: 0.9, y: 5.95, w: 3.6, h: 0.6, fontSize: 11, color: SLATE });
  T(s, "≈ ₹225 crore (~$27M)", { x: 4.9, y: 5.25, w: 4, h: 0.7, fontSize: 30, bold: true, fontFace: HFONT, color: NAVY });
  T(s, "Bottom-up India SAM: ≈500 large health systems and health-tech BAs × ≈₹45 lakh ACV. Stated assumption, to be re-derived with design-partner data.", { x: 4.9, y: 5.95, w: 4, h: 0.7, fontSize: 11, color: SLATE });
  T(s, "Buyer: CISO. Co-buyer: DPO.", { x: 9.3, y: 5.25, w: 3.2, h: 0.5, fontSize: 16, bold: true, color: NAVY });
  T(s, "Initial ICP: large and mid-large Indian providers with hybrid estates, M&A sprawl and distributed ownership.", { x: 9.3, y: 5.75, w: 3.2, h: 0.9, fontSize: 11, color: SLATE });
  footer(s, 2);
}

// 3 — Whitespace
{
  const s = pres.addSlide(); title(s, "The whitespace is after discovery, not in it", "Discovery and classification are table stakes. The unowned workflow is what happens next.");
  T(s, "Horizontal DSPM (Purview, Varonis, BigID, OneTrust, Spirion) stops here", { x: 0.6, y: 1.85, w: 12, h: 0.35, fontSize: 13, bold: true, color: SLATE });
  ["Discover", "Classify", "Assess", "Remediate"].forEach((t, i) => { const x = 0.6 + i * 1.75; rect(s, x, 2.25, 1.55, 0.55, "CBD5E1", { r: 0.1 }); T(s, t, { x, y: 2.25, w: 1.55, h: 0.55, align: "center", valign: "middle", fontSize: 13, bold: true, color: SLATE }); });
  T(s, "AegisData continues", { x: 7.7, y: 1.85, w: 5, h: 0.35, fontSize: 13, bold: true, color: STEEL });
  ["Owner", "Decision", "Action", "Evidence"].forEach((t, i) => { const x = 7.7 + i * 1.28; rect(s, x, 2.25, 1.15, 0.55, STEEL, { r: 0.1 }); T(s, t, { x, y: 2.25, w: 1.15, h: 0.55, align: "center", valign: "middle", fontSize: 13, bold: true, color: WHITE }); });
  arrow(s, 7.6 - 0.45, 2.37, 0.4, 0.3, { fill: STEEL });
  table(s, [["Competitor", "Strength", "Implication for AegisData"], ["Microsoft Purview", "Governance, classification, DLP, DSPM", "Strong Microsoft-centric incumbent. Integrate with labels, do not fight."], ["Varonis", "Data security, access intelligence, remediation", "Closest security benchmark. Consume its access graph."], ["BigID", "Discovery, context, risk, healthcare", "Closest to our breadth. We win on the connected owner → evidence workflow."], ["OneTrust", "Privacy, governance", "Strong privacy incumbent. GRC export target, not a rival on remediation."], ["Spirion / open source", "PHI discovery primitives", "Discovery is commoditizing. Confirms the wedge must be elsewhere."]], 0.6, 3.15, 12.1, [2.3, 4.3, 5.5], { fs: 11, rowH: 0.42 });
  rect(s, 0.6, 5.95, 12.1, 0.85, ICE, { line: ICE });
  T(s, "Positioning: for CISOs and DPOs at healthcare organizations, AegisData turns discovery findings into owned decisions, tracked remediation and durable evidence. Unlike horizontal DSPM tools that stop at classification.", { x: 0.85, y: 6.05, w: 11.6, h: 0.7, fontSize: 12.5, color: NAVY, valign: "middle" });
  footer(s, 3);
}

// 4 — Differentiators
{
  const s = pres.addSlide(); title(s, "Four decisions that make it defensible", "Each is a product decision with a trade-off, and each is visible in the prototype.");
  const d = [["Accountability wedge, not discovery breadth", "Every store resolves to one accepted owner. Unowned is itself a risk. Attestation never closes a task; a verification scan does. Evidence is append-only.", "Trade-off: we integrate with Purview or BigID for raw breadth instead of out-scanning them."], ["Healthcare-native connectors", "HL7 v2 and FHIR resources are parsed as segments, not opaque text. DICOM headers are read with pydicom. These are the PHI leak points regex-only tools skip.", "Trade-off: deferred to Phase 1 until the core loop is validated with design partners."], ["Scan-in-place trust model", "Classification, including NER and the LLM layer, runs inside the customer boundary. A hard egress filter lets only metadata, counts, hashes and confidence cross.", "Trade-off: heavier agent footprint, but no raw-PHI path to defend in a security review."], ["DPDP-native evidence", "India-region management plane. Evidence packs mapped to DPDP, GDPR and PCI-DSS, integrity-verified and watermarked. Producing a report is itself a logged event.", "Trade-off: regional deployment cost up front, in exchange for a shorter BFSI and government trust conversation."]];
  d.forEach(([h, b, t], i) => { const x = 0.6 + (i % 2) * 6.15, y = 1.85 + Math.floor(i / 2) * 2.55; circle(s, x, y, 0.5, STEEL, String(i + 1)); rect(s, x + 0.7, y, 5.25, 2.3, WHITE, { line: LINE, shadow: true }); T(s, h, { x: x + 0.9, y: y + 0.15, w: 4.9, h: 0.4, fontSize: 15, bold: true, color: NAVY }); T(s, b, { x: x + 0.9, y: y + 0.6, w: 4.9, h: 1.05, fontSize: 11.5, color: SLATE }); T(s, t, { x: x + 0.9, y: y + 1.7, w: 4.9, h: 0.5, fontSize: 10.5, italic: true, color: AMBER }); });
  footer(s, 4);
}

// 5 — Personas
{
  const s = pres.addSlide(); title(s, "Five personas share one data graph. Nobody gets a dashboard with role toggles.", "Personas are accountability responsibilities, not job titles. Each lands on a surface that answers its one question.");
  table(s, [["Persona", "Code", "Primary question", "Lands on", "May never"], ["CISO / Security Director", "ASR-A", "Is the control effective and independently approved?", "Executive Posture + Tier-2 approvals", "Approve a request they raised"], ["Privacy Officer / DPO", "POL", "What requires my authority?", "Approvals Inbox, policy simulation, reports", "Approve a high-risk policy they authored"], ["Data / Application Owner", "OWN", "What must I do?", "My Tasks with plain-language remediation", "Change a classification"], ["Security Engineer / Analyst", "ANL", "What do I need to decide?", "Triage Queue ranked by risk and SLA", "Assign accountability to themselves"], ["IT Admin / Discovery Operator", "OPS", "Is the platform healthy?", "Connector Health and coverage gaps", "See finding content"], ["External Auditor", "ASR-R", "Can I prove the control worked?", "Evidence Center (read-only)", "Change anything"]], 0.6, 1.85, 12.1, [2.5, 0.8, 3.3, 3.0, 2.5], { fs: 11.5, rowH: 0.5 });
  rect(s, 0.6, 5.6, 12.1, 1.15, ICE, { line: ICE });
  T(s, "Separation of duties is enforced in code, not policy text", { x: 0.85, y: 5.7, w: 11.6, h: 0.35, fontSize: 13, bold: true, color: NAVY });
  T(s, "Requester ≠ Approver   ·   Owner ≠ Classifier   ·   Policy Author ≠ High-Risk Approver   ·   Tier-2 exceptions need POL + ASR-A   ·   Tenant Admin cannot bypass any of these", { x: 0.85, y: 6.05, w: 11.6, h: 0.6, fontSize: 12, color: SLATE });
  footer(s, 5);
}

// 6 — Live demo
{
  const s = pres.addSlide(); s.background = { color: NAVY }; title(s, "Live demo: one finding, from detection to evidence", "The Verified-Closed Rate on the CISO's screen should move by the end. Nothing in it is hardcoded.", true);
  const steps = [["OPS", "Restore a degraded connector. The coverage gap closes but the record stays."], ["ANL", "Confirm a card-number finding. The policy engine fires Restricted + External → P0 and opens a task."], ["ANL → OWN", "Assign an owner. Nothing is accountable until the owner accepts. Then SLA starts."], ["OWN", "Mark complete moves to Pending Verification only. Run the verification scan. Watch one seeded task fail and reopen."], ["OWN → POL → CISO", "Request a Tier-2 exception. POL approves: 1 of 2. CISO completes it. The requester's button is disabled."], ["Auditor", "Verify the SHA-256 chain. Every action above is an evidence event. Export writes its own."]];
  steps.forEach(([who, what], i) => { const x = 0.6 + (i % 3) * 4.1, y = 1.95 + Math.floor(i / 3) * 2.3; rect(s, x, y, 3.85, 2.05, "27365A", { line: "27365A" }); circle(s, x + 0.2, y + 0.2, 0.5, STEEL, String(i + 1)); T(s, who, { x: x + 0.85, y: y + 0.25, w: 2.8, h: 0.4, fontSize: 14, bold: true, color: "CADCFC" }); T(s, what, { x: x + 0.2, y: y + 0.85, w: 3.45, h: 1.1, fontSize: 12, color: "E2E8F0" }); });
  T(s, "Prototype: React, single browser tab, seeded fictional data, in-memory state. Six personas switchable from the top bar.", { x: 0.6, y: 6.6, w: 12, h: 0.35, fontSize: 11, italic: true, color: "94A3B8" });
  footer(s, 6, true);
}

// 7 — Architecture
{
  const s = pres.addSlide(); title(s, "Solution architecture: six planes around one spine", "Stateless connectors, scanners and classifiers scale out. The metadata catalogue is the single stateful system of record.");
  const planes = [["Connector layer", "Enumerate, fetch metadata, sample, fetch content. Per-source rate limits. Broker-issued short-lived credentials."], ["Discovery & scanning", "Full and incremental scans, adaptive sampling, throttling, shard-level checkpoints."], ["Classification engine", "Six-layer pipeline, confidence scores, model versions. Runs inside the customer boundary."], ["Policy & risk engine", "OPA rules map label + exposure + ownership to obligation, priority, SLA. Resolves owner via access graph."]];
  planes.forEach(([h, b], i) => { const x = 0.6 + i * 3.1; card(s, x, 1.85, 2.9, 1.9, h, b, { hs: 13, bs: 10.5 }); if (i < 3) arrow(s, x + 2.9, 2.6, 0.2, 0.3); });
  rect(s, 0.6, 4.0, 12.1, 1.05, STEEL, { line: STEEL });
  T(s, "Metadata catalogue & data graph — the spine", { x: 0.85, y: 4.1, w: 11.6, h: 0.35, fontSize: 15, bold: true, color: WHITE });
  T(s, "stores → owners → data → access → risk → action → evidence.  Append-only evidence log in a separate store, so a compromise of application logic cannot rewrite history.  Partitioned writes by tenant; read replicas for dashboards.", { x: 0.85, y: 4.45, w: 11.6, h: 0.55, fontSize: 11.5, color: "E2E8F0" });
  card(s, 0.6, 5.3, 5.9, 1.5, "Reporting & dashboard layer", "Persona-scoped surfaces, Evidence Center, DPO and auditor reports, evidence-pack export. Reads replicas only; nothing downstream queries a source system.", { hs: 13, bs: 10.5 });
  card(s, 6.8, 5.3, 5.9, 1.5, "Admin & security plane (cuts across all)", "Keycloak identity federated to tenant SSO. RBAC + attribute rules in the same OPA layer. Vault-brokered secrets. Tamper-evident audit log streamed to SIEM.", { hs: 13, bs: 10.5 });
  footer(s, 7);
}

// 8 — Trust boundary
{
  const s = pres.addSlide(); title(s, "Healthcare trust boundary: scan in place, metadata out", "A hard technical control, not a configuration toggle. The customer never surrenders raw PHI to see its risk.");
  rect(s, 0.6, 1.9, 6.6, 4.8, "F1F5F9", { line: "CBD5E1", lw: 1.25, r: 0.12 });
  T(s, "Customer environment", { x: 0.85, y: 2.0, w: 6, h: 0.35, fontSize: 14, bold: true, color: NAVY });
  [["EMR · CDW · PACS", 0.85, 2.55], ["HL7 / FHIR feeds", 0.85, 3.3], ["File shares · SharePoint · S3", 0.85, 4.05], ["SaaS · email", 0.85, 4.8]].forEach(([t, x, y]) => { rect(s, x, y, 2.3, 0.55, WHITE, { line: LINE }); T(s, t, { x, y, w: 2.3, h: 0.55, align: "center", valign: "middle", fontSize: 11, color: SLATE }); arrow(s, x + 2.35, y + 0.15, 0.35, 0.25); });
  rect(s, 3.65, 2.55, 3.3, 2.8, STEEL, { line: STEEL });
  T(s, "Scanner agent", { x: 3.8, y: 2.65, w: 3, h: 0.35, fontSize: 14, bold: true, color: WHITE });
  T(s, bullets(["Enumerate → sample → classify", "All 6 layers, incl. NER and self-hosted LLM", "Short-lived read-only credentials", "Circuit breaker per source", "≤5% of source IOPS/CPU headroom"], { fontSize: 11, color: "E2E8F0" }), { x: 3.8, y: 3.05, w: 3.05, h: 2.2, paraSpaceAfter: 3 });
  rect(s, 3.65, 5.5, 3.3, 0.95, RED, { line: RED });
  T(s, "Egress filter (hard control)", { x: 3.8, y: 5.55, w: 3, h: 0.3, fontSize: 12, bold: true, color: WHITE });
  T(s, "Allowed out: counts, classifications, confidence, hashed identifiers, metadata. Never: raw values.", { x: 3.8, y: 5.85, w: 3.05, h: 0.6, fontSize: 10.5, color: "FEE2E2" });
  arrow(s, 7.3, 3.7, 0.7, 0.45, { fill: STEEL });
  rect(s, 8.15, 1.9, 4.55, 4.8, ICE, { line: ICE, r: 0.12 });
  T(s, "Management plane (India region or on-prem)", { x: 8.35, y: 2.0, w: 4.2, h: 0.35, fontSize: 14, bold: true, color: NAVY });
  T(s, bullets(["Metadata catalogue and data graph", "Policy & risk engine (OPA)", "Ownership, tasks, exceptions, approvals", "Append-only evidence store", "Persona-scoped dashboards and reports", "REST API + webhooks to DLP, IAM, SIEM, ticketing"], { fontSize: 11.5, color: SLATE }), { x: 8.35, y: 2.45, w: 4.2, h: 2.6, paraSpaceAfter: 4 });
  rect(s, 8.35, 5.2, 4.15, 1.3, WHITE, { line: LINE });
  T(s, "Break-glass raw-value access", { x: 8.5, y: 5.28, w: 3.9, h: 0.3, fontSize: 12, bold: true, color: NAVY });
  T(s, "Explicitly authorized, requester ≠ approver, time-bound, minimum scope, every record logged. An architectural property, not a policy users remember.", { x: 8.5, y: 5.58, w: 3.9, h: 0.9, fontSize: 10.5, color: SLATE });
  footer(s, 8);
}

// 9 — Classification
{
  const s = pres.addSlide(); title(s, "Layered classification: cheap and deterministic first, expensive inference last", "Layers 1–4 run on everything. Only ambiguous residue escalates to NER, then to a self-hosted LLM.");
  table(s, [["Layer", "Technique", "Best for", "Trade-off"], ["1", "Regex + checksums (Luhn, ABHA, NPI, MRN formats)", "Card numbers, phone, ID formats", "Very fast, high precision; brittle to format drift"], ["2", "Dictionaries and keyword lists", "Drug names, ICD-10, clinical terms, minors' keywords", "Cheap and explainable; lists need curation"], ["3", "Fingerprinting / exact data matching", "Known record sets recurring across the estate", "Near-zero false positives; only known content"], ["4", "Document-type SVM (TF-IDF)", "Lab report vs. billing vs. consent form", "CPU-only, runs in the agent; needs a stable label set"], ["5", "NER (Presidio, spaCy + med7 / scispaCy)", "Names, diagnoses, MRNs in free text", "Handles prose; higher compute, needs tuning"], ["6", "LLM-assisted, self-hosted, escalation only", "De-identified research vs. PHI", "Best judgment; highest cost; never a shared API"]], 0.6, 1.85, 8.1, [0.6, 2.7, 2.4, 2.4], { fs: 10.5, rowH: 0.5 });
  card(s, 9.0, 1.85, 3.7, 1.75, "Human in the loop", "Every finding carries a confidence score and its contributing layers. Low-confidence or conflicting findings go to the Review Queue, never to auto-labelling. Precision beats recall for auto-applied high-impact actions.", { hs: 13, bs: 10.5 });
  card(s, 9.0, 3.75, 3.7, 1.6, "Active learning, gated", "Only analyst-adjudicated outcomes become training data. Owners may dispute but never relabel. Per-source precision and recall are surfaced to admins.", { hs: 13, bs: 10.5 });
  card(s, 9.0, 5.5, 3.7, 1.3, "Open trade-off", "In-house clinical NER vs. AWS Comprehend Medical or Google Healthcare NLP. Default is in-house to avoid a second BAA vendor in the PHI path. Flagged for design-partner validation.", { hs: 13, bs: 10, fill: ICE, hc: NAVY });
  footer(s, 9);
}

// 10 — Accountability model
{
  const s = pres.addSlide(); title(s, "The accountability model is a set of state machines, not a workflow diagram", "Every transition is attributable. No state exists for suppress or snooze anywhere in the product.");
  const sm = [["Finding", ["Detected", "Under Review", "Confirmed / Rejected", "Remediation Required", "Verified Closed"], "Superseded records stay auditable. Confirming triggers the policy engine."], ["Ownership", ["Unowned", "Assigned", "Accepted", "Delegated"], "Accountability activates only on Accepted. Delegation moves work, never accountability."], ["Task", ["Open", "In Progress", "Paused", "Pending Verification", "Verified Closed"], "Attestation cannot close. Failed verification → back to In Progress. Pause needs a reason and a date."], ["Exception", ["Requested", "Approved", "Active", "Expired / Revoked"], "Scope, reason, approver, expiry recorded. No silent renewal. Tier-2 needs POL + ASR-A."], ["Connector", ["Registered", "Active", "Degraded", "Active"], "Degradation opens a coverage gap. Recovery closes it but never deletes the record."], ["Evidence", ["Written", "Chained", "Verified", "Exported"], "SHA-256 over the entry and the previous hash. Append-only. Export is itself an event."]];
  sm.forEach(([name, states, note], i) => {
    const y = 1.85 + i * 0.82;
    T(s, name, { x: 0.6, y, w: 1.4, h: 0.5, fontSize: 13, bold: true, color: NAVY, valign: "middle" });
    let x = 2.05; const totalW = 6.4, gap = 0.18, w = (totalW - gap * (states.length - 1)) / states.length;
    states.forEach((st, j) => { const last = j === states.length - 1; rect(s, x, y + 0.05, w, 0.42, last ? GREEN : ICE, { r: 0.21 }); T(s, st, { x, y: y + 0.05, w, h: 0.42, align: "center", valign: "middle", fontSize: 9.5, bold: true, color: last ? WHITE : NAVY }); x += w + gap; });
    T(s, note, { x: 8.7, y, w: 4.0, h: 0.6, fontSize: 10.5, color: SLATE, valign: "middle" });
  });
  rect(s, 0.6, 6.75, 12.1, 0.001, LINE);
  footer(s, 10);
}

// 11 — Deployment & NFRs
{
  const s = pres.addSlide(); title(s, "Lead with hybrid-SaaS. Offer on-premises as a defined variant.", "Scan-in-place already keeps raw PHI inside the customer. Deployment model only decides where metadata lives.");
  const m = [["On-premises", "Full stack inside customer infrastructure. Government, strict BFSI, no-egress mandates.", "Nothing leaves customer control", WHITE], ["Hybrid-SaaS (recommended)", "SaaS management plane pinned to an India region. In-perimeter scan agents. Large health systems needing agility with residency.", "Metadata only; region-pinned to ap-south-1 or Central India", STEEL], ["SaaS", "Pooled management plane, agents in customer environment. Mid-market wanting time-to-value.", "Metadata only", WHITE]];
  m.forEach(([h, b, r, fill], i) => { const x = 0.6 + i * 4.1, dark = fill === STEEL; rect(s, x, 1.85, 3.9, 2.35, fill, { line: dark ? fill : LINE, shadow: !dark }); T(s, h, { x: x + 0.2, y: 2.0, w: 3.5, h: 0.4, fontSize: 15, bold: true, color: dark ? WHITE : NAVY }); T(s, b, { x: x + 0.2, y: 2.45, w: 3.5, h: 1.0, fontSize: 11.5, color: dark ? "E2E8F0" : SLATE }); T(s, "Residency: " + r, { x: x + 0.2, y: 3.55, w: 3.5, h: 0.55, fontSize: 10.5, italic: true, color: dark ? "CADCFC" : AMBER }); });
  T(s, "Why not pure SaaS: providers with material PHI estates reject any raw-data path leaving the perimeter. Why not on-prem first: it slows time-to-value and multiplies ops burden before product-market fit.", { x: 0.6, y: 4.35, w: 12.1, h: 0.5, fontSize: 11.5, italic: true, color: SLATE });
  table(s, [["Non-functional target", "Value", "How"], ["Incremental scan latency", "< 15 min p95", "Native change feeds (CDC, delta tokens, storage events)"], ["Full-scan throughput", "≥ 5,000 objects/s per node", "Metadata-first triage, enumeration decoupled from classification"], ["Dashboard latency", "< 2 s p95", "Catalogue read replicas"], ["Catalogue write availability", "99.9%", "Multi-AZ; idempotent, checkpointed jobs; per-connector circuit breakers"], ["Source impact", "≤ 5% IOPS/CPU headroom", "Adaptive throttling, maintenance windows for heavy scans"], ["Encryption / identity", "AES-256, TLS 1.3, mTLS, tenant keys", "Envelope encryption, CMK for BFSI/government, Keycloak OIDC/SAML"]], 0.6, 4.95, 12.1, [3.2, 2.9, 6.0], { fs: 10.5, rowH: 0.3 });
  footer(s, 11);
}

// 12 — Compliance
{
  const s = pres.addSlide(); title(s, "Compliance is generated from the same catalogue, not a separate pipeline", "Each requirement maps to one capability and one evidence artifact. The prototype fills the status column live.");
  table(s, [["Requirement", "Citation", "Capability", "Evidence produced"], ["Know what personal / sensitive data is held", "DPDP Act 2023", "Layered discovery across structured, unstructured, SaaS, HL7/FHIR, DICOM", "Classified inventory per store with confidence and timestamp"], ["Purpose limitation", "DPDP §5–8", "Business-context tags + taxonomy crosswalk", "Policy record linking store to purpose"], ["Erasure / correction rights", "DPDP; GDPR Art. 17", "Located-instance search on hashed identifiers → erasure task → verification re-scan", "Task record: request → stores → action → verification"], ["Records of processing", "GDPR Art. 30", "Catalogue as continuously updated system of record", "Exportable RoPA-equivalent report"], ["Security of processing", "GDPR Art. 32", "Encryption, RBAC, scan-in-place, audit logging", "NFR summary + exportable audit log"], ["Cardholder data discovery", "PCI-DSS 3, 12", "Luhn-validated patterns + EDM", "Finding + risk score + remediation task"], ["Access control", "PCI-DSS 7/8", "Access graph + IAM/PAM webhooks on new Restricted stores", "Access-review task and completion evidence"], ["Audit trail", "PCI-DSS 10", "Append-only, hash-chained log", "Immutable export; SIEM stream"]], 0.6, 1.85, 12.1, [3.0, 1.6, 4.2, 3.3], { fs: 10.5, rowH: 0.45 });
  rect(s, 0.6, 6.05, 12.1, 0.75, ICE, { line: ICE });
  T(s, "Data handling ethics: normal workflows see metadata, classifications, confidence, hashes and access context. Never raw values. Exports are integrity-verified, watermarked and logged as evidence events.", { x: 0.85, y: 6.12, w: 11.6, h: 0.6, fontSize: 11.5, color: NAVY, valign: "middle" });
  footer(s, 12);
}

// 13 — Roadmap
{
  const s = pres.addSlide(); title(s, "Roadmap: validate the loop, then make the healthcare product real, then assure at scale", "Phasing is capability-led. Each phase states what ships, what is deferred, and why.");
  const ph = [["Phase 0 · Design-partner pilot", "0–3 months", ["RDBMS, file share, SaaS connectors", "Deterministic layers 1–4", "Manual-heavy Triage Queue", "Single-tenant / on-prem", "Core evidence logging"], "Deferred: HL7/FHIR/DICOM, LLM layer. Validate discover → classify → triage precision with 1–2 partners first.", ICE], ["Phase 1 · Hybrid-SaaS GA", "3–9 months", ["HL7/FHIR and DICOM connectors", "NER layer 5", "Full ownership → task → verification → evidence workflow", "India-region multi-tenant plane", "Policy simulation; DLP/IAM/SIEM/ticketing"], "Deferred: LLM layer pending real ambiguity volume; patient self-service portal out of scope.", STEEL], ["Phase 2 · Assurance & scale", "9–18 months", ["LLM escalation layer 6", "Packaged on-prem / single-tenant variants", "Executive Posture for ASR", "Break-glass raw-value workflow"], "Deferred: BFSI, telecom, government as independent ICPs until healthcare PMF; graph-DB decision revisited.", ICE]];
  ph.forEach(([h, when, ships, def, fill], i) => { const x = 0.6 + i * 4.1, dark = fill === STEEL; rect(s, x, 1.85, 3.9, 4.9, fill, { line: fill }); T(s, h, { x: x + 0.2, y: 2.0, w: 3.5, h: 0.4, fontSize: 15, bold: true, color: dark ? WHITE : NAVY }); T(s, when, { x: x + 0.2, y: 2.4, w: 3.5, h: 0.3, fontSize: 11, italic: true, color: dark ? "CADCFC" : AMBER }); T(s, "Ships", { x: x + 0.2, y: 2.8, w: 3.5, h: 0.3, fontSize: 11, bold: true, color: dark ? WHITE : NAVY }); T(s, bullets(ships, { fontSize: 11, color: dark ? "E2E8F0" : SLATE }), { x: x + 0.2, y: 3.1, w: 3.5, h: 2.0, paraSpaceAfter: 3 }); T(s, def, { x: x + 0.2, y: 5.3, w: 3.5, h: 1.3, fontSize: 10.5, italic: true, color: dark ? "CADCFC" : SLATE }); });
  footer(s, 13);
}

// 14 — Metrics & pricing
{
  const s = pres.addSlide(); title(s, "One north-star metric, priced on estate complexity", "A discovery-volume metric rewards finding more. This one rewards closing the loop.");
  rect(s, 0.6, 1.85, 6.0, 2.4, NAVY, { line: NAVY });
  T(s, "Verified-Closed Rate", { x: 0.85, y: 2.0, w: 5.5, h: 0.5, fontSize: 26, bold: true, fontFace: HFONT, color: WHITE });
  T(s, "% of discovered regulated-data stores that are Owned, Remediated where required, and Evidenced within SLA. Computed from live states in the prototype; it moves during the demo.", { x: 0.85, y: 2.6, w: 5.5, h: 1.4, fontSize: 12.5, color: "E2E8F0" });
  T(s, "Supporting KPIs", { x: 0.6, y: 4.45, w: 6, h: 0.35, fontSize: 14, bold: true, color: NAVY });
  T(s, bullets(["Time-to-Owner: median days from discovery to Accepted", "Remediation SLA adherence", "Unowned Restricted-store count, trending to zero", "Classification precision on auto-applied high-impact actions", "Evidence packs exported per quarter"], { fontSize: 12, color: SLATE }), { x: 0.6, y: 4.85, w: 6, h: 1.9, paraSpaceAfter: 4 });
  card(s, 6.9, 1.85, 5.8, 2.4, "Pricing: per data source + per TB scanned, seat add-on", "Per source aligns cost with estate complexity, which a CISO can read (40 systems cost more than 5). Per TB captures compute on very large unstructured repositories. Seats are an add-on beyond an included base, never a gate, because “every store has an owner” means many owners logging in occasionally.", { hs: 14, bs: 11.5 });
  card(s, 6.9, 4.45, 5.8, 2.3, "Rejected: per record / per PHI field", "Requires exhaustive classification before invoicing, which contradicts the sampling-first architecture. Assumed ACV ₹35–60 lakh/year, pending design-partner validation.", { hs: 14, bs: 11.5, fill: ICE });
  footer(s, 14);
}

// 15 — Risks & close
{
  const s = pres.addSlide(); s.background = { color: NAVY }; title(s, "What I would validate first, and what I am assuming", "Well-flagged assumptions are a strength. These are the ones that change the plan if wrong.", true);
  const r = [["Localization obligations differ", "DPDP vs. RBI/sectoral rules. Assumed configurable region pinning plus per-deal legal validation, not one hard-coded posture."], ["Shared LLM APIs are unacceptable for PHI", "LLM layer assumed self-hosted or private-endpoint inside the trust boundary. Cost model depends on real ambiguity volume."], ["Performance targets are indicative", "Validate with design-partner workloads before committing them as SLAs."], ["We integrate with IAM, not replace it", "Access-graph data comes from the customer's identity systems via Keycloak federation."], ["Graph technology is a build-time decision", "Property graph on Postgres vs. dedicated graph DB. Revisited in Phase 2 on observed query patterns."], ["TAM and pricing are assumptions", "Bottom-up SAM and ACV to be re-derived from design-partner deal data after Phase 0."]];
  r.forEach(([h, b], i) => { const x = 0.6 + (i % 3) * 4.1, y = 1.95 + Math.floor(i / 3) * 2.15; rect(s, x, y, 3.85, 1.9, "27365A", { line: "27365A" }); T(s, h, { x: x + 0.2, y: y + 0.15, w: 3.45, h: 0.6, fontSize: 13.5, bold: true, color: "CADCFC" }); T(s, b, { x: x + 0.2, y: y + 0.8, w: 3.45, h: 1.0, fontSize: 11, color: "E2E8F0" }); });
  T(s, "The ask of the panel: challenge the architecture under changed constraints. The accountability loop should survive every one of them.", { x: 0.6, y: 6.4, w: 12.1, h: 0.5, fontSize: 14, italic: true, color: WHITE });
  footer(s, 15, true);
}

pres.writeFile({ fileName: "/Users/nikhilprem/aegisdata/deck/AegisData_Deck.pptx" }).then((f) => console.log("wrote", f));
