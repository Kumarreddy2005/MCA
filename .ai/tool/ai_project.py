#!/usr/bin/env python3
"""
ai-project — persistent, task-aware, cross-service project intelligence for AI coding agents.

Phase 1: graph index, incremental sync, feature registry, change ledger, docs index.
Phase 2: cross-service edges with confidence, task context engine (cache + manifest +
token-budget modes), impact-task, why/history/handoff, subgraph, graph export formats,
docs-check, decisions, context-audit, rename/archive handling, validate v2, doctor.

Source code always wins over the graph (see .ai/agents/memory-rules.md).
Stdlib only. Python 3.9+. Works fully offline.
"""

from __future__ import annotations

import fnmatch
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

from architecture import (analyze as analyze_architecture, architecture_text,
                          create_plan, load_index, overview as architecture_overview,
                          plan_check, plan_path, reconcile as reconcile_architecture,
                          search as search_architecture)

# --------------------------------------------------------------------------
# Constants / paths
# --------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
AI_DIR = PROJECT_ROOT / ".ai"
DB_PATH = AI_DIR / "graph" / "graph.db"
LEDGER_PATH = AI_DIR / "changes" / "ledger.jsonl"
FEATURES_PATH = AI_DIR / "project" / "features.json"
PROJECT_META_PATH = AI_DIR / "project" / "project.json"
ARCH_MEMORY_PATH = AI_DIR / "metadata" / "architecture-memory.json"
STATE_PATH = AI_DIR / "changes" / "current-state.json"
CONTEXT_CACHE_DIR = AI_DIR / "cache" / "contexts"
HANDOFF_PATH = AI_DIR / "agents" / "current-context.md"

SCHEMA_VERSION = 2

IGNORE_DIRS = {
    "node_modules", "dist", "build", ".git", ".ai", "__pycache__",
    ".venv", "venv", "coverage", ".cache",
}
SOURCE_EXTS = {".ts", ".tsx", ".py"}
DOC_EXTS = {".md"}

TS_IMPL_EXTS = {".ts", ".tsx"}
PY_EXTS = {".py"}

STOPWORDS = {
    "a", "an", "the", "change", "changed", "changes", "add", "added", "adding",
    "fix", "fixed", "make", "when", "should", "must", "based", "on", "for",
    "with", "to", "in", "of", "and", "or", "new", "update", "updated", "how",
    "why", "what", "is", "are", "it", "this", "that", "from", "into", "by",
    "at", "be", "can", "do", "does", "i", "we", "want", "need", "use", "using",
    "implement", "support", "system", "project", "complaint", "file", "code",
}

# Agent identity detection (best effort; never fabricate).
AGENT_ENV_MAP = [
    ("CLAUDECODE", "claude-code"),
    ("CURSOR_TRACE_ID", "cursor"),
    ("CODEX_SANDBOX", "codex"),
    ("CODEX_HOME", "codex"),
    ("OPENCODE", "opencode"),
    ("ANTIGRAVITY", "antigravity"),
    ("ZCODE_SESSION", "zcode"),
    ("AGENT", None),  # generic passthrough
    ("AI_AGENT", None),
]

# --------------------------------------------------------------------------
# Small helpers
# --------------------------------------------------------------------------


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def detect_agent() -> str:
    for env, name in AGENT_ENV_MAP:
        v = os.environ.get(env)
        if v:
            return name if name else v.strip().lower().replace(" ", "-")
    return "unknown"


def git(args: list) -> str | None:
    try:
        r = subprocess.run(["git", "-C", str(PROJECT_ROOT)] + args,
                           capture_output=True, text=True, timeout=15)
        return r.stdout.strip() if r.returncode == 0 else None
    except Exception:
        return None


def git_state() -> dict:
    return {
        "is_git": git(["rev-parse", "--is-inside-work-tree"]) == "true",
        "branch": git(["rev-parse", "--abbrev-ref", "HEAD"]),
        "commit": git(["rev-parse", "--short", "HEAD"]),
        "dirty_files": [l[3:] for l in (git(["status", "--porcelain"]) or "").splitlines() if len(l) > 3],
    }


def load_json(path: Path, default):
    try:
        with open(path) as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2, sort_keys=False)
        f.write("\n")


def match_globs(path: str, patterns: list) -> bool:
    return any(fnmatch.fnmatch(path, p) for p in patterns)


def extract_concepts(text: str) -> list:
    """Extract meaningful concepts: words + camelCase splits, minus stopwords."""
    words = re.findall(r"[A-Za-z_][A-Za-z0-9_]*", text)
    out = []
    for w in words:
        for part in re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+", w):
            p = part.lower()
            if len(p) > 2 and p not in STOPWORDS:
                out.append(p)
    return out

# --------------------------------------------------------------------------
# Graph store (SQLite; swappable for a real graph DB later — the interface is
# add_node / add_edge / neighborhood queries).
# --------------------------------------------------------------------------


class Graph:
    def __init__(self, path: Path = DB_PATH):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(str(path))
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS nodes(
                id TEXT PRIMARY KEY, type TEXT, label TEXT,
                path TEXT, meta TEXT);
            CREATE TABLE IF NOT EXISTS edges(
                src TEXT, dst TEXT, type TEXT,
                PRIMARY KEY (src, dst, type));
            CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
            CREATE INDEX IF NOT EXISTS idx_nodes_path ON nodes(path);
            CREATE INDEX IF NOT EXISTS idx_edges_src ON edges(src);
            CREATE INDEX IF NOT EXISTS idx_edges_dst ON edges(dst);
            CREATE TABLE IF NOT EXISTS files(
                path TEXT PRIMARY KEY, hash TEXT,
                last_analyzed TEXT, last_commit TEXT);
            CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
        """)
        self._migrate()

    def _migrate(self) -> None:
        """In-place schema migration. Existing data is never dropped."""
        cols = {r["name"] for r in self.conn.execute("PRAGMA table_info(nodes)")}
        if "status" not in cols:
            self.conn.execute("ALTER TABLE nodes ADD COLUMN status TEXT DEFAULT 'active'")
        ecols = {r["name"] for r in self.conn.execute("PRAGMA table_info(edges)")}
        for col, decl in (("confidence", "REAL DEFAULT 1.0"),
                          ("method", "TEXT DEFAULT 'phase1'"),
                          ("detected_at", "TEXT")):
            if col not in ecols:
                self.conn.execute(f"ALTER TABLE edges ADD COLUMN {col} {decl}")
        fcols = {r["name"] for r in self.conn.execute("PRAGMA table_info(files)")}
        for col, decl in (("mtime", "REAL DEFAULT 0"), ("size", "INTEGER DEFAULT 0")):
            if col not in fcols:
                self.conn.execute(f"ALTER TABLE files ADD COLUMN {col} {decl}")
        self.conn.commit()

    # -- nodes/edges -------------------------------------------------------
    def node(self, node_id: str):
        return self.conn.execute("SELECT * FROM nodes WHERE id=?", (node_id,)).fetchone()

    def add_node(self, node_id: str, ntype: str, label: str, path: str = None, meta: dict = None):
        self.conn.execute(
            "INSERT INTO nodes(id,type,label,path,meta,status) VALUES(?,?,?,?,?,'active') "
            "ON CONFLICT(id) DO UPDATE SET type=excluded.type,label=excluded.label,"
            "path=excluded.path,meta=excluded.meta,status='active'",
            (node_id, ntype, label, path, json.dumps(meta or {})))

    def archive_node(self, node_id: str):
        """Mark node as archived (deleted from code, kept for historical queries)."""
        self.conn.execute("UPDATE nodes SET status='archived' WHERE id=?", (node_id,))
        self.conn.execute("DELETE FROM edges WHERE src=? OR dst=?", (node_id, node_id))

    def delete_nodes(self, node_ids):
        if not node_ids:
            return
        q = ",".join("?" * len(node_ids))
        self.conn.execute(f"DELETE FROM nodes WHERE id IN ({q})", node_ids)
        self.conn.execute(f"DELETE FROM edges WHERE src IN ({q}) OR dst IN ({q})", node_ids + node_ids)

    def add_edge(self, src: str, dst: str, etype: str, confidence: float = 1.0, method: str = "manual"):
        self.conn.execute(
            "INSERT INTO edges(src,dst,type,confidence,method,detected_at) "
            "VALUES(?,?,?,?,?,?) "
            "ON CONFLICT(src,dst,type) DO UPDATE SET confidence=excluded.confidence,"
            "method=excluded.method,detected_at=excluded.detected_at",
            (src, dst, etype, confidence, method, now_iso()))

    def nodes_by_type(self, ntype: str, include_archived=False):
        cond = "" if include_archived else "AND COALESCE(status,'active')='active'"
        return self.conn.execute(
            f"SELECT * FROM nodes WHERE type=? {cond} ORDER BY label", (ntype,)).fetchall()

    def nodes_by_path(self, path: str):
        return self.conn.execute(
            "SELECT * FROM nodes WHERE path=? AND COALESCE(status,'active')='active'", (path,)).fetchall()

    def _edges(self, node_id: str, direction: str, include_archived: bool):
        active_only = "" if include_archived else \
            "AND COALESCE(n.status,'active')='active'"
        if direction == "out":
            return self.conn.execute(
                f"SELECT e.* FROM edges e JOIN nodes n ON n.id=e.dst "
                f"WHERE e.src=? {active_only} ORDER BY e.type", (node_id,)).fetchall()
        return self.conn.execute(
            f"SELECT e.* FROM edges e JOIN nodes n ON n.id=e.src "
            f"WHERE e.dst=? {active_only} ORDER BY e.type", (node_id,)).fetchall()

    def out_edges(self, node_id: str, include_archived=True):
        return self._edges(node_id, "out", include_archived)

    def in_edges(self, node_id: str, include_archived=True):
        return self._edges(node_id, "in", include_archived)

    def search_nodes(self, query: str, types=None, include_archived=False) -> list:
        """Token-based ranked search over node labels/paths. Exact > structural > fuzzy."""
        tokens = [t.lower() for t in re.split(r"[\s/_\-.]+", query) if len(t) > 1]
        cond = "" if include_archived else "AND COALESCE(status,'active')='active'"
        rows = self.conn.execute(f"SELECT * FROM nodes WHERE 1=1 {cond}").fetchall()
        ql = query.lower()
        scored = []
        for r in rows:
            if types and r["type"] not in types:
                continue
            label = (r["label"] or "").lower()
            hay = f"{label} {r['path'] or ''}".lower()
            score = sum(1 for t in tokens if t in hay)
            if ql and ql in label:
                score += 3  # exact label match
            elif ql and ql in hay:
                score += 2  # substring
            if score:
                scored.append((score, r))
        scored.sort(key=lambda x: (-x[0], x[1]["label"]))
        return [r for _, r in scored]

    # -- file hash tracking -------------------------------------------------
    def file_row(self, path: str):
        return self.conn.execute("SELECT * FROM files WHERE path=?", (path,)).fetchone()

    def all_files(self):
        return self.conn.execute("SELECT * FROM files").fetchall()

    def set_file(self, path: str, h: str, commit: str = None, mtime: float = 0, size: int = 0):
        self.conn.execute(
            "INSERT INTO files(path,hash,last_analyzed,last_commit,mtime,size) VALUES(?,?,?,?,?,?) "
            "ON CONFLICT(path) DO UPDATE SET hash=excluded.hash,"
            "last_analyzed=excluded.last_analyzed,last_commit=excluded.last_commit,"
            "mtime=excluded.mtime,size=excluded.size",
            (path, h, now_iso(), commit, mtime, size))

    def rename_file(self, old: str, new: str) -> None:
        for prefix in ("file:", "symbol:"):
            like = prefix + old + ("::%" if prefix == "symbol:" else "")
            self.conn.execute(
                f"UPDATE nodes SET id=REPLACE(id,?,?), path=REPLACE(path,?,?) "
                f"WHERE id LIKE ?", (prefix + old, prefix + new, old, new, like))
        self.conn.execute(
            "UPDATE edges SET src=REPLACE(src,?,?) WHERE src LIKE ?",
            ("file:" + old, "file:" + new, "file:" + old + "%"))
        self.conn.execute(
            "UPDATE edges SET dst=REPLACE(dst,?,?) WHERE dst LIKE ?",
            ("file:" + old, "file:" + new, "file:" + old + "%"))
        row = self.file_row(old)
        if row:
            self.conn.execute("DELETE FROM files WHERE path=?", (old,))
            self.set_file(new, row["hash"], row["last_commit"], row["mtime"] or 0, row["size"] or 0)

    def remove_file(self, path: str) -> None:
        self.conn.execute("DELETE FROM files WHERE path=?", (path,))

    def set_meta(self, k: str, v):
        self.conn.execute("INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v",
                          (k, json.dumps(v)))

    def get_meta(self, k: str):
        r = self.conn.execute("SELECT v FROM meta WHERE k=?", (k,)).fetchone()
        return json.loads(r["v"]) if r else None

    def commit(self):
        self.conn.commit()

    def stats(self) -> dict:
        n = self.conn.execute("SELECT COUNT(*) c FROM nodes").fetchone()["c"]
        e = self.conn.execute("SELECT COUNT(*) c FROM edges").fetchone()["c"]
        f = self.conn.execute("SELECT COUNT(*) c FROM files").fetchone()["c"]
        archived = self.conn.execute(
            "SELECT COUNT(*) c FROM nodes WHERE status='archived'").fetchone()["c"]
        by_type = {r["type"]: r["c"] for r in
                   self.conn.execute("SELECT type, COUNT(*) c FROM nodes "
                                     "WHERE COALESCE(status,'active')='active' GROUP BY type")}
        return {"nodes": n, "edges": e, "files": f, "archived": archived, "by_type": by_type}

    def graph_version(self) -> int:
        return int((self.get_meta("graph_version") or 0))

    def bump_version(self) -> None:
        self.set_meta("graph_version", self.graph_version() + 1)

# --------------------------------------------------------------------------
# Source scanners
# --------------------------------------------------------------------------

TS_IMPORT_RE = re.compile(r"""from\s+["']([^"']+)["']|import\s+["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)""")
TS_EXPORT_FN_RE = re.compile(r"""export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z0-9_$]+)""")
EXPRESS_ROUTE_RE = re.compile(
    r"""(\w+Router|\w*router|apiRouter|app)\.(get|post|put|patch|delete)\((.*?)\);""", re.S)
PY_IMPORT_RE = re.compile(r"^\s*(?:from\s+([\w\.]+)\s+import|import\s+([\w\.]+))", re.M)
PY_DEF_RE = re.compile(r"^(?:async\s+)?def\s+([A-Za-z_]\w*)|^class\s+([A-Za-z_]\w*)", re.M)
FASTAPI_ROUTE_RE = re.compile(r"""@(?:router|app)\.(get|post|put|patch|delete)\(\s*["']([^"']+)""")
MONGOOSE_MODEL_RE = re.compile(r"""(?:model\s*\(\s*["'](\w+)["']|export\s+const\s+(\w+Model))""")
API_CALL_RE = re.compile(r"""apiClient\.(get|post|put|patch|delete)(?:<(?:[^<>]|<[^<>]*>)*>)?\(\s*[`"']([^`"']+)""")
REMOTE_FETCH_RE = re.compile(
    r"""(?:fetch|axios\.\w+|\.(?:post|get|put|patch|delete))\(\s*[`"']"""
    r"""(?:[^`"']|\$\{[^}]*\})*?(?P<path>/api/[\w/\-.]+)""")
IDENT_RE = re.compile(r"\b[A-Za-z_$][A-Za-z0-9_$]*\b")


def scan_ts(path: str, text: str) -> dict:
    imports = [m[0] or m[1] or m[2] for m in TS_IMPORT_RE.findall(text)]
    symbols = TS_EXPORT_FN_RE.findall(text)
    routes = []
    for m in EXPRESS_ROUTE_RE.finditer(text):
        router, method, argstr = m.group(1), m.group(2).upper(), m.group(3)
        sub = re.match(r"\s*[\"'`]([^\"'`]+)", argstr)
        sub = sub.group(1) if sub else "/"
        handlers = [h for h in IDENT_RE.findall(argstr)
                    if h not in {router, "authenticate", "authorize", "validateRequest", "Router"}]
        routes.append((router, method, sub, handlers))
    models = [a or (b or "") for a, b in MONGOOSE_MODEL_RE.findall(text)]
    api_calls = [(m[0].upper(), m[1]) for m in API_CALL_RE.findall(text)]
    remote_calls = [m for m in REMOTE_FETCH_RE.findall(text) if m.startswith("/")]
    return {"imports": imports, "symbols": symbols, "routes": routes,
            "models": [m for m in models if m], "api_calls": api_calls,
            "remote_calls": remote_calls}


def scan_py(path: str, text: str) -> dict:
    imports = [m[0] or m[1] for m in PY_IMPORT_RE.findall(text)]
    symbols = [a or b for a, b in PY_DEF_RE.findall(text)]
    routes = [(m[0].upper(), m[1]) for m in FASTAPI_ROUTE_RE.findall(text)]  # (method, subpath)
    return {"imports": imports, "symbols": symbols, "routes": routes,
            "models": [], "api_calls": [], "remote_calls": []}


def resolve_import(src_path: str, spec: str) -> str | None:
    """Resolve a relative TS import or an app.* Python import to a repo path."""
    src = Path(src_path)
    if spec.startswith("."):
        if ASSET_RE.search(spec):  # style/image assets aren't indexed as source
            return None
        # TypeScript ESM emits "./x.js" specifiers that map to x.ts on disk
        if spec.endswith(".js"):
            spec = spec[:-3]
        base = (src.parent / spec).resolve()
        for ext in ("", ".ts", ".tsx", "/index.ts", ".py", "/__init__.py"):
            cand = Path(str(base) + ext)
            try:
                cand = cand.resolve()
                if cand.is_file() and cand.is_relative_to(PROJECT_ROOT.resolve()):
                    return str(cand.relative_to(PROJECT_ROOT))
            except Exception:
                continue
        return None
    if spec.startswith("app."):
        parts = spec.split(".")
        cand = PROJECT_ROOT / "ai-service" / Path(*parts)
        for ext in (".py", "/__init__.py"):
            p = Path(str(cand) + ext)
            if p.is_file():
                return str(p.relative_to(PROJECT_ROOT))
    return None

# --------------------------------------------------------------------------
# Builder: analyze one file into graph nodes/edges (with confidence/method)
# --------------------------------------------------------------------------

AI_SERVICE_PREFIX = "/api/ai"  # ai-service/app/config/settings.py: api_prefix


def classify_file(rel: str) -> str:
    if rel.startswith("frontend/"):
        if "/pages/" in rel:
            return "frontend-page"
        if "/components/" in rel:
            return "frontend-component"
        if "/services/" in rel or "/hooks/" in rel:
            return "service"
        return "file"
    if rel.startswith("backend/"):
        for d, t in (("/controllers/", "backend-controller"),
                     ("/services/", "backend-service"),
                     ("/repositories/", "backend-repository"),
                     ("/models/", "model"),
                     ("/routes/", "module"),
                     ("/middlewares/", "file"),
                     ("/validators/", "file")):
            if d in rel:
                return t
        return "file"
    if rel.startswith("ai-service/"):
        if "/controllers/" in rel:
            return "backend-controller"
        if "/services/" in rel:
            return "backend-service"
        return "file"
    return "file"


class Builder:
    def __init__(self, g: Graph, features: dict):
        self.g = g
        self.features = features
        self._prefixes = None

    def route_prefixes(self) -> dict:
        if self._prefixes is None:
            idx = PROJECT_ROOT / "backend/src/routes/index.ts"
            prefixes = {}
            # apiRouter mount base: app.use(config.apiPrefix, apiRouter), where
            # API_PREFIX defaults to /api/v1 (backend/src/config/env.ts)
            base = "/api/v1"
            env_ts = PROJECT_ROOT / "backend/src/config/env.ts"
            if env_ts.is_file():
                m = re.search(r'API_PREFIX:[^,]*default\("([^"]+)"\)', env_ts.read_text(errors="ignore"))
                if m:
                    base = m.group(1)
            if idx.is_file():
                for m in re.finditer(
                        r'use\(\s*["\']([^"\']+)["\']\s*,\s*(\w+)Router',
                        idx.read_text(errors="ignore")):
                    prefixes[m.group(2).lower()] = normalize_path(base + m.group(1))
            self._prefixes = prefixes
        return self._prefixes

    def route_prefix_for(self, rel: str) -> str:
        if not rel.startswith("backend/src/routes/"):
            return ""
        name = Path(rel).name.replace(".routes.ts", "")
        return self.route_prefixes().get(name, "")

    def analyze_file(self, rel: str, text: str) -> None:
        g = self.g
        ext = Path(rel).suffix
        fid = f"file:{rel}"
        ftype = classify_file(rel)

        g.add_node(fid, ftype, Path(rel).name, rel, {"ext": ext})

        if ext in TS_IMPL_EXTS:
            info = scan_ts(rel, text)
        elif ext in PY_EXTS:
            info = scan_py(rel, text)
        else:
            info = {"imports": [], "symbols": [], "routes": [], "models": [],
                    "api_calls": [], "remote_calls": []}

        # ---- imports + layer-aware relationships --------------------------
        for spec in info["imports"]:
            target = resolve_import(rel, spec)
            if not target:
                continue
            tid = f"file:{target}"
            g.add_edge(fid, tid, "IMPORTS", 0.98, "static-import")
            ttype = classify_file(target)
            if ftype == "backend-controller" and ttype == "backend-service":
                g.add_edge(fid, tid, "CALLS_SERVICE", 0.9, "controller-imports-service")
            elif ftype == "backend-service" and ttype == "backend-repository":
                g.add_edge(fid, tid, "DEPENDS_ON", 0.9, "service-imports-repository")
            elif ftype == "backend-repository" and ttype == "model":
                g.add_edge(fid, tid, "USES", 0.9, "repository-imports-model")

        # ---- symbols -------------------------------------------------------
        for sym in info["symbols"][:60]:
            sid = f"symbol:{rel}::{sym}"
            g.add_node(sid, "class" if sym[0].isupper() else "function", sym, rel, {})
            g.add_edge(fid, sid, "CONTAINS", 1.0, "source-scan")

        # ---- express routes -> endpoint nodes ------------------------------
        if ext in TS_IMPL_EXTS and info["routes"]:
            prefix = self.route_prefix_for(rel)
            for _, method, sub, handlers in info["routes"]:
                if not sub.startswith("/"):
                    sub = "/" + sub
                full = normalize_path(prefix + sub)
                eid = f"endpoint:{method} {full}"
                g.add_node(eid, "endpoint", f"{method} {full}", rel, {})
                g.add_edge(fid, eid, "EXPOSES", 0.98, "express-route")
                for h in handlers:
                    tgt = self.find_symbol(h, rel)
                    if tgt:
                        g.add_edge(eid, tgt["id"], "ROUTES_TO", 0.9, "express-route-handler")

        # ---- fastapi routes -------------------------------------------------
        if ext in PY_EXTS and info["routes"]:
            for method, sub in info["routes"]:
                full = normalize_path(AI_SERVICE_PREFIX + "/" + sub.strip("/"))
                eid = f"endpoint:{method} {full}"
                g.add_node(eid, "endpoint", f"{method} {full}", rel, {})
                g.add_edge(fid, eid, "EXPOSES", 0.98, "fastapi-route")

        # ---- mongoose models -> collections --------------------------------
        for model in info["models"]:
            coll = camel_to_snake(model)
            mid = f"collection:{coll}"
            g.add_node(mid, "table", coll, None, {"database": "mongodb"})
            g.add_edge(fid, mid, "STORES_IN", 0.95, "mongoose-model")

        # ---- frontend api calls -> HTTP_CALLS endpoints ----------------------
        for method, url in info["api_calls"]:
            if not url.startswith("/"):
                continue
            full = normalize_path(url if url.startswith("/api") else "/api/v1" + url)
            eid = f"endpoint:{method} {full}"
            g.add_node(eid, "endpoint", f"{method} {full}", None, {})
            g.add_edge(fid, eid, "HTTP_CALLS", 0.98, "axios-call")

        # ---- backend remote calls -> FORWARDS_TO ai-service ------------------
        for path_frag in info["remote_calls"]:
            if path_frag.startswith(AI_SERVICE_PREFIX):
                full = normalize_path(path_frag)
                eid = f"endpoint:{full}" if not full.startswith("POST") else None
                # find endpoint node regardless of method
                row = g.conn.execute(
                    "SELECT * FROM nodes WHERE id LIKE 'endpoint:%' AND label LIKE ? "
                    "AND COALESCE(status,'active')='active'", (f"%{full}%",)).fetchone()
                if row:
                    g.add_edge(fid, row["id"], "FORWARDS_TO", 0.9, "backend-remote-fetch")

        # ---- repository -> collection (naming convention, medium confidence) --
        if ftype == "backend-repository":
            name = Path(rel).name.replace(".repository.ts", "").lower()
            for coll_node in g.nodes_by_type("table"):
                coll = coll_node["label"].lower()
                if name and (name == coll or name == coll.rstrip("s") or coll.startswith(name)):
                    g.add_edge(fid, coll_node["id"], "READS_COLLECTION", 0.7, "repository-naming")
                    g.add_edge(fid, coll_node["id"], "WRITES_COLLECTION", 0.7, "repository-naming")

        # ---- tests -----------------------------------------------------------
        if is_test_file(rel):
            tested = infer_test_target(rel)
            if tested:
                g.add_edge(fid, f"file:{tested}", "TESTS", 0.95, "test-naming")

        # ---- features ----------------------------------------------------------
        for feat_id, feat in self.features.items():
            if match_globs(rel, feat.get("globs", [])):
                g.add_edge(f"feature:{feat_id}", fid, "IMPLEMENTS_FEATURE", 1.0, "feature-registry")
            else:
                for kw in feat.get("keywords", []):
                    if kw.lower() in rel.lower():
                        g.add_edge(f"feature:{feat_id}", fid, "RELATED_TO", 0.6, "keyword-path")
                        break

    def find_symbol(self, name: str, route_rel: str):
        rows = self.g.conn.execute(
            "SELECT * FROM nodes WHERE type IN ('function','class') AND label=? "
            "AND COALESCE(status,'active')='active'", (name,)).fetchall()
        # prefer symbols in files imported by the route file
        preferred = [r for r in rows if r["path"] and r["path"].startswith("backend/src/controllers")]
        return (preferred or rows or [None])[0]

    def build_service_graph(self) -> None:
        """Model the cross-service architecture: React -> Express -> FastAPI -> MongoDB."""
        g = self.g
        services = [
            ("service:frontend", "service", "Frontend (React/Vite)", "frontend", {}),
            ("service:backend", "service", "Express Backend (Node/TS)", "backend", {}),
            ("service:ai-service", "service", "FastAPI AI Service (Python)", "ai-service", {}),
            ("service:mongodb", "database", "MongoDB", None, {"engine": "mongodb"}),
        ]
        for sid, t, label, sub, meta in services:
            meta = dict(meta)
            if sub:
                meta["subdir"] = sub
            g.add_node(sid, t, label, None, meta)

        client = PROJECT_ROOT / "frontend/src/services/api/client.ts"
        g.add_edge("service:frontend", "service:backend", "HTTP_CALLS",
                   0.95 if client.is_file() else 0.7,
                   "axios-baseurl" if client.is_file() else "architecture-config")

        ai_svc = PROJECT_ROOT / "backend/src/services/ai.service.ts"
        g.add_edge("service:backend", "service:ai-service", "FORWARDS_TO",
                   0.95 if ai_svc.is_file() else 0.7,
                   "backend-remote-fetch" if ai_svc.is_file() else "architecture-config")

        db_conn = PROJECT_ROOT / "backend/src/database/connection.ts"
        g.add_edge("service:backend", "service:mongodb", "CONNECTS_TO",
                   0.98 if db_conn.is_file() else 0.7,
                   "mongoose-connect" if db_conn.is_file() else "architecture-config")

        # wire file nodes to their service
        for sid, _, _, sub, _ in services:
            if not sub:
                continue
            for r in g.conn.execute(
                    "SELECT id FROM nodes WHERE type LIKE 'file%' OR type IN "
                    "('frontend-page','frontend-component','backend-controller',"
                    "'backend-service','backend-repository','model','module','service','class','function')"):
                nid = r["id"]
                path = g.node(nid)["path"] if g.node(nid) else None
                if path and path.startswith(sub + "/") and (nid.startswith("file:")):
                    g.add_edge(sid, nid, "CONTAINS", 1.0, "path-prefix")

    def build_architecture_memory_edges(self) -> None:
        mem = load_json(ARCH_MEMORY_PATH, {})
        g = self.g
        for constraint in mem.get("constraints", []):
            for ref in constraint.get("refs", []):
                if self.g.nodes_by_path(ref):
                    g.add_node(f"constraint:{constraint['id']}", "decision",
                               constraint["title"], None, {"kind": "constraint"})
                    g.add_edge(f"constraint:{constraint['id']}", f"file:{ref}", "AFFECTS",
                               0.9, "architecture-memory")


def normalize_path(p: str) -> str:
    p = re.sub(r"/+", "/", p)
    if len(p) > 1 and p.endswith("/"):
        p = p[:-1]
    return p or "/"


def camel_to_snake(s: str) -> str:
    return re.sub(r"(?<!^)(?=[A-Z])", "_", s).lower()


def is_test_file(rel: str) -> bool:
    return ("/tests/" in rel and rel.endswith(".py")) or ".test." in rel or ".spec." in rel


def infer_test_target(rel: str) -> str | None:
    if rel.startswith("ai-service/tests/test_"):
        name = Path(rel).stem[len("test_"):]
        for cand in (PROJECT_ROOT / "ai-service" / "app").rglob(f"{name}.py"):
            return str(cand.relative_to(PROJECT_ROOT))
    return None

# --------------------------------------------------------------------------
# File collection (fast walk; mtime+size shortcut avoids re-hashing)
# --------------------------------------------------------------------------


def collect_files() -> dict:
    """Return {rel_path: (mtime, size)} for candidate source/doc files."""
    out = {}
    for dirpath, dirnames, filenames in os.walk(PROJECT_ROOT):
        rel_dir = os.path.relpath(dirpath, PROJECT_ROOT)
        parts = [] if rel_dir == "." else rel_dir.split(os.sep)
        if any(p in IGNORE_DIRS or any(fnmatch.fnmatch(p, ig) for ig in IGNORE_DIRS)
               for p in parts):
            dirnames[:] = []
            continue
        dirnames[:] = [d for d in dirnames
                       if d not in IGNORE_DIRS and not any(fnmatch.fnmatch(d, ig) for ig in IGNORE_DIRS)]
        for fn in filenames:
            if os.path.splitext(fn)[1] in SOURCE_EXTS or os.path.splitext(fn)[1] in DOC_EXTS:
                full = Path(dirpath) / fn
                try:
                    st = full.stat()
                    if fn.endswith(".md") and st.st_size > 200_000:
                        continue
                    out[str(full.relative_to(PROJECT_ROOT))] = (st.st_mtime, st.st_size)
                except OSError:
                    continue
    return out

# --------------------------------------------------------------------------
# Sync / rebuild
# --------------------------------------------------------------------------


def do_sync(g: Graph, full: bool = False, record_pending: bool = True) -> dict:
    gs = git_state()
    commit = gs["commit"]
    features = load_json(FEATURES_PATH, {})
    builder = Builder(g, features)

    proj = load_json(PROJECT_META_PATH, {})
    g.add_node("project:vcgis", "project", proj.get("name", "Volunteer-CGIS"), None, proj)
    for fid_, fdef in features.items():
        g.add_node(f"feature:{fid_}", "feature", fdef.get("name", fid_), None,
                   {"status": fdef.get("status", "active"),
                    "description": fdef.get("description", "")})
        g.add_edge("project:vcgis", f"feature:{fid_}", "CONTAINS", 1.0, "feature-registry")

    # index docs + decisions + architecture memory
    index_docs(g)
    builder.build_service_graph()
    builder.build_architecture_memory_edges()

    known = {r["path"]: r for r in g.all_files()}
    on_disk = collect_files()

    changed, removed, renamed, unchanged = [], [], [], 0
    added_set = set(on_disk) - set(known)

    # rename detection: removed file whose hash matches an added file
    for old in sorted(set(known) - set(on_disk)):
        match = None
        for new in added_set:
            p = PROJECT_ROOT / new
            if p.stat().st_size == known[old]["size"] and sha256_file(p) == known[old]["hash"]:
                match = new
                break
        if match:
            g.rename_file(old, match)
            renamed.append((old, match))
            added_set.discard(match)
        else:
            removed.append(old)

    for rel, (mtime, size) in sorted(on_disk.items()):
        row = known.get(rel)
        if not full and row and row["mtime"] == mtime and row["size"] == size:
            unchanged += 1
            continue
        h = sha256_file(PROJECT_ROOT / rel)
        if not full and row and row["hash"] == h:
            g.set_file(rel, h, commit, mtime, size)
            unchanged += 1
            continue
        text = (PROJECT_ROOT / rel).read_text(errors="ignore")
        builder.analyze_file(rel, text)
        g.set_file(rel, h, commit, mtime, size)
        changed.append(rel)

    for rel in removed:
        # archive nodes (historical queries) and drop the hash-tracking row
        for n in g.conn.execute("SELECT id FROM nodes WHERE path=?", (rel,)).fetchall():
            g.archive_node(n["id"])
        g.remove_file(rel)

    if changed or removed or renamed or full:
        g.bump_version()

    g.set_meta("last_sync", {"time": now_iso(), "commit": commit,
                             "changed": len(changed), "removed": len(removed),
                             "schema_version": SCHEMA_VERSION})
    g.commit()

    export_graph_json(g)
    save_json(STATE_PATH, {
        "last_sync": now_iso(), "commit": commit, "branch": gs["branch"],
        "files_indexed": len(on_disk), "changed": len(changed),
        "removed": len(removed), "renamed": len(renamed), "unchanged": unchanged,
        "graph_version": g.graph_version(),
    })

    pending = None
    if record_pending and changed and not full:
        pending = record_pending_change(g, changed)
    return {"changed": changed, "removed": removed, "renamed": renamed,
            "unchanged": unchanged, "pending": pending}


ASSET_RE = re.compile(r"\.(css|scss|svg|png|jpe?g|gif|webp|woff2?|json)$", re.I)


def index_docs(g: Graph) -> None:
    docs_dir = AI_DIR / "docs"
    if not docs_dir.is_dir():
        return
    for p in docs_dir.rglob("*.md"):
        rel = str(p.relative_to(PROJECT_ROOT))
        did = f"doc:{rel}"
        g.add_node(did, "documentation", p.name, rel, {})
        if "/features/" in rel:
            # link to feature ids listed in the doc's RELATED FEATURES line,
            # falling back to the filename stem
            text = p.read_text(errors="ignore")
            m = re.search(r"RELATED FEATURES?:\s*(.+)", text)
            ids = [i.strip() for i in (m.group(1).split(",") if m else [p.stem])]
            linked = False
            for fid_ in ids:
                if g.node(f"feature:{fid_}"):
                    g.add_edge(f"feature:{fid_}", did, "DOCUMENTED_BY", 1.0, "docs-index")
                    linked = True
            if not linked:
                # no feature link; still indexed and searchable on its own
                g.add_edge("project:vcgis", did, "DOCUMENTED_BY", 0.6, "docs-index-unlinked")
        if "/decisions/" in rel:
            g.add_node(f"decision:{p.stem}", "decision",
                       p.stem.replace("-", " ").title(), rel, {"kind": "adr"})
            g.add_edge(f"decision:{p.stem}", did, "DOCUMENTED_BY", 1.0, "docs-index")


def export_graph_json(g: Graph) -> None:
    nodes = []
    for r in g.conn.execute("SELECT * FROM nodes"):
        d = dict(r)
        d["meta"] = json.loads(r["meta"] or "{}")
        nodes.append(d)
    edges = [dict(r) for r in g.conn.execute("SELECT * FROM edges")]
    out = AI_DIR / "graph"
    save_json(out / "nodes.json", nodes)
    save_json(out / "edges.json", edges)
    save_json(out / "indexes.json", {
        "endpoints": [n["label"] for n in nodes if n["type"] == "endpoint"
                      and n.get("status", "active") == "active"],
        "features": [n["label"] for n in nodes if n["type"] == "feature"],
        "collections": [n["label"] for n in nodes if n["type"] == "table"],
        "graph_version": g.graph_version(),
    })

# --------------------------------------------------------------------------
# Change memory (append-only ledger)
# --------------------------------------------------------------------------


def read_ledger() -> list:
    if not LEDGER_PATH.exists():
        return []
    out = []
    for ln in LEDGER_PATH.read_text().splitlines():
        if ln.strip():
            try:
                out.append(json.loads(ln))
            except Exception:
                pass
    return out


def ledger_append(rec: dict) -> None:
    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LEDGER_PATH, "a") as f:
        f.write(json.dumps(rec) + "\n")


def make_change_record(g: Graph, files_changed: list, task="", status="confirmed",
                       change_type="unknown") -> dict:
    gs = git_state()
    feats, apis, colls, tests = set(), set(), set(), set()
    for rel in files_changed:
        nodes = g.nodes_by_path(rel)
        if not nodes:
            continue
        nid = nodes[0]["id"]
        feats |= set(features_for_node(g, nid))
        for e in g.out_edges(nid):
            if e["type"] in ("EXPOSES", "HTTP_CALLS", "FORWARDS_TO"):
                apis.add(e["dst"].split("endpoint:")[-1])
            if e["type"] in ("STORES_IN", "READS_COLLECTION", "WRITES_COLLECTION"):
                colls.add(e["dst"].split("collection:")[-1])
        for e in g.in_edges(nid):
            if e["type"] == "TESTS":
                n = g.node(e["src"])
                if n and n["path"]:
                    tests.add(n["path"])
    services = sorted({service_of(f) for f in files_changed if service_of(f)})
    return {
        "change_id": f"change-{time.strftime('%Y-%m-%d')}-{len(read_ledger())+1:03d}",
        "timestamp": now_iso(), "agent": detect_agent(), "task": task,
        "status": status,  # PENDING_AGENT_CONFIRMATION | confirmed
        "branch": gs["branch"], "git_commit": gs["commit"],
        "files_changed": files_changed, "features": sorted(feats),
        "components": [Path(f).name for f in files_changed],
        "apis": sorted(apis), "services": services, "database": sorted(colls),
        "tests": sorted(tests), "documentation": [], "decisions": [],
        "impact": [], "change_type": change_type, "risk": "medium",
        "confidence": "medium", "reason": "",
    }


def record_pending_change(g: Graph, changed: list) -> dict | None:
    """sync detected modifications -> provisional ledger entry awaiting the agent."""
    recent = [c for c in read_ledger() if c.get("status") == "PENDING_AGENT_CONFIRMATION"]
    covered = {f for c in recent for f in c.get("files_changed", [])}
    fresh = [f for f in changed if f not in covered]
    if not fresh:
        return None
    rec = make_change_record(g, fresh, task="", status="PENDING_AGENT_CONFIRMATION",
                             change_type="unclassified")
    rec["note"] = ("Provisional record created by `sync` — finalize with "
                   "`ai-project record-change --confirm`.")
    ledger_append(rec)
    return rec


def service_of(rel: str) -> str | None:
    for s in ("frontend", "backend", "ai-service"):
        if rel.startswith(s + "/"):
            return s
    return None

# --------------------------------------------------------------------------
# Context engine (task-aware, cached, manifest, token-budget modes)
# --------------------------------------------------------------------------

MODES = ("compact", "normal", "deep")


def build_context(g: Graph, task: str, mode: str = "normal") -> tuple:
    """Return (report_text, manifest_dict). Never dumps the whole repo."""
    concepts = extract_concepts(task)
    q = " ".join(concepts)

    # 1. features
    features = load_json(FEATURES_PATH, {})
    feat_scores = {}
    for fid_, fdef in features.items():
        hay = " ".join([fdef.get("name", ""), fdef.get("description", ""),
                        " ".join(fdef.get("keywords", []))]).lower()
        score = sum(1 for c in concepts if c in hay)
        if score:
            feat_scores[fid_] = score
    feat_ids = [f for f, s in sorted(feat_scores.items(), key=lambda x: -x[1])][:3 if mode != "compact" else 2]

    # 2. matched nodes/files with reasons
    matched = g.search_nodes(q or task)[:25 if mode == "deep" else 12]
    reasons = {}
    files = {}
    for r in matched:
        if r["path"]:
            files.setdefault(r["path"], set()).add("direct name/concept match")

    for f in feat_ids:
        for p in files_for_feature(g, f)[:15]:
            files.setdefault(p, set()).add(f"implements feature {f}")

    # endpoints / collections near matched files (1 relationship hop)
    apis, colls, tests = {}, set(), set()
    for p in list(files):
        for n in g.nodes_by_path(p):
            for e in g.out_edges(n["id"]):
                if e["type"] in ("EXPOSES", "HTTP_CALLS", "FORWARDS_TO"):
                    apis.setdefault(e["dst"].split("endpoint:")[-1], set()).add(p)
                if e["type"] in ("STORES_IN", "READS_COLLECTION", "WRITES_COLLECTION"):
                    colls.add(e["dst"].split("collection:")[-1])
            for e in g.in_edges(n["id"]):
                if e["type"] == "TESTS":
                    t = g.node(e["src"])
                    if t and t["path"]:
                        tests.add(t["path"])
    # endpoints directly matching the task
    for r in matched:
        if r["type"] == "endpoint":
            apis.setdefault(r["label"], set()).add("task keyword match")

    # deep mode: widen one more hop over imports
    if mode == "deep":
        for p in list(files):
            for n in g.nodes_by_path(p):
                for e in g.out_edges(n["id"], include_archived=False):
                    if e["type"] == "IMPORTS":
                        t = g.node(e["dst"])
                        if t and t["path"] and len(files) < 40:
                            files.setdefault(t["path"], set()).add(f"dependency of {p}")

    # 3. recent changes (ledger) related to concepts
    ledger = read_ledger()
    related_changes = []
    for c in reversed(ledger):
        hay = " ".join(c.get("features", []) + c.get("files_changed", [])
                       + [c.get("task", "")] + c.get("apis", [])).lower()
        if any(cc in hay for cc in concepts):
            related_changes.append(c)
        if len(related_changes) >= (10 if mode == "deep" else 5):
            break

    # 4. docs + decisions scored by content
    docs = score_docs(g, concepts, limit=3 if mode != "compact" else 1)
    decisions = score_decisions(g, concepts, limit=3 if mode != "compact" else 1)

    # 5. services touched
    services = sorted({service_of(p) for p in files if service_of(p)})
    if colls:
        services.append("mongodb") if "mongodb" not in services else None

    # 6. ranking (priority: feature core > direct match > dependency)
    ranked = []
    for p, why in files.items():
        feat_core = any(p in files_for_feature(g, f) for f in feat_ids)
        score = (5 if feat_core else 0) + (3 if "direct name/concept match" in why else 0) \
            + len(why)
        nodes = g.nodes_by_path(p)
        ntype = nodes[0]["type"] if nodes else "file"
        ranked.append((-score, p, ntype, sorted(why)))
    ranked.sort()

    # confidence: strength of feature + file + api matches
    conf = min(0.95, 0.25 + 0.2 * len(feat_ids) + 0.02 * len(files)
               + 0.05 * len(apis) + (0.05 if related_changes else 0))

    manifest = {
        "task": task, "mode": mode, "graph_version": g.graph_version(),
        "generated": now_iso(),
        "features": feat_ids, "apis": sorted(apis), "services": services,
        "database": sorted(colls), "tests": sorted(tests),
        "docs": [d["path"] for d in docs], "decisions": [d["id"] for d in decisions],
        "changes": [c["change_id"] for c in related_changes],
        "confidence": round(conf, 2),
        "files": [{"path": p, "reason": "; ".join(w), "priority": i + 1,
                   "type": t, "hash": file_hash_of(g, p)}
                  for i, (_, p, t, w) in enumerate(ranked[:40])],
    }
    text = render_context(g, task, manifest, ranked, apis, colls, tests,
                          related_changes, docs, decisions, feat_ids, conf)
    return text, manifest


def file_hash_of(g: Graph, rel: str) -> str | None:
    p = PROJECT_ROOT / rel
    return sha256_file(p) if p.exists() else None


def render_context(g, task, manifest, ranked, apis, colls, tests,
                   related_changes, docs, decisions, feat_ids, conf) -> str:
    L = [f"TASK\n{task}", ""]
    features = load_json(FEATURES_PATH, {})
    L.append("FEATURE")
    L += [f"  {f} — {features.get(f, {}).get('name', f)}" for f in feat_ids] or ["  (no strong feature match)"]

    svc_labels = {"frontend": "Frontend (React)", "backend": "Express Backend",
                  "ai-service": "FastAPI AI Service", "mongodb": "MongoDB"}
    L += ["", "SERVICES"]
    L += [f"  {svc_labels.get(s, s)}" for s in manifest["services"]] or ["  (undetermined)"]

    buckets = {"RELEVANT FRONTEND": [], "RELEVANT EXPRESS BACKEND": [],
               "RELEVANT FASTAPI AI SERVICE": [], "RELEVANT OTHER": []}
    for _, p, t, _ in ranked:
        s = service_of(p)
        key = ("RELEVANT FRONTEND" if s == "frontend"
               else "RELEVANT EXPRESS BACKEND" if s == "backend"
               else "RELEVANT FASTAPI AI SERVICE" if s == "ai-service" else "RELEVANT OTHER")
        buckets[key].append(p)
    for key, items in buckets.items():
        if items:
            L += ["", key] + [f"  {i}" for i in items[:10]]

    if colls:
        L += ["", "RELEVANT DATABASE"] + [f"  {c}" for c in sorted(colls)]
    if apis:
        L += ["", "RELEVANT APIs"] + [f"  {a}  ← {', '.join(sorted(src)[:2])}"
                                      for a, src in sorted(apis.items())]
    if related_changes:
        L += ["", "RECENT RELATED CHANGES"]
        L += [f"  [{c['change_id']}] {c.get('task') or '; '.join(c.get('files_changed', [])[:2])} "
              f"({c.get('agent')}, {c.get('timestamp', '')[:10]}, {c.get('status')})"
              for c in related_changes]
    if decisions:
        L += ["", "ARCHITECTURAL DECISIONS"]
        L += [f"  {d['id'].split('decision:')[-1]} — {d['title']} ({d['path']})" for d in decisions]
    if docs:
        L += ["", "DOCUMENTATION"] + [f"  {d['path']} — {d['title']}" for d in docs]
    if tests:
        L += ["", "TESTS"] + [f"  {t}" for t in sorted(tests)]

    L += ["", architecture_text(PROJECT_ROOT, task)]
    L += ["", "RECOMMENDED FILES TO READ"]
    L += [f"  {i+1}. {p}  ({'; '.join(w)[:80]})" for i, (_, p, t, w) in enumerate(ranked[:6])]

    chain = " → ".join([svc_labels.get(s, s) for s in manifest["services"]])
    L += ["", "POTENTIAL IMPACT", f"  {chain or 'local'}"]
    L += ["", "CONFIDENCE", f"  {conf:.2f}",
          "", "Next: `ai-project impact-task` before editing; after editing run "
          "`sync` + `record-change --confirm`."]
    return "\n".join(L)


def score_docs(g: Graph, concepts: list, limit=3) -> list:
    out = []
    for n in g.nodes_by_type("documentation"):
        p = PROJECT_ROOT / n["path"]
        if not p.exists():
            continue
        try:
            content = p.read_text(errors="ignore").lower()
        except OSError:
            continue
        score = sum(1 for c in concepts if c in content)
        if score:
            title = first_heading(p) or n["label"]
            out.append({"path": n["path"], "score": score, "title": title})
    out.sort(key=lambda d: -d["score"])
    return out[:limit]


def score_decisions(g: Graph, concepts: list, limit=3) -> list:
    out = []
    for n in g.nodes_by_type("decision"):
        if not n["path"]:
            # constraint node from architecture-memory: match against its own text
            hay = json.dumps(n["meta"] or {}) + " " + n["label"]
            score = sum(1 for c in concepts if c in hay.lower())
            if score:
                out.append({"id": n["id"], "title": n["label"],
                            "path": ".ai/metadata/architecture-memory.json",
                            "score": score})
            continue
        p = PROJECT_ROOT / n["path"]
        if not p.is_file():
            continue
        content = p.read_text(errors="ignore").lower()
        score = sum(1 for c in concepts if c in content)
        if score:
            out.append({"id": n["id"], "title": n["label"], "path": n["path"], "score": score})
    out.sort(key=lambda d: -d["score"])
    return out[:limit]


def first_heading(p: Path) -> str | None:
    try:
        for ln in p.read_text(errors="ignore").splitlines():
            if ln.startswith("# "):
                return ln[2:].strip()
    except OSError:
        pass
    return None


def context_cache_key(task: str, mode: str) -> str:
    return hashlib.sha256(f"{task.strip().lower()}|{mode}".encode()).hexdigest()[:16]


def cached_context(g: Graph, task: str, mode: str) -> tuple | None:
    """Reuse previous context if graph version and file hashes are unchanged."""
    mf = CONTEXT_CACHE_DIR / f"{context_cache_key(task, mode)}.json"
    if not mf.exists():
        return None
    man = load_json(mf, None)
    if not man or man.get("graph_version") != g.graph_version():
        return None
    for fi in man.get("files", []):
        p = PROJECT_ROOT / fi["path"]
        if not p.exists() or sha256_file(p) != fi.get("hash"):
            return None
    man["last_used"] = now_iso()
    save_json(mf, man)
    return man.get("text"), man


def store_context(manifest: dict, text: str) -> None:
    manifest["text"] = text
    save_json(CONTEXT_CACHE_DIR / f"{context_cache_key(manifest['task'], manifest['mode'])}.json",
              manifest)


def get_context(g: Graph, task: str, mode: str = "normal", no_cache: bool = False) -> str:
    if not no_cache:
        hit = cached_context(g, task, mode)
        if hit:
            return f"[CACHED — graph v{g.graph_version()}, inputs unchanged]\n" + hit[0]
    text, manifest = build_context(g, task, mode)
    store_context(manifest, text)
    return text

# --------------------------------------------------------------------------
# Impact / queries
# --------------------------------------------------------------------------


def features_for_node(g: Graph, node_id: str) -> list:
    feats = []
    for e in g.in_edges(node_id):
        if e["type"] in ("IMPLEMENTS_FEATURE", "RELATED_TO") and e["src"].startswith("feature:"):
            feats.append(e["src"].split(":", 1)[1])
    return sorted(set(feats))


def files_for_feature(g: Graph, feat_id: str) -> list:
    fid = f"feature:{feat_id}"
    if not g.node(fid):
        return []
    return [e["dst"].split("file:")[-1] for e in g.out_edges(fid)
            if e["type"] == "IMPLEMENTS_FEATURE" and e["dst"].startswith("file:")]


def file_node(g: Graph, name: str):
    """Find a file node by exact path, suffix, or fuzzy name."""
    if "/" in name and (PROJECT_ROOT / name).exists():
        r = g.nodes_by_path(name)
        if r:
            return r[0]
    matches = g.search_nodes(name, types={"file", "frontend-page", "frontend-component",
                                          "backend-service", "backend-controller",
                                          "backend-repository", "model", "module", "service"})
    for m in matches:
        if m["path"] and (m["path"] == name or m["path"].endswith(name)
                          or Path(m["path"]).name == Path(name).name):
            return m
    return matches[0] if matches else None


def impact_of(g: Graph, name: str) -> dict:
    start = file_node(g, name)
    if not start:
        return {}
    direct_deps, upstream, indirect = [], [], []
    for e in g.out_edges(start["id"]):
        if e["type"] == "IMPORTS":
            n = g.node(e["dst"])
            if n and n["path"]:
                direct_deps.append(n["path"])
    for e in g.in_edges(start["id"]):
        if e["type"] == "IMPORTS":
            n = g.node(e["src"])
            if n and n["path"]:
                upstream.append(n["path"])
            for e2 in g.in_edges(e["src"]):
                n2 = g.node(e2["src"])
                if n2 and n2["path"] and n2["path"] not in upstream:
                    indirect.append(n2["path"])
    endpoints = [e["dst"].split("endpoint:")[-1] for e in g.out_edges(start["id"])
                 if e["type"] in ("EXPOSES", "HTTP_CALLS", "FORWARDS_TO")]
    colls = [e["dst"].split("collection:")[-1] for e in g.out_edges(start["id"])
             if e["type"] in ("STORES_IN", "READS_COLLECTION", "WRITES_COLLECTION")]
    tests = [g.node(e["src"])["path"] for e in g.in_edges(start["id"])
             if e["type"] == "TESTS" and g.node(e["src"])]
    return {"node": start, "direct_deps": direct_deps, "upstream": sorted(set(upstream)),
            "indirect_upstream": sorted(set(indirect)),
            "features": features_for_node(g, start["id"]),
            "endpoints": sorted(set(endpoints)), "collections": sorted(set(colls)),
            "tests": tests, "docs": []}


def impact_task(g: Graph, task: str) -> str:
    concepts = extract_concepts(task)
    q = " ".join(concepts)
    matched = g.search_nodes(q or task, types={"file", "frontend-page", "frontend-component",
                                               "backend-service", "backend-controller",
                                               "backend-repository", "model"})[:8]
    direct, upstream, downstream, apis, colls, tests = set(), set(), set(), set(), set(), set()
    for m in matched:
        im = impact_of(g, m["path"] or m["id"])
        if not im:
            continue
        direct.add(im["node"]["path"])
        upstream |= set(im["upstream"]) | set(im["indirect_upstream"])
        apis |= set(im["endpoints"])
        colls |= set(im["collections"])
        tests |= set(im["tests"])
    for m in matched:
        im = impact_of(g, m["path"] or m["id"])
        if im:
            downstream |= set(im["direct_deps"])
    downstream -= direct

    risk = "Low"
    if colls or len(apis) > 2:
        risk = "High"
    elif apis or len(direct) > 3:
        risk = "Medium"

    def blk(title, items, cls=None):
        if not items:
            return []
        out = [title]
        for i in sorted(items)[:12]:
            out.append(f"  {i}" + (f"   [{cls}]" if cls else ""))
        return out

    lines = [f"TASK: {task}", ""]
    lines += blk("DIRECTLY AFFECTED", direct, "DIRECTLY_CHANGED")
    lines += blk("UPSTREAM (callers/importers)", upstream, "POTENTIALLY_AFFECTED")
    lines += blk("DOWNSTREAM (dependencies)", downstream, "REQUIRES_REVIEW")
    lines += blk("DATABASE", colls)
    lines += blk("TESTS", tests)
    docs = score_docs(g, concepts) + score_decisions(g, concepts)
    if docs:
        lines += ["DOCUMENTATION"]
        lines += [f"  {d['path']}" for d in docs]
    lines += ["", f"RISK: {risk}",
              "Classification: DIRECTLY_CHANGED / POTENTIALLY_AFFECTED / REQUIRES_REVIEW.",
              "Unlisted nodes are UNAFFECTED."]
    return "\n".join(lines)

# --------------------------------------------------------------------------
# New commands: why / history / handoff / docs-check / subgraph / exports
# --------------------------------------------------------------------------


def cmd_why(g: Graph, name: str) -> str:
    start = file_node(g, name) or (g.search_nodes(name) or [None])[0]
    if not start:
        return f"No node matches '{name}'."
    concepts = extract_concepts(start["label"])
    feats = features_for_node(g, start["id"])
    features = load_json(FEATURES_PATH, {})
    L = ["WHY THIS COMPONENT EXISTS", "".ljust(50, "="),
         f"Node: {start['label']} ({start['type']})",
         f"Path: {start['path'] or '-'}", "",
         "PURPOSE"]
    purpose_lines = [f"  Part of feature(s): {', '.join(feats) or 'unassigned'}"]
    for f in feats:
        d = features.get(f, {}).get("description")
        if d:
            purpose_lines.append(f"  {f}: {d}")
    L += purpose_lines

    L += ["", architecture_text(PROJECT_ROOT, start["label"])]
    svc = service_of(start["path"] or "")
    if svc:
        L.append(f"  This component lives in: {svc}")

    decisions = score_decisions(g, concepts + [start["label"].lower()], limit=4)
    if decisions:
        L += ["", "IMPORTANT DECISIONS"]
        L += [f"  {d['title']} — {d['path']}" for d in decisions]

    related = [c for c in read_ledger() if (start["path"] or "") in c.get("files_changed", [])]
    if related:
        L += ["", "RELATED CHANGES (historical)"]
        L += [f"  [{c['change_id']}] {c.get('task') or ', '.join(c.get('files_changed', []))[:60]} "
              f"({c.get('timestamp', '')[:10]})" for c in related[-8:]]

    docs = score_docs(g, concepts + [start["label"].lower()], limit=3)
    if docs:
        L += ["", "DOCUMENTATION"] + [f"  {d['path']} — {d['title']}" for d in docs]

    im = impact_of(g, start["path"] or start["id"]) if start["path"] else {}
    if im:
        L += ["", "CONNECTED TO"]
        L += [f"  imports: {', '.join(Path(d).name for d in im['direct_deps'][:6]) or '-'}"]
        L += [f"  imported by: {', '.join(Path(u).name for u in im['upstream'][:6]) or '-'}"]
        if im["endpoints"]:
            L += [f"  APIs: {', '.join(im['endpoints'][:6])}"]
    return "\n".join(L)


def parse_since(since: str) -> float:
    m = re.match(r"(\d+)([dhw])", since or "")
    if not m:
        return 0
    n, unit = int(m.group(1)), m.group(2)
    secs = {"d": 86400, "h": 3600, "w": 7 * 86400}[unit]
    return time.time() - n * secs


def cmd_history(g: Graph, args) -> str:
    feat = file = None
    since = 0.0
    positional = []
    i = 0
    while i < len(args):
        if args[i] == "--feature":
            feat = args[i + 1]; i += 2
        elif args[i] == "--file":
            file = args[i + 1]; i += 2
        elif args[i] == "--since":
            since = parse_since(args[i + 1]); i += 2
        else:
            positional.append(args[i]); i += 1
    if positional and not feat:
        feat = positional[0]

    entries = read_ledger()
    out = []
    for c in entries:
        ts = c.get("timestamp", "")
        try:
            t = time.mktime(time.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S"))
        except Exception:
            t = 0
        if since and t and t < since:
            continue
        if feat and feat not in c.get("features", []) and feat not in c.get("files_changed", []):
            continue
        if file and file not in c.get("files_changed", []):
            continue
        out.append(c)
    if not out:
        return "No matching change records."
    lines = []
    for c in out:
        lines.append(f"{c.get('timestamp', '')[:10]}  [{c['change_id']}] agent={c.get('agent')} "
                     f"status={c.get('status', 'confirmed')} risk={c.get('risk')}")
        if c.get("task"):
            lines.append(f"    task: {c['task']}")
        if c.get("changes"):
            lines.append(f"    changes: {'; '.join(c['changes'])[:120]}")
        lines.append(f"    files: {', '.join(c.get('files_changed', []))[:120]}")
    return "\n".join(lines)


def cmd_handoff(g: Graph) -> str:
    gs = git_state()
    st = g.stats()
    ledger = read_ledger()
    pending = [c for c in ledger if c.get("status") == "PENDING_AGENT_CONFIRMATION"]
    recent = ledger[-8:]
    active_feats = {}
    for c in recent:
        for f in c.get("features", []):
            active_feats[f] = active_feats.get(f, 0) + 1
    top_feats = [f for f, _ in sorted(active_feats.items(), key=lambda x: -x[1])[:5]]

    L = ["# Current Project State (handoff)", "",
         f"Generated: {now_iso()}  agent-format: universal", "",
         "## Active features (recent change heat)", ]
    L += [f"- {f}" for f in top_feats] or ["- (no recorded changes yet)"]

    L += ["", "## Recent work"]
    L += [f"- [{c['change_id']}] {c.get('task') or ', '.join(c.get('files_changed', [])[:3])} "
          f"({c.get('agent')}, {c.get('timestamp', '')[:10]})" for c in recent] or ["- (none)"]

    L += ["", "## Uncommitted/unrecorded files"]
    if gs["is_git"]:
        L += [f"- {f}" for f in gs["dirty_files"]] or ["- (clean)"]
    else:
        stale = stale_files(g)
        L += [f"- {f} (hash differs from graph — run sync)" for f in stale] or ["- (none)"]

    L += ["", "## Current architecture",
          "- Frontend (React/Vite) → Express Backend (Node/TS) → FastAPI AI Service (Python) → MongoDB",
          f"- Indexed: {st['files']} files, {len(g.nodes_by_type('feature'))} features, "
          f"{len(g.nodes_by_type('endpoint'))} endpoints, graph v{g.graph_version()}"]

    L += ["", "## Important decisions"]
    for d in g.nodes_by_type("decision")[:8]:
        L.append(f"- {d['label']} ({d['path']})")

    L += ["", "## Known issues / pending"]
    L += [f"- PENDING_AGENT_CONFIRMATION: {c['change_id']} → finalize with `record-change --confirm`"
          for c in pending] or ["- none"]
    health = validate_report(g)
    if health["problems"]:
        L.append(f"- Graph health {health['health']:.0f}% — {len(health['problems'])} issue(s); "
                 "run `ai-project sync`")

    L += ["", "## Recommended next steps",
          "1. `.ai/bin/ai-project sync`",
          "2. `.ai/bin/ai-project context \"<your task>\"`",
          "3. Read the recommended files only."]
    text = "\n".join(L)
    HANDOFF_PATH.write_text(text + "\n")
    return text + f"\n\nWritten to {HANDOFF_PATH.relative_to(PROJECT_ROOT)}"


def stale_files(g: Graph) -> list:
    out = []
    for r in g.all_files():
        p = PROJECT_ROOT / r["path"]
        try:
            st = p.stat()
            if st.st_mtime != r["mtime"] or st.st_size != r["size"]:
                out.append(r["path"])
        except OSError:
            out.append(r["path"] + "  (deleted)")
    return out


def cmd_docs_check(g: Graph) -> str:
    features = load_json(FEATURES_PATH, {})
    problems, valid = [], []
    # missing feature docs
    for fid_, fdef in features.items():
        doc = AI_DIR / "docs" / "features" / f"{fid_}.md"
        if not doc.exists() and not any((AI_DIR / "docs" / "features").glob(f"{fid_}*.md")):
            problems.append(f"MISSING: feature doc for '{fid_}' ({fdef.get('name', '')})")
    # stale docs: referenced files no longer exist
    for n in g.nodes_by_type("documentation"):
        p = PROJECT_ROOT / n["path"]
        if not p.exists():
            continue
        text = p.read_text(errors="ignore")
        for ref in re.findall(r"`?([A-Za-z0-9_\-./]+\.(?:ts|tsx|py))`?", text):
            if "/" in ref and not (PROJECT_ROOT / ref).exists():
                problems.append(f"STALE: {n['path']} references missing file {ref}")
        # doc older than the files it documents?
        if "/features/" in str(p):
            feat = p.stem
            for f in files_for_feature(g, feat):
                fp = PROJECT_ROOT / f
                if fp.exists() and fp.stat().st_mtime > p.stat().st_mtime + 2:
                    problems.append(f"POSSIBLY STALE: {n['path']} older than {f}")
                    break
    # missing API docs (endpoints never mentioned in any doc)
    doc_text = " ".join((PROJECT_ROOT / n["path"]).read_text(errors="ignore")
                        for n in g.nodes_by_type("documentation")
                        if (PROJECT_ROOT / n["path"]).exists()).lower()
    undoc = 0
    for e in g.nodes_by_type("endpoint"):
        path_part = e["label"].split(" ", 1)[1]
        if path_part.lower() not in doc_text:
            undoc += 1
    total = len(features) + len(g.nodes_by_type("documentation"))
    health = 100.0 if not total else max(0.0, 100.0 * (total - len(problems)) / total)
    out = [f"Documentation Health: {health:.0f}%", ""]
    out += [f"  {p}" for p in problems] or ["  No stale or missing documentation detected."]
    if undoc:
        out += ["", f"NOTE: {undoc} endpoints are not mentioned in any indexed doc "
                    "(add API sections to feature docs as needed).",
                "Documentation update recommendations are surfaced, never auto-rewritten."]
    return "\n".join(out)


def cmd_subgraph(g: Graph, topic: str, depth: int = 2) -> str:
    seeds = g.search_nodes(topic)[:5]
    if not seeds:
        return f"No nodes match '{topic}'."
    dist = {}
    frontier = [(s["id"], 0) for s in seeds]
    while frontier:
        nid, d = frontier.pop(0)
        if nid in dist or d > depth:
            continue
        n = g.node(nid)
        if not n or (n["status"] == "archived"):
            continue
        dist[nid] = d
        if d < depth:
            for e in g.out_edges(nid, include_archived=False) + g.in_edges(nid, include_archived=False):
                nxt = e["dst"] if e["src"] == nid else e["src"]
                # keep symbol sprawl out: expand symbols only 1 hop
                nn = g.node(nxt)
                if nn and nn["type"] in ("class", "function") and d + 1 > 1:
                    continue
                frontier.append((nxt, d + 1))
    lines = [f"SUBGRAPH: '{topic}' (depth {depth}, {len(dist)} nodes)", "",
             "SEEDS: " + ", ".join(s["label"] for s in seeds), ""]
    by_d = {}
    for nid, d in dist.items():
        by_d.setdefault(d, []).append(nid)
    for d in sorted(by_d):
        lines.append(f"distance {d}:")
        for nid in sorted(by_d[d]):
            n = g.node(nid)
            loc = f"  {n['label']}" + (f"  [{n['type']}]" if n["type"] != "file" else "")
            lines.append(f"  {loc.strip()}")
    lines += ["", "RELATIONSHIPS WITHIN SUBGRAPH:"]
    shown = 0
    for nid in dist:
        for e in g.out_edges(nid, include_archived=False):
            if e["dst"] in dist and shown < 40:
                s_lbl = g.node(e["src"])["label"]
                d_lbl = g.node(e["dst"])["label"]
                lines.append(f"  {s_lbl} --{e['type']}--> {d_lbl}"
                             + (f"  (conf {e['confidence']})" if e["confidence"] < 1 else ""))
                shown += 1
    return "\n".join(lines)


def graph_export(g: Graph, fmt: str) -> str:
    if fmt == "json":
        return json.dumps(g.stats(), indent=2)
    # summary graph: services + features + endpoints + collections
    rows = []
    for n in g.conn.execute(
            "SELECT * FROM nodes WHERE type IN ('service','database','feature','endpoint','table') "
            "AND COALESCE(status,'active')='active'"):
        rows.append(n)
    edges = g.conn.execute(
        "SELECT * FROM edges e JOIN nodes n1 ON n1.id=e.src JOIN nodes n2 ON n2.id=e.dst "
        "WHERE n1.type IN ('service','feature','endpoint') "
        "AND n2.type IN ('service','database','feature','endpoint','table',"
        "'frontend-page','backend-controller','backend-service') "
        "AND COALESCE(n1.status,'active')='active' AND COALESCE(n2.status,'active')='active'").fetchall()
    if fmt == "mermaid":
        ids = {}
        def mid(nid):
            if nid not in ids:
                ids[nid] = f"n{len(ids)}"
            return ids[nid]
        lines = ["graph TD"]
        for n in rows:
            lines.append(f"    {mid(n['id'])}[\"{n['label'][:40]}\"]")
        for e in edges:
            lines.append(f"    {mid(e['src'])} -->|{e['type']}| {mid(e['dst'])}")
        return "\n".join(lines)
    if fmt == "dot":
        lines = ["digraph project {"]
        for n in rows:
            lines.append(f'  "{n["id"]}" [label="{n["label"][:40]}"];')
        for e in edges:
            lines.append(f'  "{e["src"]}" -> "{e["dst"]}" [label="{e["type"]}"];')
        lines.append("}")
        return "\n".join(lines)
    return f"unknown format: {fmt} (use mermaid|dot|json)"


def validate_report(g: Graph) -> dict:
    problems = []
    total = 0
    stale = stale_files(g)
    for s in stale:
        total += 1
        problems.append(f"changed/deleted since last sync: {s}")
    for r in g.conn.execute(
            "SELECT * FROM nodes WHERE path IS NOT NULL AND COALESCE(status,'active')='active'"):
        if r["path"] and not (PROJECT_ROOT / r["path"]).exists():
            problems.append(f"node references missing path: {r['path']}")
    broken = g.conn.execute(
        "SELECT COUNT(*) c FROM edges e LEFT JOIN nodes n1 ON n1.id=e.src "
        "LEFT JOIN nodes n2 ON n2.id=e.dst WHERE n1.id IS NULL OR n2.id IS NULL").fetchone()["c"]
    if broken:
        problems.append(f"broken relationships (dangling edges): {broken}")
    dupes = g.conn.execute(
        "SELECT path, type, COUNT(*) c FROM nodes WHERE id LIKE 'file:%' "
        "AND COALESCE(status,'active')='active' "
        "GROUP BY path, type HAVING c > 1 LIMIT 5").fetchall()
    if dupes:
        problems.append(f"duplicate nodes (same path+type): {len(dupes)}, e.g. {dupes[0]['path']}")
    invalidated = 0
    if CONTEXT_CACHE_DIR.is_dir():
        for p in CONTEXT_CACHE_DIR.glob("*.json"):
            man = load_json(p, None)
            if man and man.get("graph_version") != g.graph_version():
                invalidated += 1
    total_files = len(g.all_files())
    health = 100.0 if not total_files else max(0.0, 100.0 * (total_files - len(problems)) / total_files)
    return {"health": health, "problems": problems, "total": total_files,
            "stale": stale, "invalidated_contexts": invalidated}


def cmd_validate(g: Graph) -> str:
    r = validate_report(g)
    out = [f"Graph Health: {r['health']:.0f}%", "",
           f"Files indexed: {r['total']}",
           f"Changed files requiring analysis: {len(r['stale'])}",
           f"Cached contexts invalidated: {r['invalidated_contexts']}",
           f"Problems: {len(r['problems'])}"]
    out += [f"  - {p}" for p in r["problems"][:20]]
    if r["problems"]:
        out.append("Recommended: run `ai-project sync`")
    return "\n".join(out)


def cmd_doctor(g: Graph, fix: bool) -> str:
    findings = []

    def check(ok, msg, fix_hint):
        findings.append(("OK" if ok else "FAIL", msg, fix_hint))

    try:
        r = g.conn.execute("PRAGMA integrity_check").fetchone()[0]
        check(r == "ok", f"SQLite integrity: {r}", "backup .ai/graph/graph.db then rebuild")
    except Exception as e:
        check(False, f"SQLite integrity check failed: {e}", "rebuild")
    cols = {row["name"] for row in g.conn.execute("PRAGMA table_info(edges)")}
    check({"confidence", "method", "detected_at"} <= cols,
          "Schema v2 (edge confidence/method) present", "migrate: just run any command once")
    ncols = {row["name"] for row in g.conn.execute("PRAGMA table_info(nodes)")}
    check("status" in ncols, "Node archival column present", "migrate: just run any command once")
    for p in (FEATURES_PATH, PROJECT_META_PATH, ARCH_MEMORY_PATH, AI_DIR / "agents/instructions.md",
              AI_DIR / "agents/memory-rules.md"):
        check(p.exists(), f"required file present: {p.relative_to(PROJECT_ROOT)}",
              f"restore {p.name}")
    json_candidates = [FEATURES_PATH, PROJECT_META_PATH, ARCH_MEMORY_PATH, STATE_PATH]
    if (AI_DIR / "cache/contexts").is_dir():
        json_candidates += list((AI_DIR / "cache/contexts").glob("*.json"))
    bad_json = [str(p) for p in json_candidates
                if p.exists() and p.suffix == ".json" and load_json(p, None) is None]
    check(not bad_json, f"JSON files parse ({len(bad_json)} bad)", "delete/regenerate corrupt JSON")
    bad_lines = 0
    if LEDGER_PATH.exists():
        for ln in LEDGER_PATH.read_text().splitlines():
            if ln.strip():
                try:
                    json.loads(ln)
                except Exception:
                    bad_lines += 1
    check(bad_lines == 0, f"Change ledger JSONL valid ({len(read_ledger())} records)",
          "remove/fix corrupt ledger lines")
    st = stale_files(g)
    check(not st, f"Graph is fresh ({len(st)} stale files)", "run `ai-project sync`")

    fails = [msg for s, msg, _ in findings if s == "FAIL"]
    out = [f"Doctor: {'HEALTHY' if not fails else f'{len(fails)} ISSUE(S)'}", ""]
    for status, msg, fix_hint in findings:
        out.append(f"  [{status}] {msg}" + (f"  (fix: {fix_hint})" if status == "FAIL" else ""))
    if fix and fails:
        out += ["", "Applying safe repairs (no source files touched)..."]
        if st:
            do_sync(g, record_pending=False)
            out.append("  - re-synced changed files")
        export_graph_json(g)
        out.append("  - regenerated JSON exports")
        out.append("  For structural failures: `.ai/bin/ai-project rebuild` "
                   "(graph only; ledger/features/docs are preserved)")
    return "\n".join(out)

# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

HELP = """usage: ai-project <command> [args]

context (primary entry point)
  context "<task>" [--compact|--normal|--deep] [--no-cache]   ranked relevant context
  context-audit                                              why files were included
    plan "<task>" [--save]                                    architecture-aware read-only plan
    plan-show <plan-id>                                        show a saved plan
    plan-status <plan-id>                                      show saved plan lifecycle state
    plan-check <plan-id>                                       compare plan with current state

impact
  impact <file>            dependencies/upstream/APIs/tests for a file
  affected <file>          alias of impact
  impact-task "<task>"     task-level impact + risk + classification
  subgraph "<topic>" [--depth N]   graph neighborhood extraction
  dependencies <file>      direct imports/imported-by

knowledge
  search "<query>" [--archived]     ranked search across all node types
  feature <id>           files + APIs implementing a feature
  why "<component>"      purpose, decisions, history, connections
  history [--feature f] [--file f] [--since 7d]   chronological change memory
  changes [--feature f]  raw change ledger
  decisions "<topic>"    ADRs + architectural constraints
  docs "<query>"         search indexed documentation
  docs-check             documentation health (stale/missing)
    architecture           architecture summary and evidence
    architecture-check     compare intended architecture with implementation
    architecture-diff      alias of architecture-check
    architecture-search "<topic>" search architecture evidence and implementation
    overview               concise project overview

maintenance
  sync                   incremental update (+ provisional change detection)
  rebuild                full graph rescan (ledger/features/docs preserved)
  validate               graph health report
  dashboard              human-friendly dashboard
  graph [--format mermaid|dot|json]
  handoff                compact handoff context for another agent
  record-change [files...] [--task t] [--type t] [--confirm]
  status / doctor [--fix]
"""

USAGE_HINT = ("  context | impact-task | why | history | subgraph | handoff | docs-check | "
              "decisions | doctor | sync | ...")


def main(argv: list) -> int:
    if len(argv) < 2:
        print(HELP)
        return 0
    cmd, args = argv[1], argv[2:]
    g = Graph(DB_PATH)

    def flag(name, default=None):
        return args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else default

    if cmd in ("help", "--help", "-h"):
        print(HELP)
    elif cmd == "sync":
        r = do_sync(g)
        analyze_architecture(PROJECT_ROOT)
        print(f"Synced: {len(r['changed'])} analyzed, {r['unchanged']} unchanged "
              f"(incremental), {len(r['removed'])} removed, {len(r['renamed'])} renamed. "
              f"Graph v{g.graph_version()}.")
        if r.get("pending"):
            p = r["pending"]
            print(f"Detected change: {len(p['files_changed'])} file(s); likely features: "
                  f"{', '.join(p['features']) or 'unclassified'} -> {p['change_id']} "
                  f"[PENDING_AGENT_CONFIRMATION]")
    elif cmd == "rebuild":
        DB_PATH.unlink(missing_ok=True)
        g2 = Graph(DB_PATH)
        do_sync(g2, full=True, record_pending=False)
        st = g2.stats()
        print(f"Rebuilt graph: {st['nodes']} nodes, {st['edges']} edges, "
              f"{st['files']} files indexed. Graph v{g2.graph_version()}.")
    elif cmd == "status":
        gs = git_state()
        st = g.stats()
        print("Project: Volunteer-CGIS (backend Express+MongoDB | frontend React/Vite | "
              "ai-service FastAPI)")
        print(f"Graph: {st['nodes']} nodes / {st['edges']} edges / {st['files']} files indexed "
              f"({st['archived']} archived) — v{g.graph_version()}")
        print(f"Last sync: {(g.get_meta('last_sync') or {}).get('time', 'never')}")
        print(f"Git: {'branch ' + str(gs['branch']) + ' @ ' + str(gs['commit']) if gs['is_git'] else 'not a repository'}")
    elif cmd == "graph":
        fmt = flag("--format", "text")
        if fmt == "text":
            st = g.stats()
            print(f"nodes={st['nodes']} edges={st['edges']} files={st['files']} "
                  f"archived={st['archived']} (graph v{g.graph_version()})")
            for t, c in sorted(st["by_type"].items()):
                print(f"  {t:20} {c}")
        else:
            print(graph_export(g, fmt))
    elif cmd == "search":
        include_arch = "--archived" in args
        q = " ".join(a for a in args if not a.startswith("--"))
        for r in g.search_nodes(q, include_archived=include_arch)[:20]:
            status = " [archived]" if r["status"] == "archived" else ""
            print(f"{r['type']:18} {r['label']:45} {r['path'] or ''}{status}")
    elif cmd == "feature":
        fid = args[0]
        files = files_for_feature(g, fid)
        print(f"FEATURE: {fid} ({len(files)} files)")
        for p in files:
            print(f"  {p}")
        endpoints = set()
        for p in files:
            for n in g.nodes_by_path(p):
                for e in g.out_edges(n["id"]):
                    if e["type"] in ("EXPOSES", "HTTP_CALLS", "FORWARDS_TO"):
                        endpoints.add(e["dst"].split("endpoint:")[-1])
        if endpoints:
            print("APIs:")
            for e in sorted(endpoints):
                print(f"  {e}")
    elif cmd in ("impact", "affected"):
        im = impact_of(g, " ".join(a for a in args if not a.startswith("--")))
        if not im:
            print("No matching node.")
            return 1
        n = im["node"]
        print(f"NODE: {n['label']} ({n['type']}) {n['path'] or ''}")
        print(f"FEATURES: {', '.join(im['features']) or '-'}")
        print("DIRECT DEPENDENCIES (imports):")
        [print(f"  {d}") for d in im["direct_deps"]] or print("  (none)")
        print("UPSTREAM (imported by):")
        [print(f"  {d}") for d in im["upstream"]] or print("  (none)")
        if im["indirect_upstream"]:
            print("INDIRECT UPSTREAM:")
            [print(f"  {d}") for d in im["indirect_upstream"][:10]]
        if im["endpoints"]:
            print("APIs:")
            [print(f"  {e}") for e in im["endpoints"]]
        if im["collections"]:
            print("DATABASE:")
            [print(f"  {c}") for c in im["collections"]]
        if im["tests"]:
            print("TESTS:")
            [print(f"  {t}") for t in im["tests"]]
        rel = [c for c in read_ledger() if n["path"] in c.get("files_changed", [])]
        if rel:
            print("RECENT CHANGES TOUCHING THIS FILE:")
            [print(f"  [{c['change_id']}] {(c.get('task') or '')[:80]}") for c in rel[-3:]]
    elif cmd == "impact-task":
        if not args:
            print('usage: ai-project impact-task "<task>"')
            return 1
        print(impact_task(g, " ".join(a for a in args if not a.startswith("--"))))
    elif cmd == "dependencies":
        target = " ".join(a for a in args if not a.startswith("--"))
        nodes = g.nodes_by_path(target) or ([g.search_nodes(target, types={"file"}) or [None]][0][:1])
        if not nodes or not nodes[0]:
            print("No matching file.")
            return 1
        n = nodes[0]
        print("IMPORTS:")
        for e in g.out_edges(n["id"]):
            if e["type"] == "IMPORTS":
                t = g.node(e["dst"])
                if t:
                    print(f"  -> {t['path']}  ({e['type']}, conf {e['confidence']}, {e['method']})")
        print("IMPORTED BY:")
        for e in g.in_edges(n["id"]):
            if e["type"] == "IMPORTS":
                t = g.node(e["src"])
                if t:
                    print(f"  <- {t['path']}")
    elif cmd == "context":
        task = " ".join(a for a in args if not a.startswith("--"))
        if not task:
            print('usage: ai-project context "<task>" [--compact|--normal|--deep] [--no-cache]')
            return 1
        mode = "compact" if "--compact" in args else "deep" if "--deep" in args else "normal"
        print(get_context(g, task, mode, no_cache="--no-cache" in args))
    elif cmd == "context-audit":
        key_files = sorted(CONTEXT_CACHE_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime) \
            if CONTEXT_CACHE_DIR.is_dir() else []
        if not key_files:
            print("No cached context manifests yet. Run `ai-project context \"<task>\"` first.")
            return 0
        man = load_json(key_files[-1], {})
        print(f"LAST CONTEXT: task={man.get('task')!r} mode={man.get('mode')} "
              f"graph_v={man.get('graph_version')} conf={man.get('confidence')}")
        valid = man.get("graph_version") == g.graph_version()
        print(f"Cache validity: {'VALID' if valid else 'INVALIDATED (graph changed since generation)'}")
        print("INCLUDED FILES AND WHY:")
        for fi in man.get("files", []):
            print(f"  {fi['path']}")
            print(f"      priority {fi['priority']} | {fi['type']} | {fi['reason']}")
        print(f"Features matched: {', '.join(man.get('features', [])) or '-'}")
        print(f"APIs: {', '.join(man.get('apis', [])[:8]) or '-'}")
        print(f"Docs: {', '.join(man.get('docs', [])) or '-'}")
    elif cmd == "plan":
        if not args:
            print('usage: ai-project plan "<task>"')
            return 1
        task = " ".join(a for a in args if not a.startswith("--"))
        output, plan_id = create_plan(PROJECT_ROOT, g, task, save="--save" in args)
        print(output)
    elif cmd in ("plan-show", "plan-status"):
        if not args:
            print(f"usage: ai-project {cmd} <plan-id>")
            return 1
        plan = load_json(plan_path(args[0]), {})
        if not plan:
            print(f"Plan not found: {args[0]}")
            return 1
        if cmd == "plan-status":
            if len(args) > 1:
                allowed = {"DRAFT", "APPROVED", "IN_PROGRESS", "COMPLETED", "ABANDONED", "SUPERSEDED"}
                state = args[1].upper()
                if state not in allowed:
                    print(f"Invalid plan status: {state}. Use: {', '.join(sorted(allowed))}")
                    return 1
                plan["status"] = state
                plan["updated"] = now_iso()
                save_json(plan_path(args[0]), plan)
            print(f"{plan['id']}: {plan.get('status', 'DRAFT')}")
            print(f"Created: {plan.get('created', '-')}")
            print(f"Updated: {plan.get('updated', '-')}")
        else:
            print(json.dumps(plan, indent=2))
    elif cmd == "plan-check":
        if not args:
            print('usage: ai-project plan-check <plan-id>')
            return 1
        print(plan_check(args[0], g))
    elif cmd == "why":
        if not args:
            print('usage: ai-project why "<component>"')
            return 1
        print(cmd_why(g, " ".join(a for a in args if not a.startswith("--"))))
    elif cmd == "history":
        print(cmd_history(g, args))
    elif cmd == "handoff":
        print(cmd_handoff(g))
    elif cmd == "subgraph":
        topic = " ".join(a for a in args if not a.startswith("--") and a != flag("--depth"))
        if not topic or "--depth" in args and flag("--depth") is None:
            print('usage: ai-project subgraph "<topic>" [--depth N]')
            return 1
        print(cmd_subgraph(g, topic, int(flag("--depth", "2") or 2)))
    elif cmd == "decisions":
        topic = " ".join(a for a in args if not a.startswith("--"))
        concepts = extract_concepts(topic)
        hits = score_decisions(g, concepts or [topic.lower()], limit=10)
        mem = load_json(ARCH_MEMORY_PATH, {})
        mem_hits = [c for c in mem.get("constraints", [])
                    if any(t in json.dumps(c).lower() for t in (concepts or [topic.lower()]))]
        if not hits and not mem_hits:
            print(f"No decisions match '{topic}'.")
            return 0
        for d in hits:
            print(f"DECISION: {d['title']}")
            print(f"  {d['path']}")
        for c in mem_hits:
            print(f"CONSTRAINT: {c['title']}")
            print(f"  {c.get('detail', '')}")
            if c.get("refs"):
                print(f"  refs: {', '.join(c['refs'])}")
    elif cmd == "changes":
        entries = read_ledger()
        if "--feature" in args:
            fid = flag("--feature")
            entries = [c for c in entries if fid in c.get("features", [])]
        for c in entries[-20:]:
            print(f"[{c['change_id']}] {c.get('timestamp')} agent={c.get('agent')} "
                  f"risk={c.get('risk')} status={c.get('status', 'confirmed')}")
            if c.get("task"):
                print(f"  task: {c['task']}")
            print(f"  files: {', '.join(c.get('files_changed', []))[:100]}")
            if c.get("apis"):
                print(f"  apis: {', '.join(c['apis'])[:100]}")
    elif cmd == "record-change":
        files = [a for a in args if not a.startswith("--")]
        confirm = "--confirm" in args
        task = flag("--task", "")
        ctype = flag("--type", "")
        gs = git_state()
        if not files:
            files = gs["dirty_files"] or stale_files(g)
            files = [f for f in files if not f.endswith("(deleted)")]
        if confirm:
            entries = read_ledger()
            confirmed = []
            for c in entries:
                if c.get("status") == "PENDING_AGENT_CONFIRMATION":
                    c["status"] = "confirmed"
                    c["agent"] = detect_agent()
                    if task:
                        c["task"] = task
                    if ctype:
                        c["change_type"] = ctype
                    confirmed.append(c)
            if confirmed:
                LEDGER_PATH.write_text(
                    "\n".join(json.dumps(c) for c in entries) + "\n")
                print(f"Confirmed {len(confirmed)} pending record(s) -> "
                      f"{', '.join(c['change_id'] for c in confirmed)}")
                return 0
        rec = make_change_record(g, files, task=task, status="confirmed",
                                 change_type=ctype or "unclassified")
        ledger_append(rec)
        print(f"Recorded {rec['change_id']} ({len(files)} files, features: "
              f"{', '.join(rec['features']) or '-'}, services: {', '.join(rec['services']) or '-'}).")
        print(f"Edit {LEDGER_PATH} to enrich (reason/impact/risk).")
    elif cmd == "docs":
        for r in g.search_nodes(" ".join(a for a in args if not a.startswith("--")),
                                types={"documentation"})[:15]:
            print(r["path"])
    elif cmd == "docs-check":
        print(cmd_docs_check(g))
    elif cmd == "architecture":
        index = analyze_architecture(PROJECT_ROOT)
        print(architecture_overview(PROJECT_ROOT, g))
        print("\n" + architecture_text(PROJECT_ROOT))
        print(f"\nIndexed assets: {len(index.get('assets', []))}")
    elif cmd in ("architecture-check", "architecture-diff"):
        result = reconcile_architecture(PROJECT_ROOT, g)
        print("ARCHITECTURE CHECK")
        for check in result["checks"]:
            print(f"\n{check['area']}\n  Intended: {check['intended']}\n  Actual: {check['actual'] or '-'}\n  STATUS: {check['status']}")
        print(f"\nSTATUS: {'REVIEW REQUIRED' if result['unresolved'] else 'MATCH'}")
    elif cmd == "architecture-search":
        if not args:
            print('usage: ai-project architecture-search "<topic>"')
            return 1
        print(search_architecture(PROJECT_ROOT, g, " ".join(args)))
    elif cmd == "overview":
        analyze_architecture(PROJECT_ROOT)
        print(architecture_overview(PROJECT_ROOT, g))
    elif cmd == "validate":
        print(cmd_validate(g))
    elif cmd == "dashboard":
        gs = git_state()
        st = g.stats()
        ledger = read_ledger()
        pending = sum(1 for c in ledger if c.get("status") == "PENDING_AGENT_CONFIRMATION")
        stale = stale_files(g)
        lines = [
            "PROJECT DASHBOARD — Volunteer-CGIS",
            "".ljust(40, "="),
            f"Files indexed:       {st['files']}",
            f"Graph nodes:         {st['nodes']}  (edges: {st['edges']}, v{g.graph_version()})",
            f"Features:            {len(g.nodes_by_type('feature'))}",
            f"API endpoints:       {len(g.nodes_by_type('endpoint'))}",
            f"DB collections:      {len(g.nodes_by_type('table'))}",
            f"Docs indexed:        {len(g.nodes_by_type('documentation'))}",
            f"Decisions/ADRs:      {len(g.nodes_by_type('decision'))}",
            f"Ledger entries:      {len(ledger)} ({pending} pending confirmation)",
            f"Archived nodes:      {st['archived']}",
            f"Stale files:         {len(stale)}",
            f"Git:                 {'yes' if gs['is_git'] else 'NOT a git repository'}"
            + (f" (branch {gs['branch']}, commit {gs['commit']}, {len(gs['dirty_files'])} dirty)"
               if gs["is_git"] else ""),
            "",
            "Recent changes:",
        ]
        lines += [f"  [{c['change_id']}] {(c.get('task') or ', '.join(c['files_changed'])[:60])}"
                  f" ({c.get('status', 'confirmed')})" for c in ledger[-5:]] or ["  (none)"]
        print("\n".join(lines))
    elif cmd == "doctor":
        print(cmd_doctor(g, fix="--fix" in args))
    else:
        print(f"unknown command: {cmd}\n{USAGE_HINT}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
