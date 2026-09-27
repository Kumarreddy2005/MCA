# VCGIS Supervised ML Model Card

## Models
- Department: TF-IDF word/bi-gram features + Logistic Regression, 3 classes (ROAD, ELECTRICITY, WATER).
- Subcategory: TF-IDF word/bi-gram features + Logistic Regression.
- Priority: TF-IDF word/bi-gram features + Logistic Regression.

## Training data
`data/VCGIS_1500_Labeled_Training_Dataset.csv` is a synthetic, labeled development dataset (500 examples per department). It is not real citizen data and must not be presented as production accuracy evidence.

## Evaluation
A stratified 70/30 train/test split with random state 42 was used for the packaged development model. Metrics are stored in `models/metrics.json`.

## Uncertainty policy
The classifier uses predicted probability and top-two margin gates. Low-confidence, weakly separated, ambiguous, and out-of-scope complaints are represented as `UNCERTAIN` or `OUT_OF_SCOPE` and marked for volunteer review instead of being silently routed.

## Production recommendation
Retrain with anonymized real grievance data and a held-out real-world test set before making claims about production accuracy.
