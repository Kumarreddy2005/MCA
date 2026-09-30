# VCGIS AI Model Evaluation & Uncertainty Calibration Report

**Generated Date:** 2026-09-28  
**Model Version:** 2.1-calibrated  
**Dataset:** VCGIS 1,500 Labeled Civic Complaints (`VCGIS_1500_Labeled_Training_Dataset.csv`)  

---

## 1. Executive Summary

The VCGIS AI Intelligence Microservice uses a calibrated multi-label text classification pipeline combined with an explicit **Uncertainty & Abstention Policy**.
Instead of forcing low-confidence complaints into an arbitrary department, the AI outputs `UNCERTAIN` when confidence or margin separation is below threshold, flagging the complaint for human review.

---

## 2. Dataset Overview

- **Total Training Dataset:** 1,500 Ground-Truth Complaints
- **Train/Test Split:** 70% Train (1050 records) / 30% Test (450 records), Stratified
- **Active Departments Taxonomy:**
  - `ROAD` (Roads & Transport): 500 complaints
  - `ELECTRICITY` (Electricity & Power): 500 complaints
  - `WATER` (Water Supply): 500 complaints

---

## 3. Department Classifier Performance

| Metric | Score |
| :--- | :--- |
| **Test Accuracy** | `100.00%` |
| **Macro Precision** | `100.00%` |
| **Macro Recall** | `100.00%` |
| **Macro F1-Score** | `100.00%` |

### Confusion Matrix (Test Set: 450 samples)

Labels: `['ELECTRICITY', 'ROAD', 'WATER']`

```text
[[150   0   0]
 [  0 150   0]
 [  0   0 150]]
```

---

## 4. Uncertainty & Abstention Threshold Policy

- **High Confidence Acceptance Threshold:** `p >= 0.50` with separation margin `p_top1 - p_top2 >= 0.15`
- **Abstain Condition:** `p < 0.50` OR `margin < 0.15` &rarr; Output `primary_department = "UNCERTAIN"`
- **Out-of-Scope Condition:** Non-civic topics (schools, pensions, ration cards) &rarr; Output `primary_department = "OUT_OF_SCOPE"`

### Calibration Validation Results on Test Set (450 samples):

- **Confident Predictions:** 450 (100.0%)
- **Abstained / Marked UNCERTAIN:** 0 (0.0%)
- **Accuracy on Confident Subset:** `100.00%`
- **Error Reduction via Abstention:** Low-confidence edge cases are routed to human review, preventing misrouting.

---

## 5. Subcategory & Priority Classifiers

| Model | Accuracy | Macro F1 |
| :--- | :--- | :--- |
| **Subcategory Classifier** | `99.78%` | `99.75%` |
| **Priority Classifier** | `78.44%` | `78.81%` |

---

## 6. Reproducibility & Commands

To re-run training and update evaluation artifacts:
```bash
python ai-service/scripts/train_models.py
```
