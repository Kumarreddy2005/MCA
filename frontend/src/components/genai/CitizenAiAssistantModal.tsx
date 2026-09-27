import React, { useState } from "react";
import { Bot, Check, Copy, Send, Sparkles, X } from "lucide-react";
import { genAiService, ICitizenAssistResult } from "@/services/api/genai.service";

interface CitizenAiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDraft?: (draft: {
    title: string;
    description: string;
    category?: string;
    department?: string;
    urgency?: string;
  }) => void;
  existingComplaintContext?: Record<string, unknown>;
}

export const CitizenAiAssistantModal: React.FC<CitizenAiAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyDraft,
  existingComplaintContext,
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "kn">("en");
  const [response, setResponse] = useState<ICitizenAssistResult | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleAsk = async (userQuery?: string) => {
    const textToSubmit = userQuery || query;
    if (!textToSubmit.trim()) return;

    setLoading(true);
    setCopied(false);
    try {
      const data = await genAiService.assistCitizen({
        query: textToSubmit.trim(),
        language,
        complaintContext: existingComplaintContext,
      });
      setResponse(data);
    } catch {
      setResponse({
        reply_message: "We encountered a temporary connection issue. Please describe your issue clearly and submit directly.",
        next_steps: ["Ensure you mention the exact street and problem details."],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (response && onApplyDraft && response.draft_title && response.draft_description) {
      onApplyDraft({
        title: response.draft_title,
        description: response.draft_description,
        category: response.suggested_category,
        department: response.suggested_department,
      });
      onClose();
    }
  };

  const handleCopy = () => {
    if (response?.draft_description) {
      navigator.clipboard.writeText(`${response.draft_title}\n\n${response.draft_description}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const samplePrompts = [
    "No drinking water in my street since 3 days",
    "Fallen live electrical wire near village school",
    "Fair price shop dealer not distributing rice quota",
    "Potholes and broken culvert blocking access road",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-2xl dark:border-indigo-900/50 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-xs">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">VCGIS Citizen AI Assistant</h3>
                <span className="rounded-full bg-indigo-500/40 px-2 py-0.5 text-[10px] font-medium text-indigo-200 border border-indigo-400/30">
                  Karnataka Sahayaka
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Draft grievance petitions, structure details & explain progress
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Language selector */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Select Language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:
            </span>
            <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`rounded-md px-2.5 py-1 transition ${
                  language === "en"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage("kn")}
                className={`rounded-md px-2.5 py-1 transition ${
                  language === "kn"
                    ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-700 dark:text-indigo-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                ಕನ್ನಡ
              </button>
            </div>
          </div>

          {/* Quick Prompts */}
          {!response && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Try one of these common issues:</p>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setQuery(p);
                      handleAsk(p);
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition text-left dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
                  >
                    💬 {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Response Card */}
          {response && (
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 p-4 dark:border-indigo-900/40 dark:from-slate-900 dark:to-indigo-950/20">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-semibold text-xs mb-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>AI Drafted Grievance Recommendation</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {response.reply_message}
              </p>

              {response.draft_title && (
                <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-800/80">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Draft Title
                    </span>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{response.draft_title}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Recommended Department
                    </span>
                    <p className="font-medium text-indigo-700 dark:text-indigo-300">
                      {response.suggested_department} {response.suggested_category && `(${response.suggested_category})`}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Draft Description
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line mt-0.5">
                      {response.draft_description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copied!" : "Copy Text"}
                    </button>
                    {onApplyDraft && (
                      <button
                        type="button"
                        onClick={handleApply}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Apply to Form
                      </button>
                    )}
                  </div>
                </div>
              )}

              {response.next_steps && response.next_steps.length > 0 && (
                <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Recommended Next Steps:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {response.next_steps.map((s: string, idx: number) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  language === "kn"
                    ? "ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ (ಉದಾ: ಕುಡಿಯುವ ನೀರಿನ ಪೈಪ್ ಒಡೆದಿದೆ)..."
                    : "Describe your issue in plain words (e.g. water pipeline burst in my street)..."
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  Thinking...
                </span>
              ) : (
                <>
                  <span>Draft</span>
                  <Send className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
