# VCGIS E-Governance & Domain Lexicon (Glossary)

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Governance Authority:** Government of Karnataka  
**Document Revision:** 1.0  
**Audit Date:** September 2026  

---

## 1. Governance & Administrative Lexicon (Karnataka)

- **Sakala Services Act (Karnataka Guarantee of Services to Citizens Act, 2011):**  
  Landmark legislation in Karnataka guaranteeing statutory time-bound delivery of citizen services and grievance resolutions. If a service is not delivered within the statutory SLA window, officials face administrative penalties and automatic hierarchical escalation.
- **RDPR (Rural Development & Panchayat Raj Department):**  
  The principal state government department overseeing rural governance, rural drinking water, sanitation, Gram Panchayats, and rural infrastructure across Karnataka.
- **Gram Panchayat (GP):**  
  The foundational grassroots local government institution in rural India, governing a cluster of villages. In VCGIS, Village Volunteers are mapped directly to specific Gram Panchayats.
- **Taluk:**  
  An administrative sub-division of a district in Karnataka, headed by a Tahsildar and Taluk Executive Officer (EO).
- **Tahsildar / Taluk Executive Officer:**  
  The primary administrative officer at the taluk level, acting as the **Level 1 Escalation Authority** in the VCGIS SLA hierarchy when local department engineers breach statutory resolution deadlines.
- **District Collector (DC) / Deputy Commissioner:**  
  The senior administrative head of a district in Karnataka, acting as the **Level 2 Escalation Authority** when complaints remain unresolved for >24 hours past the deadline.
- **Principal Secretary:**  
  Senior Indian Administrative Service (IAS) officer heading a government department at the state secretariat level in Bengaluru, acting as the **Level 3 Escalation Authority** when grievances remain unresolved for >48 hours past the deadline.
- **BESCOM / MESCOM / HESCOM / GESCOM / CESC:**  
  The five regional electricity distribution companies (ESCOMs) in Karnataka responsible for rural and urban power distribution, transformers, lines, and billing.
- **Janasnehi Kendra / Atalji Janasnehi Kendra:**  
  State-run rural citizen service centers providing citizen services and land record (RTC/Pahani) assistance.
- **Jal Jeevan Mission (JJM):**  
  National and state scheme ensuring functional household tap water connections to every rural household.

---

## 2. Platform Core Roles & Concepts

- **Citizen:**  
  A resident of Karnataka who interacts with the portal to directly file public grievances, monitor real-time repair progress, provide satisfaction ratings, or reopen incomplete works.
- **Village Volunteer:**  
  A trained, grassroots community representative issued an official badge who assists rural villagers (particularly elderly, illiterate, or non-smartphone-owning residents) with petition lodging and conducts 4-point on-site field verifications.
- **Department Official:**  
  An authorized government engineer, lineman, or administrative officer belonging to 1 of 11 state departments responsible for reviewing dossiers, dispatching repair crews, and uploading mandatory resolution photo proofs.
- **Administrator (SuperAdmin):**  
  State-level governance officer responsible for user provisioning, department SLA threshold tuning, Gram Panchayat volunteer clustering, and cross-system audit log exploration.
- **Grievance / Complaint:**  
  A formal petition detailing public infrastructure failure, service interruption, or administrative delay bound to statutory tracking, automated routing, and SLA deadlines.
- **4-Point Field Verification:**  
  A standardized physical inspection workflow conducted by Village Volunteers verifying: (1) citizen identity, (2) incident ground reality, (3) photographic evidence validity, and (4) hazard severity level.
- **Section 32 Zero-PII Compliance:**  
  State cybersecurity policy mandating that public GIS maps and analytical exports suppress citizen names, phone numbers, and house door numbers to protect citizen privacy.

---

## 3. Technical, AI & Security Terms

- **Service Level Agreement (SLA):**  
  The statutory countdown timer (24h, 48h, 120h, or 240h) assigned to a grievance based on its priority tier under the Karnataka Sakala Act.
- **Role-Based Access Control (RBAC):**  
  Security mechanism restricting access to authorized users based on verified role tokens (`CITIZEN`, `VOLUNTEER`, `OFFICIAL`, `ADMIN`).
- **Departmental Isolation:**  
  Cryptographic and middleware restriction ensuring officials can only access petitions within their authorized department. Foreign access attempts yield HTTP 403.
- **OCR (Optical Character Recognition):**  
  Automated text extraction from uploaded PDF petitions, handwritten letters, and scanned paper documents.
- **NLP (Natural Language Processing):**  
  Computational linguistic extraction identifying administrative entities (districts, taluks, dates) and citizen intent.
- **FastText / IndicBERT:**  
  Supervised machine learning text classification architectures tailored for Indian multilingual languages.
- **TF-IDF (Term Frequency - Inverse Document Frequency):**  
  Numerical statistic reflecting word importance in a document collection, utilized in VCGIS duplicate detection.
- **Haversine Distance:**  
  Mathematical formula calculating spherical distance across GPS coordinates (latitude/longitude), used in VCGIS 2km duplicate clustering.
- **Generative AI (GenAI):**  
  Artificial intelligence capabilities assisting users in drafting, structuring, and formulating plain-language petitions and official letters.
- **RAG (Retrieval-Augmented Generation):**  
  Technique retrieving verified chunks from authoritative Government Orders before synthesizing answers, preventing hallucinations.
- **NoSQL Injection:**  
  Cybersecurity vulnerability where malicious users submit database operator syntax (`$where`, `$ne`) to manipulate database queries. Mitigated in VCGIS via `sanitize.middleware.ts`.
- **HSTS (HTTP Strict Transport Security):**  
  Security header enforcing encrypted HTTPS communication for all web traffic.
