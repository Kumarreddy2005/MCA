# VCGIS Technical Debt & Refactoring Register

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Governance Authority:** Government of Karnataka  
**Lead Architect:** Principal Software Architect  
**Document Revision:** 1.0  
**Audit Date:** September 2026  

---

## 1. Technical Debt Management Framework

Technical debt is tracked to ensure that engineering trade-offs made during rapid development phases are made explicit, prioritized, and scheduled for systematic remediation.

### Debt Severity Tiers:
- **`P1 (High)`**: Architectural liabilities that impact scalability, external integrations, or operational durability.
- **`P2 (Medium)`**: Code quality, heuristic limitations, or abstraction gaps that slow future feature development.
- **`P3 (Low)`**: Minor cosmetic, formatting, or ergonomic refactorings.

---

## 2. Itemized Technical Debt Register

| Debt ID | System Area | Description | Code Evidence | Impact | Priority | Recommended Remediation | Est. Complexity | Current Status |
|:---|:---|:---|:---|:---|:---:|:---|:---:|:---:|
| **DEBT-001** | Authentication | Simulated OTP pipeline using console logs & dev preview | `auth.controller.ts:40-48` | Physical SMS text messages do not reach citizen phones in production | **P1** | Implement commercial SMS gateway adapter (CDAC Mobile Seva / Fast2SMS) | Medium (3 days) | **OPEN** |
| **DEBT-002** | Evidence Storage | Uploaded files written to local server disk | `upload.middleware.ts:12-25` | Multi-pod container deployments cannot access files stored on local disks | **P1** | Abstract storage interface writing to S3-compatible cloud object store | Medium (4 days) | **OPEN** |
| **DEBT-003** | AI Classification | Rule-based weighted dictionary for 11 departments | `classifier_service.py:7-75` | Lacks statistical generalization on colloquial Kannada phrasing | **P1** | Train supervised FastText or IndicBERT model on historical grievance dataset | High (2 weeks) | **OPEN** |
| **DEBT-004** | SLA Execution | Automated sweep relies on external HTTP trigger | `sla.routes.ts:24-25` | If external cron fails to call `/api/sla/sweep`, SLA breach escalations delay | **P1** | Embed Node-cron or Redis BullMQ worker inside backend process | Low (1 day) | **OPEN** |
| **DEBT-005** | Knowledge RAG | In-memory chunk index and BM25-style lexical ranker | `rag_service.py:25-28` | Memory footprint grows with document count; restarting process clears dynamic GOs | **P1** | Deploy persistent vector database (Qdrant or Milvus) with hybrid dense search | High (1.5 weeks) | **OPEN** |
| **DEBT-006** | Duplicate Detection | Sparse TF-IDF text vectors in similarity scoring | `similarity_service.py:57-60` | Cannot detect semantic duplicates written in different scripts (Kannada vs English) | **P2** | Replace TF-IDF with multilingual dense sentence embeddings | Medium (5 days) | **OPEN** |
| **DEBT-007** | Client Navigation | Mobile viewports lack slide-out hamburger navigation | `Navbar.tsx:85-110` | Small-screen mobile navigation requires returning to homepage | **P2** | Add responsive hamburger drawer menu for mobile screens | Low (1 day) | **OPEN** |
| **DEBT-008** | Realtime Updates | Frontend uses HTTP polling rather than active WebSocket | `NotificationBell.tsx:25-35` | Status changes and notifications do not appear live without refresh | **P2** | Connect client-side Socket.IO listener to dispatch live state updates | Low (2 days) | **OPEN** |
| **DEBT-009** | GIS Accessibility | SVG map nodes lack ARIA role and keyboard tabIndex | `GisMapViewer.tsx:120-180` | Screen reader and keyboard-only users cannot navigate district cartography | **P2** | Add `role="button"`, `tabIndex={0}`, and `aria-label` to all district SVG paths | Low (1 day) | **OPEN** |
| **DEBT-010** | Audit Immutability | Audit records lack cryptographic SHA-256 block hash | `audit-log.model.ts:15-35` | Database administrator could alter records directly in MongoDB | **P3** | Add `previousHash` block-chaining pointer to `AuditLog` documents | Medium (3 days) | **OPEN** |
| **DEBT-011** | Caching Architecture | Memory cache defaults to localized in-memory map | `cache.service.ts:15-40` | Multi-pod Kubernetes deployment maintains isolated cache per pod | **P2** | Configure clustered Redis container and pass `REDIS_URL` in production | Low (2 days) | **OPEN** |
| **DEBT-012** | Database Indexing | Lacks partial index on active un-resolved complaints | `complaint.model.ts:85-105` | SLA sweep scans index entries of historical resolved complaints | **P3** | Add partial filter index on active status complaints | Low (0.5 day) | **OPEN** |
| **DEBT-013** | Volunteer Offline Sync | Volunteer portal requires live internet connectivity | `AssistedComplaintModal.tsx:45` | Volunteers in remote rural areas with zero cell coverage lose draft entries | **P2** | Implement browser IndexedDB local draft queue with background sync | Medium (4 days) | **OPEN** |
