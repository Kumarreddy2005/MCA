"""Train reproducible VCGIS ML models with a 70/15/15 split."""
from pathlib import Path
import json
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "VCGIS_1500_Labeled_Training_Dataset.csv"
EDGE = ROOT / "data" / "VCGIS_uncertainty_edge_cases.csv"
OUT = ROOT / "models"
OUT.mkdir(exist_ok=True)
SEED = 42

def split_three_way(df):
    train, holdout = train_test_split(df, test_size=0.30, stratify=df.department, random_state=SEED)
    validation, test = train_test_split(holdout, test_size=0.50, stratify=holdout.department, random_state=SEED)
    return train, validation, test

def fit(target, train, validation, test, filename):
    pipe = Pipeline([( "tfidf", TfidfVectorizer(lowercase=True, ngram_range=(1, 2), sublinear_tf=True, max_features=12000)), ("classifier", LogisticRegression(max_iter=1500, class_weight="balanced", random_state=SEED))])
    pipe.fit(train.complaint_text, train[target].astype(str))
    result = {"target": target, "split": {"train": len(train), "validation": len(validation), "test": len(test)}, "random_state": SEED}
    labels = sorted(df[target].astype(str).unique())
    for name, part in (("validation", validation), ("test", test)):
        pred = pipe.predict(part.complaint_text)
        precision, recall, f1, _ = precision_recall_fscore_support(part[target].astype(str), pred, average="macro", zero_division=0)
        result[name] = {"accuracy": round(float(accuracy_score(part[target], pred)), 4), "macro_precision": round(float(precision), 4), "macro_recall": round(float(recall), 4), "macro_f1": round(float(f1), 4), "labels": labels, "confusion_matrix": confusion_matrix(part[target], pred, labels=labels).tolist()}
    joblib.dump(pipe, OUT / filename)
    return result

df = pd.read_csv(DATA).fillna("")
train, validation, test = split_three_way(df)
metrics = [fit(target, train, validation, test, filename) for target, filename in (("department", "department_classifier.joblib"), ("subcategory", "subcategory_classifier.joblib"), ("priority", "priority_classifier.joblib"))]
if EDGE.exists():
    edge = pd.read_csv(EDGE).fillna("")
    model = joblib.load(OUT / "department_classifier.joblib")
    pred = model.predict(edge.complaint_text)
    metrics.append({"target": "uncertainty_edge_cases", "rows": len(edge), "predicted_uncertain_rate": round(float((pred == "UNCERTAIN").mean()), 4), "note": "Synthetic diagnostic only."})
(OUT / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
print(json.dumps(metrics, indent=2))
