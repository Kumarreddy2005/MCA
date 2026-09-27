# VCGIS AI/ML Model & System Engineering Assessment

**System Name:** Village Volunteer-Assisted Citizen Grievance Intelligence System (VCGIS)  
**Evaluation Role:** Senior AI/ML Engineering & Safety Reviewer  
**Document Revision:** 1.0 (Comprehensive AI Audit)  
**Audit Date:** September 2026  
**Evaluated Artifacts:** `ai-service/app/services/*`, `ai-service/app/routers/*`, `backend/src/services/ai.service.ts`  

---

## 1. Executive AI Review & Critical Distinctions

A foundational tenet of this audit is the rigorous distinction between:
1. **Model Integration (Working Pipeline):** APIs communicate, JSON schemas validate, endpoints return status 200, and fallbacks catch network exceptions.
2. **Model Quality (Algorithmic Precision):** Whether classification, clustering, and extraction algorithms achieve statistically validated F1-scores, precision, and recall on real-world Kannada and rural English grievance corpora.
3. **Production Validation:** Operational fitness for statewide deployment without human error amplification, hallucinated circular citations, or false duplicate discards.

### High-Level AI Verdict:
> **Status:** **Integration Complete & Resilient; Model Quality Operating on Baseline Heuristics & TF-IDF; Requires Machine Learning Domain Fine-Tuning Prior to Statewide Deployment.**
> 
> The Python/FastAPI microservice (`ai-service`) is completely built, runs cleanly under Uvicorn, and passes 25/25 Pytest suites and 7/7 backend end-to-end integration tests. However, the current models rely heavily on **weighted keyword dictionaries, regex tokenizers, and TF-IDF vectors** rather than supervised neural embeddings. These baselines provide predictable, safe decision support, but require statistical calibration on historical Karnataka grievance datasets.

---

## 2. Master AI Capability Assessment Table

| AI Capability | Current Implementation | Model / Library | Integration Status | Evaluation Evidence | Current Quality | Production Readiness | Primary Grooming Requirement |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---|
| **OCR Document Parsing** | Digital PDF text stream extraction & image validation | `pypdf 5.3` + `Pillow 11.1` | `IMPLEMENTED` | Tested on sample PDFs | **Baseline (Text PDFs Only)** | **NEEDS GROOMING** | Bundle Tesseract OCR binary / cloud OCR for handwritten Kannada scans |
| **NLP Entity Extraction** | Regex & gazetteer dictionary mapping | Python `re` + Karnataka District List | `IMPLEMENTED` | Tested on rural district strings | **Heuristic (Predictable)** | **NEEDS GROOMING** | Train spaCy / IndicBERT Named Entity Recognizer (NER) |
| **Department Classification** | Weighted keyword scoring across 11 depts | Custom heuristic rules (`DEPARTMENT_RULES`) | `IMPLEMENTED` | 7 integration tests | **Heuristic (80% confidence)** | **NEEDS GROOMING** | Train supervised FastText / IndicBERT multi-class classifier on 50k cases |
| **Urgency & Hazard Scoring** | Life-safety & infrastructure risk weights | Rule-based hazard factor analysis | `IMPLEMENTED` | Evaluated on live wire & water cases | **Robust Heuristic** | **PRODUCTION READY** | Add feedback loop to adjust weights based on official overrides |
| **Duplicate Clustering** | TF-IDF cosine similarity + 2km GPS filter | `scikit-learn` TF-IDF + Haversine | `IMPLEMENTED` | 10 Pytest cluster tests | **Algorithmic (Baseline)** | **NEEDS GROOMING** | Replace TF-IDF with multilingual dense sentence embeddings |
| **Citizen AI Assistant** | Conversational drafting & plain-language status | Rule-driven template engine | `IMPLEMENTED` | Tested across 3 sample issues | **Deterministic (Safe)** | **NEEDS GROOMING** | Connect cloud LLM gateway with streaming tokens |
| **Volunteer Structuring Copilot** | 4-part petition structuring from notes | Structured template builder | `IMPLEMENTED` | Evaluated on verbal field notes | **Structured (Safe)** | **NEEDS GROOMING** | Fine-tune Kannada LLM for colloquial village dialect transcription |
| **Official Decision Copilot** | Sakala resolution letters & inspection checklists | Departmental legal template generator | `IMPLEMENTED` | Evaluated across 4 depts | **Template-Based** | **NEEDS GROOMING** | Integrate LLM to synthesize contractor notes into formal orders |
| **Multilingual Translation** | Civic terminology dictionary mapper | 45+ Kannada &harr; English civic terms | `IMPLEMENTED` | Tested on common civic words | **Lexicon Only** | **NEEDS GROOMING** | Integrate Bhashini or Google Cloud Translation API for syntax parsing |
| **Grounded Legal RAG** | Sliding-window chunking & lexical retrieval | In-memory chunk index + BM25-style ranker | `IMPLEMENTED` | 6 Pytest grounding tests | **Heuristic Grounding** | **NEEDS GROOMING** | Deploy external vector database (Qdrant/Milvus) with dense vector embeddings |

---

## 3. Granular Deep-Dive by AI Capability

### 3.1 OCR Document Extraction
- **Implementation File:** `ai-service/app/services/ocr_service.py`
- **Input:** Base64-encoded PDF document, image file, or raw digital text.
- **Output:** Extracted text string, confidence score (0.0–1.0), `is_low_confidence` boolean flag, detected language.
- **Confidence Handling:** Digital text streams with high printable character ratios yield confidence 0.85–0.95. Scanned image-only PDFs yield confidence 0.45 and trigger `is_low_confidence: True`.
- **Fallback:** Returns low-confidence placeholder notifying officials that manual verification of physical paper is required.
- **Limitations:** Does not execute optical character recognition on scanned bitmap images or handwritten Kannada letters due to the absence of the Tesseract binary in the local host environment.
- **Grooming Path:** Incorporate Tesseract OCR with `tesseract-ocr-kan` language packs inside the Docker container; evaluate against a 500-sample dataset of real rural Karnataka petition papers.

---

### 3.2 Department Classification
- **Implementation File:** `ai-service/app/services/classifier_service.py`
- **Input:** Complaint title, description, category.
- **Output:** Recommended primary department, confidence score, subcategory, and top 2 ranked alternative departments.
- **Model Architecture:**
  ```python
  DEPARTMENT_RULES = {
      "Energy Department": { "keywords": ["electricity", "transformer", "pole", "wire"], "weight": 1.2 },
      "Rural Development": { "keywords": ["drainage", "water", "borewell", "panchayat"], "weight": 1.0 },
      ...
  }
  ```
- **Evaluation Evidence:** 100% pass on synthetic test fixtures, but **lacks statistical cross-validation** on an independent human-annotated test split.
- **Limitations:** Polysemous words or dialectal slang not in the keyword dictionary fail to match the correct department.
- **Grooming Path:** Collect 50,000 anonymized historical petitions from Janasnehi / IPGRS; train a FastText or fine-tuned IndicBERT classifier; calculate precision, recall, and Macro-F1 across all 11 departments. Target: Macro-F1 &ge; 0.88.

---

### 3.3 Duplicate Detection & Problem Clustering
- **Implementation File:** `ai-service/app/services/similarity_service.py`
- **Input:** Incoming complaint title/description/GPS + array of existing active complaints in the same district.
- **Algorithm:**
  1. Concatenate text into corpus.
  2. Compute `TfidfVectorizer(ngram_range=(1,2), stop_words='english')`.
  3. Calculate pairwise cosine similarity.
  4. Compute Haversine distance between GPS coordinates.
  5. Composite score: `(0.7 * Cosine_Similarity) + (0.3 * Proximity_Boost)`.
- **Policy Compliance:** Adheres strictly to the **Non-Auto-Discard Rule**: complaints flagged as duplicates are never deleted; they are clustered and linked to the master dossier for group resolution.
- **Limitations:** TF-IDF fails when one villager writes in Kannada script and another writes in English transliteration describing the same broken culvert.
- **Grooming Path:** Upgrade from sparse TF-IDF to dense sentence embeddings using `sentence-transformers` (e.g. `paraphrase-multilingual-MiniLM-L12-v2` or Sarvam-AI embeddings) to calculate cross-lingual semantic similarity.

---

### 3.4 Generative AI Decision Support
- **Implementation File:** `ai-service/app/services/genai_service.py`
- **Architecture:** Local deterministic expert system executing structured domain templates and rule transforms.
- **Human Authority Preservation:**
  - AI drafts are presented inside interactive UI drawers (`CitizenAiAssistantModal`, `VolunteerStructuringDrawer`, `OfficialReviewModal`).
  - The human user must explicitly inspect, edit, and click "Apply" or "Submit". The AI cannot autonomously submit petitions or close files.
- **Limitations:** Responses are predictable and safe, but lack dynamic conversational reasoning.
- **Grooming Path:** Provision an enterprise cloud LLM gateway (Azure OpenAI, Google Cloud Vertex AI, or local Ollama vLLM) with strict system guardrails and temperature &le; 0.2.

---

### 3.5 RAG Knowledge System
- **Implementation File:** `ai-service/app/services/rag_service.py`
- **Architecture:** Sliding-window legal clause chunking (200-word overlap) preserving headings. Document status filtering excludes `SUPERSEDED` and `ARCHIVED` circulars.
- **Grounded Answer Protocol:**
  - If relevance score &le; 0.12, system outputs formal disclaimer: *"No authorized Government of Karnataka circular was found covering this matter."*
  - If relevant chunks exist, answers synthesize source excerpts with explicit legal document numbers.
- **Limitations:** Chunk storage is held in application memory dictionary; lexical BM25 token overlap does not capture abstract legal synonyms.
- **Grooming Path:** Connect a dedicated vector database (Qdrant or Milvus) with dense hybrid vector search (dense embeddings + sparse BM25 re-ranking).

---

## 4. Required AI Governance & Evaluation Roadmap

Prior to statewide deployment, the state government must commission the following AI evaluation workstreams:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Statewide AI Model Evaluation Roadmap                    │
├───────────────────────┬───────────────────────┬────────────────────────┤
│ Phase A: Data Prep    │ Phase B: Training     │ Phase C: Validation    │
│ • 50k Labeled Records │ • FastText Baseline   │ • Precision / Recall   │
│ • Kannada Transcripts │ • IndicBERT Fine-Tune │ • Human-AI Agreement   │
│ • OCR Scanned Binds   │ • Vector DB Milvus    │ • Bias / Fairness Test │
└───────────────────────┴───────────────────────┴────────────────────────┘
```

1. **Benchmark Creation:** Build a gold-standard evaluation set of 5,000 human-verified rural Karnataka grievances spanning all 31 districts.
2. **Model Evaluation Metrics:** Measure Multi-Class Accuracy, Macro-F1 per department, OCR Character Error Rate (CER), and Duplicate Detection Precision@k.
3. **Human-AI Agreement Analysis:** Track how frequently department officials accept or override AI-recommended departments and priority ratings.
4. **Drift Monitoring:** Log model inference distributions monthly to detect seasonal drift (e.g. monsoon drainage complaints vs. summer drinking water shortages).
