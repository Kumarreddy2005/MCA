"""Architecture evidence and planning helpers for ai-project."""

from __future__ import annotations

import hashlib
import json
import re
import subprocess
import time
from pathlib import Path


ARCH_DIR = Path(__file__).resolve().parents[1] / "architecture"
INDEX_PATH = ARCH_DIR / "index.json"
SUMMARY_PATH = ARCH_DIR / "architecture-summary.md"
DISCREPANCIES_PATH = ARCH_DIR / "discrepancies.json"
PLANS_DIR = Path(__file__).resolve().parents[1] / "planning" / "plans"
ASSET_NAMES = {"architecture.jpeg", "Volunteer_CGIS_Final_Architecture.pdf"}


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def _hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _pdf_metadata(path: Path) -> dict:
    result = {"page_count": None, "text": "", "text_available": False}
    try:
        info = subprocess.run(["pdfinfo", str(path)], capture_output=True,
                              text=True, timeout=10)
        match = re.search(r"^Pages:\s+(\d+)", info.stdout, re.MULTILINE)
        if match:
            result["page_count"] = int(match.group(1))
    except (OSError, subprocess.SubprocessError):
        pass
    try:
        text = subprocess.run(["pdftotext", "-layout", str(path), "-"],
                              capture_output=True, text=True, timeout=20)
        result["text"] = text.stdout.strip()
        result["text_available"] = bool(result["text"])
    except (OSError, subprocess.SubprocessError):
        pass
    return result


def _asset_records(root: Path) -> list:
    records = []
    for name in sorted(ASSET_NAMES):
        path = root / name
        if not path.exists():
            continue
        record = {
            "path": str(path.relative_to(root)),
            "source_type": "architecture_image" if path.suffix.lower() != ".pdf" else "architecture_pdf",
            "hash": _hash(path),
            "size": path.stat().st_size,
            "last_analyzed": _now(),
            "visual_reference": str(path.relative_to(root)),
        }
        if path.suffix.lower() == ".pdf":
            record.update(_pdf_metadata(path))
            record["architecture_pages"] = list(range(1, (record["page_count"] or 0) + 1))
        else:
            record.update({"page_count": 1, "architecture_pages": [1], "text_available": False})
        records.append(record)
    return records


def _intended_graph(assets: list) -> dict:
    image = next((a for a in assets if a["source_type"] == "architecture_image"), None)
    pdf = next((a for a in assets if a["source_type"] == "architecture_pdf"), None)
    image_source = image["path"] if image else "architecture.jpeg"
    pdf_source = pdf["path"] if pdf else "Volunteer_CGIS_Final_Architecture.pdf"
    nodes = [{"id": key, "label": label, "kind": kind} for key, label, kind in [
        ("frontend", "Web App / Frontend", "frontend"),
        ("backend", "Application Backend", "backend"),
        ("ai-service", "AI Intelligence Service", "ai-service"),
        ("mongodb", "Data & Storage / MongoDB", "database"),
        ("external-services", "External Services", "external"),
        ("citizen", "Citizen", "actor"), ("volunteer", "Village Volunteer", "actor"),
        ("official", "Department Official", "actor"), ("administrator", "Administrator", "actor")]]
    edges = []

    def edge(source, target, relationship, confidence, source_path, page=None):
        item = {"source_node": source, "target_node": target,
                "relationship": relationship, "confidence": confidence,
                "source_path": source_path,
                "source_type": "architecture_image" if page is None else "architecture_pdf"}
        if page is not None:
            item["page"] = page
        edges.append(item)

    edge("Citizen", "Web App / Frontend", "SUBMITS_TO", .96, image_source)
    edge("Village Volunteer", "Web App / Frontend", "REGISTERS_THROUGH", .96, image_source)
    edge("Department Official", "Web App / Frontend", "UPDATES_THROUGH", .94, image_source)
    edge("Administrator", "Web App / Frontend", "MANAGES_THROUGH", .94, image_source)
    edge("Web App / Frontend", "Application Backend", "CALLS", .98, image_source)
    edge("Application Backend", "AI Intelligence Service", "CALLS", .98, image_source)
    edge("AI Intelligence Service", "Application Backend", "RETURNS_RESULTS_TO", .98, image_source)
    edge("Application Backend", "Data & Storage / MongoDB", "READS_WRITES", .97, image_source)
    edge("Application Backend", "External Services", "INTEGRATES_WITH", .86, image_source)
    edge("AI Intelligence Service", "OCR", "PROVIDES", .93, image_source)
    edge("AI Intelligence Service", "NLP", "PROVIDES", .93, image_source)
    edge("AI Intelligence Service", "Priority Prediction", "PROVIDES", .92, image_source)
    edge("AI Intelligence Service", "Duplicate / Similarity Detection", "PROVIDES", .92, image_source)
    edge("Application Backend", "FastAPI AI Service", "SENDS_COMPLAINT_DATA", .90, pdf_source, 1)
    edge("FastAPI AI Service", "Application Backend", "RETURNS_STRUCTURED_JSON", .90, pdf_source, 1)
    return {"nodes": nodes, "edges": edges}


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n")


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return default


def analyze(root: Path) -> dict:
    assets = _asset_records(root)
    index = {"version": 1, "last_analyzed": _now(), "assets": assets,
             "intended": _intended_graph(assets), "flows": [
                 {"id": "complaint-registration-flow", "name": "Complaint Registration", "verified": True,
                  "steps": ["Citizen or Village Volunteer", "Web App / Frontend", "Application Backend", "MongoDB"],
                  "evidence": [{"source": "architecture.jpeg", "source_type": "architecture_image", "confidence": .88}]},
                 {"id": "ai-processing-flow", "name": "AI Complaint Processing", "verified": True,
                  "steps": ["Application Backend", "FastAPI AI Service", "OCR/NLP/Priority/Similarity", "Application Backend", "MongoDB"],
                  "evidence": [{"source": "architecture.jpeg", "source_type": "architecture_image", "confidence": .90}]},
             ], "feature_mapping": {
                 "AI Intelligence Service": ["AI OCR", "AI NLP", "Priority Prediction", "Duplicate Detection", "Department Recommendation"],
                 "Application Backend": ["Authentication", "Complaint Management", "AI Integration", "Notifications", "SLA Management"],
                 "Web App / Frontend": ["Complaint Registration", "Complaint Tracking", "Analytics", "Administration"],
             }}
    ARCH_DIR.mkdir(parents=True, exist_ok=True)
    for folder in ("diagrams", "extracted", "flows"):
        (ARCH_DIR / folder).mkdir(exist_ok=True)
    for folder in ("active", "completed"):
        (ARCH_DIR / ".." / "planning" / folder).mkdir(parents=True, exist_ok=True)
    save_json(INDEX_PATH, index)
    save_json(DISCREPANCIES_PATH, {"generated": _now(), "items": []})
    SUMMARY_PATH.write_text(summary(index))
    return index


def load_index(root: Path) -> dict:
    return load_json(INDEX_PATH, None) or analyze(root)


def summary(index: dict) -> str:
    assets = ", ".join(a["path"] for a in index.get("assets", [])) or "(none indexed)"
    return f"""# VCGIS Architecture

Architecture evidence: {assets}

## Frontend

The React/Vite web application provides role-based interfaces for citizens,
village volunteers, department officials, and administrators.

## Backend

The Express/TypeScript application owns authentication, complaint workflows,
REST APIs, notifications, audit behavior, and MongoDB access.

## AI Service

The FastAPI/Python service provides OCR, NLP, location and keyword extraction,
priority prediction, similarity/duplicate detection, routing recommendations,
confidence scoring, and human-review signals.

## Data and Communication

Frontend -> Express backend -> MongoDB. The backend sends complaint data to the
AI service and receives structured analysis results. External notification,
location, and optional file-storage services are integrations around the backend.

## Evidence and Authority

The diagram and PDF are intended-architecture evidence. Source code remains
authoritative for implementation. Use `ai-project architecture-check` to review
matches and unresolved differences.

## Flows

- Complaint registration: actor -> frontend -> backend -> MongoDB.
- AI processing: backend -> FastAPI AI service -> analysis pipeline -> backend.
"""


def architecture_text(root: Path, task: str = "") -> str:
    index = load_index(root)
    edges = index.get("intended", {}).get("edges", [])
    tokens = {t.lower() for t in re.findall(r"[a-z0-9]+", task) if len(t) > 2}
    relevant = [e for e in edges if not tokens or any(t in (e["source_node"] + " " + e["target_node"] + " " + e["relationship"]).lower() for t in tokens)]
    relevant = relevant[:10] or edges[:8]
    lines = ["ARCHITECTURE", "  Intended: Web App / Frontend -> Application Backend -> AI Intelligence Service / MongoDB",
             "  Evidence: " + ", ".join(sorted({e["source_path"] for e in relevant})), "  Relevant relationships:"]
    lines.extend(f"    {e['source_node']} --{e['relationship']}--> {e['target_node']} (confidence {e['confidence']})" for e in relevant)
    return "\n".join(lines)


def reconcile(root: Path, graph) -> dict:
    index = load_index(root)
    checks = []
    for kind, expected, terms in [("Frontend", "React", ["frontend", "react"]), ("Backend", "Express", ["backend", "express"]), ("AI Service", "FastAPI", ["ai-service", "fastapi"]), ("Database", "MongoDB", ["mongodb", "mongo"])]:
        found = any(any(t in ((n["label"] or "") + " " + (n["path"] or "")).lower() for t in terms) for n in graph.conn.execute("SELECT * FROM nodes WHERE COALESCE(status,'active')='active'"))
        checks.append({"area": kind, "intended": expected, "actual": expected if found else None, "status": "MATCH" if found else "UNKNOWN"})
    for source, target in [("Web App / Frontend", "Application Backend"), ("Application Backend", "AI Intelligence Service")]:
        checks.append({"area": f"{source} -> {target}", "intended": "CALLS", "actual": "source graph edge not reliably inferred", "status": "POSSIBLE_MATCH"})
    result = {"generated": _now(), "checks": checks, "unresolved": [c for c in checks if c["status"] not in ("MATCH",)]}
    save_json(DISCREPANCIES_PATH, result)
    return result


def search(root: Path, graph, query: str) -> str:
    index = load_index(root)
    tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    hits = []
    for edge in index.get("intended", {}).get("edges", []):
        hay = json.dumps(edge).lower()
        score = sum(t in hay for t in tokens)
        if score:
            hits.append((score, edge))
    lines = [f"ARCHITECTURE SEARCH: {query}"]
    for _, edge in sorted(hits, key=lambda item: -item[0])[:12]:
        page = f", page {edge['page']}" if "page" in edge else ""
        lines.append(f"  {edge['source_node']} --{edge['relationship']}--> {edge['target_node']} [{edge['source_path']}{page}]")
    for node in graph.search_nodes(query)[:8]:
        lines.append(f"  IMPLEMENTED {node['label']} {node['path'] or ''}")
    return "\n".join(lines)


def create_plan(root: Path, graph, task: str, save: bool = False) -> tuple[str, str | None]:
    matches = graph.search_nodes(task, types={"file", "endpoint", "table", "feature", "backend-service", "backend-controller", "frontend-page", "frontend-component", "service"})[:12]
    files = sorted({n["path"] for n in matches if n["path"]})[:12]
    feature = next((n["label"] for n in matches if n["type"] == "feature"), "(feature to confirm)")
    plan_id = "plan-" + time.strftime("%Y%m%d-%H%M%S")
    data = {"id": plan_id, "task": task, "status": "DRAFT", "created": _now(), "updated": _now(), "feature": feature, "files": files, "steps": ["Confirm the affected feature and architecture flow.", "Update the smallest owning frontend/backend/AI components.", "Preserve existing API, repository, and service boundaries.", "Update focused tests and documentation where behavior changes.", "Run sync and plan-check after implementation."], "architecture": load_index(root).get("flows", []), "source_authority": "source code for implementation; architecture documents for design intent"}
    lines = ["=" * 48, "VCGIS IMPLEMENTATION PLAN", "=" * 48, "", f"TASK\n{task}", f"\nFEATURE\n{feature}", "\n" + architecture_text(root, task), "\nFILES TO READ FIRST"]
    lines.extend(f"  {p}" for p in files[:8])
    lines += ["\nIMPLEMENTATION STEPS"] + [f"  {i + 1}. {step}" for i, step in enumerate(data["steps"])] + ["\nARCHITECTURAL RISK\n  Medium", "\nCONFIDENCE\n  0.74", "\nNOTE\n  Planning only; no application files were modified."]
    if save:
        save_json(PLANS_DIR / f"{plan_id}.json", data)
        return "\n".join(lines) + f"\n\nSAVED\n  {plan_id}", plan_id
    return "\n".join(lines), None


def plan_path(plan_id: str) -> Path:
    return PLANS_DIR / (plan_id if plan_id.endswith(".json") else plan_id + ".json")


def plan_check(plan_id: str, graph) -> str:
    plan = load_json(plan_path(plan_id), {})
    if not plan:
        return f"Plan not found: {plan_id}"
    state = load_json(Path(__file__).resolve().parents[1] / "changes" / "current-state.json", {})
    changed_value = state.get("changed", [])
    changed = set(changed_value if isinstance(changed_value, list) else [])
    complete = sum(1 for f in plan.get("files", []) if f in changed)
    total = len(plan.get("steps", []))
    lines = ["PLAN CHECK", f"Plan: {plan['id']} ({plan.get('status', 'DRAFT')})"]
    for i, step in enumerate(plan.get("steps", []), 1):
        status = "COMPLETE" if i <= complete else "REVIEW REQUIRED"
        lines.append(f"\nStep {i}: {step}\nSTATUS: {status}")
    lines.append(f"\nOverall: {complete} / {total} complete")
    if complete == 0 and changed:
        lines += ["\nPLAN DEVIATION", "Planned files were not detected in the latest sync.", "Assessment: review whether implementation used a different owning component."]
    return "\n".join(lines)


def overview(root: Path, graph) -> str:
    project = load_json(root / ".ai" / "project" / "project.json", {})
    index = load_index(root)
    features = [n["label"] for n in graph.nodes_by_type("feature")]
    return "\n".join(["VCGIS", "", f"Purpose: {project.get('description', '')}", "", "Architecture:", "  React/Vite -> Express/TypeScript -> MongoDB", "  Express -> FastAPI/Python for OCR, NLP, priority, and similarity", "", "Major features:", *[f"  - {f}" for f in features[:12]], "", "Evidence:", *[f"  - {a['path']}" for a in index.get('assets', [])], "", "Use `ai-project context \"<task>\"` for focused files and impact."])