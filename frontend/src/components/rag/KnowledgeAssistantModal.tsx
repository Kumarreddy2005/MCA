import React, { useState } from "react";
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  Calendar,
  Copy,
  Check,
  Loader2,
  Sparkles,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { ragService, IQueryRagResult } from "../../services/api/rag.service";
import { GovernmentDepartments } from "@/types/complaint";

interface KnowledgeAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeAssistantModal: React.FC<KnowledgeAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IQueryRagResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    "What is the statutory deadline under Sakala for resolving drinking water failure?",
    "How much can Gram Panchayat spend on replacing a community borewell motor?",
    "What is the SLA for BESCOM to replace a failed distribution transformer in a village?",
    "What are the fines for illegal garbage dumping under Karnataka Municipal Bye-laws?",
  ];

  const handleSearch = async (textToSearch?: string) => {
    const q = textToSearch || query;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await ragService.queryKnowledge({
        query: q.trim(),
        departmentFilter: departmentFilter || undefined,
        maxSources: 3,
        language: "en",
      });
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Knowledge retrieval failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.grounded_answer) {
      navigator.clipboard.writeText(result.grounded_answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-700 to-emerald-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-inner">
              <BookOpen className="w-5 h-5 text-teal-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Karnataka Schemes & Government Orders (RAG)</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-400/20 text-emerald-100 border border-emerald-400/30">
                  <ShieldCheck className="w-3 h-3" />
                  Verified Sources Only
                </span>
              </div>
              <p className="text-xs text-teal-100/90">
                Ask questions regarding Sakala rules, citizen entitlements, and departmental operational guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Search Inputs */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Ask any policy question e.g. What is the Sakala compensation penalty for delay?"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                />
              </div>

              {/* Department Filter */}
              <div className="sm:w-56">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white shadow-xs"
                >
                  <option value="">All Karnataka Departments</option>
                  {GovernmentDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={loading || !query.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-teal-200" />}
                <span>Ask AI</span>
              </button>
            </div>

            {/* Suggested Question Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-400" />
                Frequently Verified Karnataka Government Orders:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(q);
                      handleSearch(q);
                    }}
                    className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 text-slate-700 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Area */}
          {result && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              {/* Grounded Answer Card */}
              <div className="p-5 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      Official Government Response
                    </span>
                    {result.is_grounded ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                        100% Grounded
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-200">
                        No Official Match
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Answer</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-xs text-slate-800 leading-relaxed space-y-2 whitespace-pre-line font-medium">
                  {result.grounded_answer}
                </div>
              </div>

              {/* Verified Citations List */}
              {result.sources && result.sources.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                      Statutory Sources & Citations ({result.sources.length})
                    </h3>
                    <span className="text-[11px] text-slate-400">Strictly approved & active Government Orders</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {result.sources.map((src, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 transition shadow-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{src.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                {src.document_number}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {src.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Effective: {src.effective_date}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200 shrink-0">
                            {Math.round(src.relevance_score * 100)}% Match
                          </span>
                        </div>

                        {/* Citation Excerpt */}
                        <div className="p-2.5 rounded-lg bg-slate-50 border-l-2 border-teal-600 text-[11px] text-slate-600 italic">
                          &ldquo;{src.excerpt}&rdquo;
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anti-hallucination policy: Non-authoritative documents are filtered out automatically.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
