import React, { useState } from "react";
import {
  X,
  Sparkles,
  Bot,
  CheckSquare,
  HelpCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";
import { volunteerService, AssistantDraftResponse } from "@/services/api/volunteer.service";

interface VolunteerAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDraft: (draft: {
    title: string;
    description: string;
    category: string;
    department: string;
    priority: string;
  }) => void;
  defaultVillage?: string;
}

export const VolunteerAiAssistantModal: React.FC<VolunteerAiAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyDraft,
  defaultVillage = "Rampura",
}) => {
  const [statement, setStatement] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantDraftResponse | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!statement.trim() || statement.trim().length < 5) {
      setError("Please enter the citizen's statement (at least 5 characters)");
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const data = await volunteerService.getAiAssistantDraft(statement.trim(), defaultVillage);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to analyze verbal statement");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyDraft({
      title: result.title,
      description: result.formalDescription,
      category: result.suggestedCategory,
      department: result.suggestedDepartment,
      priority: result.suggestedPriority,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Volunteer AI Grievance Assistant</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold tracking-wide uppercase">
                  Gov AI Assistant
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Structure colloquial village statements into formal administrative grievances
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Statement input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Citizen Verbal Statement / Raw Observations</span>
              <span className="text-[11px] text-slate-400">Can be typed in informal colloquial words</span>
            </label>
            <textarea
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="e.g. For 4 days water is not coming from our street tap and the transformer had sparks yesterday night so light is also gone..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
            />
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Tip: Mention landmarks, duration, and whether public safety is at risk.</span>
              </div>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs transition shadow-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing Statement...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Structure & Recommend
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Structured Results */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Drafted Grievance Summary
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-semibold">
                      {result.suggestedCategory}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold">
                      {result.suggestedDepartment}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        result.suggestedPriority === "CRITICAL"
                          ? "bg-rose-100 text-rose-800"
                          : result.suggestedPriority === "HIGH"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {result.suggestedPriority}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-700">Recommended Title:</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{result.title}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-700">Formal Departmental Text:</div>
                  <p className="text-xs text-slate-700 mt-1 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                    {result.formalDescription}
                  </p>
                </div>
              </div>

              {/* Missing Information Checklist */}
              {result.missingInformation && result.missingInformation.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-2">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    Missing Information Checklist (Ask Citizen Before Submitting):
                  </div>
                  <ul className="space-y-1.5 text-xs text-amber-800">
                    {result.missingInformation.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium transition"
          >
            Cancel
          </button>
          {result && (
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition shadow-sm"
            >
              <span>Apply to Grievance Form</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
