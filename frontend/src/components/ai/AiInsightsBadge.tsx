import React from "react";
import { IAiAnalysis } from "@/types/complaint";

interface AiInsightsBadgeProps {
  analysis?: IAiAnalysis;
  className?: string;
  compact?: boolean;
}

export const AiInsightsBadge: React.FC<AiInsightsBadgeProps> = ({
  analysis,
  className = "",
  compact = false,
}) => {
  if (!analysis) return null;

  const {
    departmentRecommendation,
    priorityRecommendation,
    duplicateCheck,
    summary,
    nlp,
    ocr,
  } = analysis;

  const urgencyScore = priorityRecommendation?.urgencyScore ?? 50;

  // Meter color
  const getMeterColor = (score: number) => {
    if (score >= 80) return "bg-red-500";
    if (score >= 60) return "bg-amber-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-emerald-500";
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border bg-indigo-50/60 border-indigo-200 text-indigo-800 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-300 ${className}`}>
        <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
        <span>AI Urgency: {urgencyScore}/100</span>
        {duplicateCheck?.isDuplicateCandidate && (
          <span className="text-amber-600 dark:text-amber-400 font-bold ml-1">
            ⚠ Potential Duplicate
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/40 to-slate-50 p-4 shadow-sm dark:border-indigo-900/50 dark:from-slate-900/80 dark:to-indigo-950/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-sm">
            AI
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              VCGIS AI Intelligence Insights
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Department recommendation, urgency evaluation & clustering
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
          Advisory Intelligence
        </span>
      </div>

      {/* Duplicate Alert Banner */}
      {duplicateCheck?.isDuplicateCandidate && (
        <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span>⚠ Duplicate Cluster Candidate</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900 font-bold">
              {Math.round(duplicateCheck.highestScore * 100)}% Match
            </span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1">
            Found {duplicateCheck.matchCount} similar active petition(s) in this locality. System does not auto-discard.
          </p>
          {duplicateCheck.matches && duplicateCheck.matches.length > 0 && (
            <div className="mt-1.5 text-[11px] space-y-0.5">
              {duplicateCheck.matches.slice(0, 2).map((m) => (
                <div key={m.complaintId} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                  <span className="font-mono text-[10px]">{m.complaintNumber}</span>
                  <span className="truncate max-w-[200px] text-slate-500">{m.title}</span>
                  <span className="text-[10px] font-medium text-amber-600">{Math.round(m.similarityScore * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
        {/* Department Prediction */}
        <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/70 dark:bg-slate-800/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Predicted Department</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {Math.round(departmentRecommendation.confidence * 100)}% Confidence
            </span>
          </div>
          <p className="font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {departmentRecommendation.department}
          </p>
          {departmentRecommendation.subCategory && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sub-category: {departmentRecommendation.subCategory}
            </p>
          )}
        </div>

        {/* Priority & Urgency */}
        <div className="p-2.5 rounded-lg bg-white/70 border border-slate-200/70 dark:bg-slate-800/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Urgency Meter</span>
            <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${getPriorityBadgeClass(priorityRecommendation.priority)}`}>
              {priorityRecommendation.priority}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className={`h-full rounded-full ${getMeterColor(urgencyScore)} transition-all duration-500`}
                style={{ width: `${urgencyScore}%` }}
              />
            </div>
            <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-200">
              {urgencyScore}/100
            </span>
          </div>
          {priorityRecommendation.safetyFactors && priorityRecommendation.safetyFactors.length > 0 && (
            <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 truncate">
              {priorityRecommendation.safetyFactors[0]}
            </p>
          )}
        </div>
      </div>

      {/* Summary Section */}
      {summary?.summary && (
        <div className="mt-3 p-2.5 rounded-lg bg-white/70 border border-slate-200/70 dark:bg-slate-800/60 dark:border-slate-700/60 text-xs">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Factual Summary
          </span>
          <p className="text-slate-700 dark:text-slate-300 mt-1 text-[11px] leading-relaxed">
            {summary.summary}
          </p>
        </div>
      )}

      {/* Entities & Urgency Indicators */}
      {nlp && (nlp.urgencyIndicators?.length > 0 || nlp.entities?.length > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px]">
          {nlp.urgencyIndicators?.map((tok) => (
            <span key={tok} className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 font-medium">
              ⚡ {tok}
            </span>
          ))}
          {nlp.entities?.slice(0, 4).map((ent) => (
            <span key={ent.text} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
              {ent.text} ({ent.type})
            </span>
          ))}
          {ocr?.extractedText && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
              📄 OCR Extracted ({Math.round(ocr.confidence * 100)}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
