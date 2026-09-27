from pathlib import Path
import json
import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'/'VCGIS_1500_Labeled_Training_Dataset.csv'
OUT=ROOT/'models'; OUT.mkdir(exist_ok=True)
df=pd.read_csv(DATA).fillna('')
text=(df.complaint_text+' '+df.language.astype(str)).str.strip()
train_idx, test_idx=train_test_split(range(len(df)),test_size=.30,stratify=df.department,random_state=42)
tr=df.iloc[train_idx]; te=df.iloc[test_idx]

def fit(target, filename):
    pipe=Pipeline([('tfidf',TfidfVectorizer(lowercase=True,ngram_range=(1,2),min_df=1,sublinear_tf=True,max_features=12000)),('clf',LogisticRegression(max_iter=1200,class_weight='balanced',random_state=42))])
    pipe.fit(text.iloc[train_idx],tr[target].astype(str))
    pred=pipe.predict(text.iloc[test_idx])
    p,r,f,_=precision_recall_fscore_support(te[target].astype(str),pred,average='macro',zero_division=0)
    labels=sorted(df[target].astype(str).unique())
    metrics={'target':target,'accuracy':round(float(accuracy_score(te[target],pred)),4),'macro_precision':round(float(p),4),'macro_recall':round(float(r),4),'macro_f1':round(float(f),4),'labels':labels,'confusion_matrix':confusion_matrix(te[target],pred,labels=labels).tolist(),'train_size':len(train_idx),'test_size':len(test_idx),'random_state':42}
    joblib.dump(pipe,OUT/filename)
    return metrics

metrics=[fit('department','department_classifier.joblib'),fit('subcategory','subcategory_classifier.joblib'),fit('priority','priority_classifier.joblib')]
(OUT/'metrics.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics,indent=2))
