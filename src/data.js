// ---------------------------------------------------------------------------
// AegisData — seed data, registries and constants.
// All people, systems and values below are fictional demo data.
// ---------------------------------------------------------------------------

export const TENANT = {
  name: "Aarogya Health Systems",
  region: "India (ap-south-1)",
  deployment: "Hybrid-SaaS · scan-in-place agents",
};

export const OWNERS = [
  { id: "own-priya", name: "Priya Menon", unit: "Clinical Systems" },
  { id: "own-arjun", name: "Arjun Nair", unit: "Imaging & Laboratory" },
  { id: "own-meera", name: "Meera Iyer", unit: "Revenue Cycle" },
];

// Personas represent accountability responsibilities, not job titles (TSD §2, Appendix A).
export const PERSONAS = [
  { code: "ASR-A", label: "CISO / Security Director", user: "Dr. Kavita Rao", home: "dashboard",
    permissions: ["exception.approve:tier2", "policy.approve:high-risk", "evidence.export", "evidence.read"] },
  { code: "POL", label: "Privacy Officer / DPO", user: "Sanjay Bhat", home: "exceptions",
    permissions: ["exception.approve:tier1", "exception.approve:tier2", "policy.author", "policy.publish", "evidence.export", "dsar.search"] },
  { code: "OWN", label: "Data / Application Owner", user: "Priya Menon", ownerId: "own-priya", home: "tasks",
    permissions: ["owner.accept", "owner.delegate", "task.execute", "finding.dispute", "exception.request"] },
  { code: "ANL", label: "Security Engineer / Analyst", user: "Rohan Desai", home: "triage",
    permissions: ["finding.adjudicate", "finding.reclassify", "owner.assign"] },
  { code: "OPS", label: "IT Admin / Discovery Operator", user: "Leela Krishnan", home: "sources",
    permissions: ["connector.manage", "scan.run", "credential.rotate"] },
  { code: "ASR-R", label: "External Auditor (read-only)", user: "Assurance Reviewer", home: "evidence", readOnly: true,
    permissions: ["evidence.read", "report.read"] },
];

export const NAV = [
  { key: "dashboard", label: "Executive Posture", personas: ["ASR-A", "ASR-R"] },
  { key: "sources", label: "Connector Health & Scans", personas: ["OPS", "ASR-A"] },
  { key: "triage", label: "Triage Queue", personas: ["ANL"] },
  { key: "tasks", label: "My Tasks", personas: ["OWN"] },
  { key: "exceptions", label: "Approvals Inbox", personas: ["POL", "ASR-A"] },
  { key: "policies", label: "Policies & Taxonomy", personas: ["POL"] },
  { key: "compliance", label: "Compliance & Reports", personas: ["POL", "ASR-A", "ASR-R"] },
  { key: "evidence", label: "Evidence Center", personas: ["POL", "ASR-A", "ASR-R"] },
  { key: "admin", label: "Administration", personas: ["OPS", "ASR-A"] },
];

export const SCHEDULES = ["Hourly incremental", "Daily incremental", "Weekly full", "Quarterly reconciliation", "Manual only"];

export const seedSources = () => ([
  { id: "src-1", name: "Cerner EMR — Production", type: "RDBMS", ownerId: "own-priya", connectorState: "Active", status: "Completed", scanMode: "Incremental", schedule: "Hourly incremental", lastScan: "2 hours ago", coverage: 92, credentialTTL: 38, agent: "v1.8.2", egress: "Metadata only", errorRate: 0.1, coverageGaps: [], history: [{ ts: "2 hours ago", mode: "Incremental", result: "Completed", objects: 12400 }] },
  { id: "src-2", name: "Epic Clinical Data Warehouse", type: "Data Warehouse", ownerId: "own-priya", connectorState: "Active", status: "Completed", scanMode: "Incremental", schedule: "Daily incremental", lastScan: "6 hours ago", coverage: 88, credentialTTL: 52, agent: "v1.8.2", egress: "Metadata only", errorRate: 0.0, coverageGaps: [], history: [{ ts: "6 hours ago", mode: "Incremental", result: "Completed", objects: 3100 }] },
  { id: "src-3", name: "Radiology PACS", type: "DICOM/PACS", ownerId: "own-arjun", connectorState: "Active", status: "Completed", scanMode: "Full", schedule: "Weekly full", lastScan: "1 day ago", coverage: 75, credentialTTL: 21, agent: "v1.8.2", egress: "Metadata only", errorRate: 0.4, coverageGaps: [{ id: "gap-1", from: "12 days ago", to: "9 days ago", reason: "DICOM query timeout during archive migration", affected: "Studies 2019–2020" }], history: [{ ts: "1 day ago", mode: "Full", result: "Completed", objects: 480000 }] },
  { id: "src-4", name: "Claims SFTP", type: "File Share", ownerId: null, connectorState: "Degraded", status: "Failed", scanMode: "Full", schedule: "Weekly full", lastScan: "3 days ago", coverage: 40, credentialTTL: 0, agent: "v1.7.9", egress: "Metadata only", errorRate: 38.0, coverageGaps: [{ id: "gap-2", from: "3 days ago", to: null, reason: "Credential expired — broker rotation failed", affected: "All batch folders since 3 days ago" }], history: [{ ts: "3 days ago", mode: "Full", result: "Failed", objects: 2200 }] },
  { id: "src-5", name: "Laboratory Results DB", type: "RDBMS", ownerId: "own-arjun", connectorState: "Active", status: "Completed", scanMode: "Incremental", schedule: "Hourly incremental", lastScan: "4 hours ago", coverage: 95, credentialTTL: 44, agent: "v1.8.2", egress: "Metadata only", errorRate: 0.0, coverageGaps: [], history: [{ ts: "4 hours ago", mode: "Incremental", result: "Completed", objects: 8900 }] },
  { id: "src-6", name: "Patient Documents SharePoint", type: "SharePoint", ownerId: "own-priya", connectorState: "Active", status: "Completed", scanMode: "Incremental", schedule: "Daily incremental", lastScan: "12 hours ago", coverage: 80, credentialTTL: 57, agent: "v1.8.2", egress: "Metadata only", errorRate: 1.2, coverageGaps: [], history: [{ ts: "12 hours ago", mode: "Incremental", result: "Completed", objects: 61000 }] },
  { id: "src-7", name: "Research Object Storage", type: "Object Storage", ownerId: null, connectorState: "Active", status: "Completed", scanMode: "Full", schedule: "Quarterly reconciliation", lastScan: "2 days ago", coverage: 55, credentialTTL: 30, agent: "v1.8.2", egress: "Metadata only", errorRate: 0.3, coverageGaps: [], history: [{ ts: "2 days ago", mode: "Full", result: "Completed", objects: 2100000 }] },
  { id: "src-8", name: "Provider Credential Store", type: "SaaS", ownerId: null, connectorState: "Registered", status: "Not Yet Scanned", scanMode: "—", schedule: "Manual only", lastScan: "Never", coverage: 0, credentialTTL: 0, agent: "—", egress: "—", errorRate: 0, coverageGaps: [], history: [] },
  { id: "src-9", name: "HL7 Admissions Feed", type: "HL7/FHIR", ownerId: "own-arjun", connectorState: "Active", status: "Completed", scanMode: "Incremental", schedule: "Hourly incremental", lastScan: "1 hour ago", coverage: 90, credentialTTL: 12, agent: "v1.8.2", egress: "Metadata only", errorRate: 0.0, coverageGaps: [], history: [{ ts: "1 hour ago", mode: "Incremental", result: "Completed", objects: 15600 }] },
  { id: "src-10", name: "FHIR API Gateway", type: "HL7/FHIR", ownerId: "own-priya", connectorState: "Active", status: "Completed", scanMode: "Incremental", schedule: "Hourly incremental", lastScan: "3 hours ago", coverage: 85, credentialTTL: 49, agent: "v1.8.2", egress: "Metadata only", errorRate: 0.2, coverageGaps: [], history: [{ ts: "3 hours ago", mode: "Incremental", result: "Completed", objects: 7300 }] },
]);

// Finding: state ∈ Detected | Under Review | Confirmed | Rejected | Remediation Required | Verified Closed | Superseded
// ownership ∈ Unowned | Assigned | Accepted | Delegated
// exposure ∈ None | Limited | Broad | External
export const seedFindings = () => ([
  { id: "f-1", sourceId: "src-1", dataType: "Patient identifiers", identifierTypes: ["MRN", "ABHA"], label: "Restricted", confidence: 97, exposure: "Broad", layers: ["Pattern", "NER"], modelVersion: "clf-2.4.1", state: "Remediation Required", ownership: "Accepted", ownerId: "own-priya", taskId: "t-1", plain: "Patient identifiers are stored in a broadly accessible production table.", detectedTs: "9 days ago" },
  { id: "f-2", sourceId: "src-3", dataType: "DICOM patient metadata", identifierTypes: ["MRN"], label: "Restricted", confidence: 94, exposure: "Limited", layers: ["Pattern", "EDM"], modelVersion: "clf-2.4.1", state: "Verified Closed", ownership: "Accepted", ownerId: "own-arjun", taskId: "t-2", plain: "Patient metadata embedded in imaging study headers.", detectedTs: "21 days ago" },
  { id: "f-3", sourceId: "src-6", dataType: "Consent forms with signatures", identifierTypes: ["Patient name"], label: "Confidential", confidence: 88, exposure: "Broad", layers: ["SVM Doc-Type", "NER"], modelVersion: "clf-2.4.1", state: "Remediation Required", ownership: "Accepted", ownerId: "own-priya", taskId: "t-3", plain: "Signed consent forms are stored in a folder shared org-wide.", detectedTs: "6 days ago" },
  { id: "f-4", sourceId: "src-9", dataType: "MRN in HL7 segments", identifierTypes: ["MRN"], label: "Restricted", confidence: 91, exposure: "Limited", layers: ["Pattern", "NER"], modelVersion: "clf-2.4.1", state: "Remediation Required", ownership: "Assigned", ownerId: null, proposedOwnerId: "own-priya", taskId: "t-4", plain: "Medical record numbers appear in unencrypted HL7 admission segments.", detectedTs: "2 days ago" },
  { id: "f-5", sourceId: "src-5", dataType: "Lab result values + MRN", identifierTypes: ["MRN"], label: "Restricted", confidence: 99, exposure: "Limited", layers: ["Pattern", "Dictionary", "EDM"], modelVersion: "clf-2.3.0", state: "Verified Closed", ownership: "Accepted", ownerId: "own-arjun", taskId: "t-5", plain: "Lab results are linked directly to medical record numbers.", detectedTs: "30 days ago" },
  { id: "f-6", sourceId: "src-7", dataType: "De-identified vs. identifiable research data", identifierTypes: ["Patient name"], label: "Confidential", confidence: 54, exposure: "Limited", layers: ["LLM Escalation"], modelVersion: "llm-esc-0.9", state: "Under Review", ownership: "Unowned", ownerId: null, taskId: null, plain: "Ambiguous — some files may retain identifiers despite a de-identification pass.", detectedTs: "1 day ago" },
  { id: "f-7", sourceId: "src-2", dataType: "Diagnosis codes in free text", identifierTypes: [], label: "Confidential", confidence: 61, exposure: "Limited", layers: ["NER", "LLM Escalation"], modelVersion: "llm-esc-0.9", state: "Under Review", ownership: "Unowned", ownerId: null, taskId: null, plain: "Diagnosis mentions detected in clinician free-text notes; classifier confidence is low.", detectedTs: "1 day ago" },
  { id: "f-8", sourceId: "src-4", dataType: "Card numbers in claims batch files", identifierTypes: ["Card PAN"], label: "Restricted", confidence: 99, exposure: "External", layers: ["Pattern", "EDM"], modelVersion: "clf-2.4.1", state: "Detected", ownership: "Unowned", ownerId: null, taskId: null, plain: "Card numbers (Luhn-validated) found in an externally shared claims batch.", detectedTs: "3 hours ago" },
  { id: "f-9", sourceId: "src-10", dataType: "Patient contact info", identifierTypes: ["Phone", "Patient name"], label: "Confidential", confidence: 85, exposure: "Limited", layers: ["Pattern", "NER"], modelVersion: "clf-2.4.1", state: "Remediation Required", ownership: "Accepted", ownerId: "own-priya", taskId: "t-6", plain: "Patient contact details are returned by a FHIR endpoint with broad scope.", detectedTs: "8 days ago" },
  { id: "f-10", sourceId: "src-6", dataType: "Internal scheduling notes", identifierTypes: [], label: "Internal", confidence: 96, exposure: "None", layers: ["Dictionary"], modelVersion: "clf-2.4.1", state: "Verified Closed", ownership: "Accepted", ownerId: "own-arjun", taskId: "t-7", plain: "Internal scheduling notes with no patient identifiers.", detectedTs: "14 days ago" },
  { id: "f-11", sourceId: "src-1", dataType: "Marketing content", identifierTypes: [], label: "Public", confidence: 99, exposure: "None", layers: ["Dictionary"], modelVersion: "clf-2.4.1", state: "Rejected", ownership: "Unowned", ownerId: null, taskId: null, plain: "Flagged in error — confirmed non-sensitive published content.", detectedTs: "5 days ago" },
  { id: "f-12", sourceId: "src-2", dataType: "Genetic test panel results", identifierTypes: ["MRN"], label: "Restricted", confidence: 90, exposure: "Limited", layers: ["Pattern", "NER"], modelVersion: "clf-2.4.1", state: "Remediation Required", ownership: "Unowned", ownerId: null, taskId: "t-8", plain: "Genetic test results detected in an analytics extract with no assigned owner.", detectedTs: "2 days ago" },
]);

// Task: state ∈ Open | In Progress | Paused | Pending Verification | Verification Failed | Verified Closed | Cancelled
export const seedTasks = () => ([
  { id: "t-1", findingId: "f-1", type: "Remediation", state: "Open", due: "In 5 days", sla: "7 days (P0)", priority: "P0", willFail: false, action: "Restrict table access to the clinical-apps service role; remove org-wide read grant." },
  { id: "t-2", findingId: "f-2", type: "Remediation", state: "Verified Closed", due: "Closed", sla: "7 days (P0)", priority: "P0", willFail: false, action: "Enable DICOM header de-identification on export path." },
  { id: "t-3", findingId: "f-3", type: "Remediation", state: "In Progress", due: "In 9 days", sla: "14 days (P1)", priority: "P1", willFail: false, action: "Move consent forms to a restricted library; break inheritance from the org-wide site." },
  { id: "t-4", findingId: "f-4", type: "Remediation", state: "Open", due: "In 2 days", sla: "48 hours (P0)", priority: "P0", willFail: false, action: "Enable TLS on the HL7 MLLP listener and mask PID-3 in the integration log." },
  { id: "t-5", findingId: "f-5", type: "Remediation", state: "Verified Closed", due: "Closed", sla: "7 days (P0)", priority: "P0", willFail: false, action: "Apply column-level encryption on MRN join key." },
  { id: "t-6", findingId: "f-9", type: "Remediation", state: "Pending Verification", due: "In 3 days", sla: "14 days (P1)", priority: "P1", willFail: true, action: "Narrow the FHIR Patient scope to the two consuming apps that need contact fields." },
  { id: "t-7", findingId: "f-10", type: "Remediation", state: "Verified Closed", due: "Closed", sla: "14 days (P1)", priority: "P1", willFail: false, action: "No action — label confirmed Internal." },
  { id: "t-8", findingId: "f-12", type: "Ownership", state: "Open", due: "In 2 days", sla: "48 hours (P0)", priority: "P0", willFail: false, action: "Assign an accountable owner for the analytics extract." },
]);

// Exception: state ∈ Requested | Approved | Active | Expired | Revoked. Tier 2 requires POL + ASR-A.
export const seedExceptions = () => ([
  { id: "e-1", kind: "exception", scope: "Research Object Storage — Confidential", findingId: "f-6", requestedBy: { name: "Arjun Nair", code: "OWN" }, tier: 2, state: "Requested", reason: "Awaiting legal review of research data-sharing agreement.", approvals: [], expiry: "In 90 days", created: "1 day ago" },
  { id: "e-2", kind: "exception", scope: "Claims SFTP — external vendor access", findingId: "f-8", requestedBy: { name: "Meera Iyer", code: "OWN" }, tier: 2, state: "Approved", reason: "Time-bound vendor migration window.", approvals: [{ by: "Sanjay Bhat", code: "POL" }, { by: "Dr. Kavita Rao", code: "ASR-A" }], expiry: "In 30 days", created: "4 days ago" },
  { id: "e-3", kind: "exception", scope: "Epic CDW — analytics team broad read", findingId: "f-7", requestedBy: { name: "Priya Menon", code: "OWN" }, tier: 1, state: "Active", reason: "Approved for Q3 analytics sprint; expires end of quarter.", approvals: [{ by: "Sanjay Bhat", code: "POL" }], expiry: "In 18 days", created: "40 days ago" },
  { id: "e-4", kind: "exception", scope: "Legacy backup archive — decommission delay", findingId: null, requestedBy: { name: "Arjun Nair", code: "OWN" }, tier: 1, state: "Expired", reason: "Original decommission exception lapsed; new request required.", approvals: [{ by: "Sanjay Bhat", code: "POL" }], expiry: "Expired 3 days ago", created: "95 days ago" },
]);

export const BASE_TAXONOMY = [
  { label: "Public", meaning: "No confidentiality requirement", handling: "Standard controls", crosswalk: "—" },
  { label: "Internal", meaning: "General business data, low sensitivity", handling: "Internal access only", crosswalk: "—" },
  { label: "Confidential", meaning: "Sensitive business or limited personal data", handling: "Restricted access", crosswalk: "DPDP personal data · GDPR personal data" },
  { label: "Restricted", meaning: "Regulated, high-harm-if-exposed data", handling: "Strong controls + accountability", crosswalk: "PHI · DPDP sensitive data · PCI cardholder data · GDPR Art. 9" },
];

// Policy rules are evaluated by the policy engine when a finding is Confirmed (TSD §6.2).
export const BASE_RULES = [
  { id: "r-1", label: "Restricted", exposures: ["Broad", "External"], ownership: null, obligation: "Remediation", priority: "P0", slaDays: 7 },
  { id: "r-2", label: "Confidential", exposures: ["Broad", "External"], ownership: null, obligation: "Review", priority: "P1", slaDays: 14 },
  { id: "r-3", label: "Restricted", exposures: null, ownership: "Unowned", obligation: "Ownership assignment", priority: "P0", slaDays: 2 },
];

export const COMPLIANCE_MAP = [
  { req: "Know what personal/sensitive data is held", cite: "DPDP Act 2023", labels: ["Restricted", "Confidential"], cap: "Discovery + layered classification across structured, unstructured, SaaS, HL7/FHIR, DICOM sources", evidence: "Classified inventory record per store, with confidence score and timestamp" },
  { req: "Purpose limitation", cite: "DPDP Act 2023 §5–8", labels: ["Restricted", "Confidential"], cap: "Business-context tagging + taxonomy crosswalk to purpose categories", evidence: "Policy record linking store to declared purpose/taxonomy label" },
  { req: "Right to erasure / correction", cite: "DPDP Act 2023", labels: ["Restricted"], cap: "Access graph + inventory locates all instances of a given record type", evidence: "Task record: request → located stores → remediation/erasure → verification" },
  { req: "Records of processing activities", cite: "GDPR Art. 30", labels: ["Restricted", "Confidential"], cap: "Metadata catalogue as continuously updated system of record", evidence: "Exportable RoPA-equivalent report" },
  { req: "Right to erasure", cite: "GDPR Art. 17", labels: ["Restricted"], cap: "Same erasure workflow, cross-mapped via taxonomy crosswalk", evidence: "Evidence record of erasure action + verification" },
  { req: "Security of processing", cite: "GDPR Art. 32", labels: ["Restricted"], cap: "Encryption, RBAC, scan-in-place architecture, audit logging", evidence: "NFR compliance summary + exportable audit log" },
  { req: "Cardholder data discovery", cite: "PCI-DSS Req. 3, 12", labels: ["Restricted"], identifier: "Card PAN", cap: "Luhn-validated pattern layer + EDM for known card data sets", evidence: "Classification finding + risk score + remediation task" },
  { req: "Access control to regulated data", cite: "PCI-DSS Req. 7/8", labels: ["Restricted"], cap: "Access graph + IAM/PAM webhook triggers on new Restricted stores", evidence: "Access-review task + evidence of review completion" },
  { req: "Audit trail of security-relevant events", cite: "PCI-DSS Req. 10", labels: [], cap: "Append-only, hash-chained audit log", evidence: "Immutable, exportable audit log; SIEM stream" },
];

export const IDENTIFIER_TYPES = ["MRN", "ABHA", "Card PAN", "Phone", "Patient name"];

export const seedAudit = () => ([
  { id: "a-1", ts: "Today 08:12", actor: "Arjun Nair (OWN)", action: "Verified Closed", object: "Task t-2 — Radiology PACS", kind: "finding" },
  { id: "a-2", ts: "Today 07:40", actor: "System", action: "Scan completed", object: "Laboratory Results DB", kind: "system" },
  { id: "a-3", ts: "Yesterday 18:02", actor: "Rohan Desai (ANL)", action: "Confirmed finding", object: "f-1 — Cerner EMR", kind: "finding" },
  { id: "a-4", ts: "3 days ago", actor: "System", action: "Connector degraded", object: "Claims SFTP — credential expired", kind: "system" },
]);

// Seed evidence carries no hash; the chain is computed on first load so it verifies.
export const seedEvidence = () => ([
  { id: "ev-3", event: "Verification scan passed", ts: "5 days ago", actor: "Arjun Nair (OWN)", object: "Task t-7 / Finding f-10", result: "Verified Closed" },
  { id: "ev-2", event: "Verification scan passed", ts: "3 days ago", actor: "Arjun Nair (OWN)", object: "Task t-5 / Finding f-5", result: "Verified Closed" },
  { id: "ev-1", event: "Verification scan passed", ts: "Today 08:12", actor: "Arjun Nair (OWN)", object: "Task t-2 / Finding f-2", result: "Verified Closed" },
]);

export const STATE_TONE = {
  "Detected": "bg-slate-100 text-slate-700",
  "Under Review": "bg-amber-50 text-amber-700",
  "Confirmed": "bg-blue-50 text-blue-700",
  "Rejected": "bg-slate-100 text-slate-500 line-through",
  "Remediation Required": "bg-orange-50 text-orange-700",
  "Verified Closed": "bg-emerald-50 text-emerald-700",
  "Superseded": "bg-slate-100 text-slate-500",
  "Open": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-50 text-blue-700",
  "Paused": "bg-violet-50 text-violet-700",
  "Pending Verification": "bg-amber-50 text-amber-700",
  "Verification Failed": "bg-red-50 text-red-700",
  "Cancelled": "bg-slate-100 text-slate-500 line-through",
  "Completed": "bg-emerald-50 text-emerald-700",
  "Running": "bg-blue-50 text-blue-700",
  "Failed": "bg-red-50 text-red-700",
  "Not Yet Scanned": "bg-slate-100 text-slate-500",
  "Requested": "bg-amber-50 text-amber-700",
  "Approved": "bg-blue-50 text-blue-700",
  "Active": "bg-emerald-50 text-emerald-700",
  "Expired": "bg-slate-100 text-slate-500",
  "Revoked": "bg-red-50 text-red-700",
  "Registered": "bg-slate-100 text-slate-600",
  "Degraded": "bg-red-50 text-red-700",
  "Unowned": "bg-red-50 text-red-600",
  "Assigned": "bg-amber-50 text-amber-700",
  "Accepted": "bg-emerald-50 text-emerald-700",
  "Delegated": "bg-blue-50 text-blue-700",
  "Published": "bg-emerald-50 text-emerald-700",
  "Draft": "bg-slate-100 text-slate-600",
};

export const LABEL_TONE = {
  Public: "bg-slate-100 text-slate-600",
  Internal: "bg-blue-50 text-blue-700",
  Confidential: "bg-amber-50 text-amber-800",
  Restricted: "bg-red-50 text-red-700",
};

export const PRIORITY_TONE = { P0: "bg-red-50 text-red-700", P1: "bg-amber-50 text-amber-700", P2: "bg-blue-50 text-blue-700" };
