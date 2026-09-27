# VCGIS AI/ML and uncertainty

## Training

The AI service uses reproducible supervised pipelines in `scripts/train_models.py`. The script trains department, subcategory, and priority classifiers from the labeled CSV and writes model artifacts and `models/metrics.json`. Metrics are diagnostic outputs from the supplied data; they must not be presented as production accuracy without an independent evaluation set.

Run from `ai-service`:

```bash
python scripts/train_models.py
pytest tests
```

## Human-in-the-loop contract

Classification is advisory. `UNCERTAIN` is returned when the best class probability is below the configured confidence threshold, when the top-two margin is too small, when the text is insufficient, or when a multi-issue/ambiguous pattern is detected. The API also returns alternative departments, `clarification_required`, `needs_volunteer_review`, and `possible_categories`.

A volunteer or official must review uncertain classifications before routing becomes authoritative. Human corrections are the authoritative complaint values and should be recorded through the existing audit/lifecycle services.

## Dataset

`data/VCGIS_1500_Labeled_Training_Dataset.csv` is the existing labeled training corpus. `data/VCGIS_uncertainty_edge_cases.csv` is a separate synthetic edge-case evaluation set with categories A–R. It contains no personal data and must not be mixed into training when evaluating abstention behavior. The project does not claim calibrated confidence or generalization from synthetic examples.

## Safety and limitations

The classifier does not make emergency decisions. Reports involving live wires, sparking, collapse, contamination, or other hazards require human review and operational safety procedures. Production deployment requires consented/de-identified real data, language coverage, calibration, drift monitoring, and a separately maintained human-reviewed test set.
