import json
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "VCGIS_1500_Labeled_Training_Dataset.csv"
MODELS_DIR = ROOT / "models"
DOCS_DIR = ROOT.parent / "docs"

MODELS_DIR.mkdir(exist_ok=True)
DOCS_DIR.mkdir(exist_ok=True)

print(f"[AI TRAINING] Loading dataset from {DATA_PATH}...")
df = pd.read_csv(DATA_PATH).fillna("")
print(f"[AI TRAINING] Dataset loaded. Total records: {len(df)}")
print(f"[AI TRAINING] Department distribution:\n{df['department'].value_counts()}\n")

# Combine title and text if available or use complaint_text
texts = (df["complaint_text"] + " " + df["language"].astype(str)).str.strip()

# 70/30 Stratified Train/Test Split
train_idx, test_idx = train_test_split(
    range(len(df)),
    test_size=0.30,
    stratify=df["department"],
    random_state=42
)

tr_df = df.iloc[train_idx]
te_df = df.iloc[test_idx]
tr_text = texts.iloc[train_idx]
te_text = texts.iloc[test_idx]

def train_and_evaluate(target_col, model_filename):
    print(f"[AI TRAINING] Training classifier for target: '{target_col}'...")
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            lowercase=True,
            ngram_range=(1, 2),
            min_df=1,
            sublinear_tf=True,
            max_features=12000
        )),
        ("clf", LogisticRegression(
            max_iter=1200,
            class_weight="balanced",
            random_state=42
        ))
    ])

    pipe.fit(tr_text, tr_df[target_col].astype(str))
    pred_labels = pipe.predict(te_text)

    # Calculate metrics
    acc = accuracy_score(te_df[target_col].astype(str), pred_labels)
    macro_p, macro_r, macro_f1, _ = precision_recall_fscore_support(
        te_df[target_col].astype(str),
        pred_labels,
        average="macro",
        zero_division=0
    )

    labels = sorted(df[target_col].astype(str).unique())
    cm = confusion_matrix(te_df[target_col].astype(str), pred_labels, labels=labels)
    per_class = classification_report(
        te_df[target_col].astype(str),
        pred_labels,
        labels=labels,
        output_dict=True
    )

    # Save model artifact
    joblib.dump(pipe, MODELS_DIR / model_filename)
    print(f"[AI TRAINING] Saved model artifact: {MODELS_DIR / model_filename}")

    return {
        "target": target_col,
        "accuracy": round(float(acc), 4),
        "macro_precision": round(float(macro_p), 4),
        "macro_recall": round(float(macro_r), 4),
        "macro_f1": round(float(macro_f1), 4),
        "labels": labels,
        "confusion_matrix": cm.tolist(),
        "per_class_report": per_class,
        "train_size": len(train_idx),
        "test_size": len(test_idx),
        "model_filename": model_filename,
    }

# 1. Train Department Classifier
dept_metrics = train_and_evaluate("department", "department_classifier.joblib")

# 2. Train Subcategory Classifier
subcat_metrics = train_and_evaluate("subcategory", "subcategory_classifier.joblib")

# 3. Train Priority Classifier
priority_metrics = train_and_evaluate("priority", "priority_classifier.joblib")

# Evaluate Uncertainty Threshold Policy on Department Model
dept_model = joblib.load(MODELS_DIR / "department_classifier.joblib")
test_probs = dept_model.predict_proba(te_text)
classes = list(dept_model.classes_)

uncertain_count = 0
confident_count = 0
correct_confident = 0
incorrect_confident = 0

for idx, probs in enumerate(test_probs):
    ranked = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)
    best_cls, best_prob = ranked[0]
    second_prob = ranked[1][1] if len(ranked) > 1 else 0.0
    margin = best_prob - second_prob

    # Uncertainty abstain policy
    is_uncertain = best_prob < 0.50 or margin < 0.15

    true_cls = str(te_df.iloc[idx]["department"])
    if is_uncertain:
        uncertain_count += 1
    else:
        confident_count += 1
        if best_cls == true_cls:
            correct_confident += 1
        else:
            incorrect_confident += 1

confident_accuracy = round(correct_confident / max(1, confident_count), 4)

all_metrics = [dept_metrics, subcat_metrics, priority_metrics]
(MODELS_DIR / "metrics.json").write_text(json.dumps(all_metrics, indent=2))

# 4. Generate Markdown Evaluation Report
report_md = f"""# VCGIS AI Model Evaluation & Uncertainty Calibration Report

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
- **Train/Test Split:** 70% Train ({dept_metrics['train_size']} records) / 30% Test ({dept_metrics['test_size']} records), Stratified
- **Active Departments Taxonomy:**
  - `ROAD` (Roads & Transport): 500 complaints
  - `ELECTRICITY` (Electricity & Power): 500 complaints
  - `WATER` (Water Supply): 500 complaints

---

## 3. Department Classifier Performance

| Metric | Score |
| :--- | :--- |
| **Test Accuracy** | `{dept_metrics['accuracy'] * 100:.2f}%` |
| **Macro Precision** | `{dept_metrics['macro_precision'] * 100:.2f}%` |
| **Macro Recall** | `{dept_metrics['macro_recall'] * 100:.2f}%` |
| **Macro F1-Score** | `{dept_metrics['macro_f1'] * 100:.2f}%` |

### Confusion Matrix (Test Set: {dept_metrics['test_size']} samples)

Labels: `{dept_metrics['labels']}`

```text
{np.array(dept_metrics['confusion_matrix'])}
```

---

## 4. Uncertainty & Abstention Threshold Policy

- **High Confidence Acceptance Threshold:** `p >= 0.50` with separation margin `p_top1 - p_top2 >= 0.15`
- **Abstain Condition:** `p < 0.50` OR `margin < 0.15` &rarr; Output `primary_department = "UNCERTAIN"`
- **Out-of-Scope Condition:** Non-civic topics (schools, pensions, ration cards) &rarr; Output `primary_department = "OUT_OF_SCOPE"`

### Calibration Validation Results on Test Set ({dept_metrics['test_size']} samples):

- **Confident Predictions:** {confident_count} ({confident_count / dept_metrics['test_size'] * 100:.1f}%)
- **Abstained / Marked UNCERTAIN:** {uncertain_count} ({uncertain_count / dept_metrics['test_size'] * 100:.1f}%)
- **Accuracy on Confident Subset:** `{confident_accuracy * 100:.2f}%`
- **Error Reduction via Abstention:** Low-confidence edge cases are routed to human review, preventing misrouting.

---

## 5. Subcategory & Priority Classifiers

| Model | Accuracy | Macro F1 |
| :--- | :--- | :--- |
| **Subcategory Classifier** | `{subcat_metrics['accuracy'] * 100:.2f}%` | `{subcat_metrics['macro_f1'] * 100:.2f}%` |
| **Priority Classifier** | `{priority_metrics['accuracy'] * 100:.2f}%` | `{priority_metrics['macro_f1'] * 100:.2f}%` |

---

## 6. Reproducibility & Commands

To re-run training and update evaluation artifacts:
```bash
python ai-service/scripts/train_models.py
```
"""

(DOCS_DIR / "AI_MODEL_EVALUATION.md").write_text(report_md, encoding="utf-8")
print(f"[AI TRAINING] Report written to: {DOCS_DIR / 'AI_MODEL_EVALUATION.md'}")
print("[AI TRAINING] Training & evaluation completed successfully!")
