# AI Analysis Pipeline

RELATED FEATURES: ai-ocr, ai-nlp-analysis, duplicate-clustering
RELATED COMPONENTS: ai.service.ts (backend), analysis_service, nlp_service, ocr_service, clustering_service, intelligence_service, enrichment_service
RELATED APIs: POST /ocr, POST /nlp/analyze, POST /analysis, POST /clustering/* (ai-service), POST /api/v1/ai/* (backend proxy)

## Pipeline

```
upload (image/PDF) ─▶ OCR (preprocessing → tesseract/pdfplumber → text_cleaner)
text               ─▶ text_normalizer ─▶ analyzer (problem extraction)
                                      ├─ keyword_extractor (keybert)
                                      ├─ location/extractor (pincode/gazetteer)
                                      ├─ department/detector (rules)
                                      ├─ priority/predictor
                                      └─ summary/generator
                    ─▶ clustering/similarity (sentence-transformers) ─▶ duplicate detection / clusters
```

The backend calls the AI service over HTTP (backend/src/services/ai.service.ts); the frontend never talks to ai-service directly.
