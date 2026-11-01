import React from "react";
import type { AiMetricsData } from "@/services/api/analytics.service";
import { Sparkles, Cpu, Layers, AlertTriangle } from "lucide-react";

interface AiModelMetricsCardProps {
  metrics: AiMetricsData | null;
  loading?: boolean;
}

export const AiModelMetricsCard: React.FC<AiModelMetricsCardProps> = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 animate-pulse h-72">
        <div className="h-6 w-1/3 bg-slate-200 rounded mb-4"></div>
        <div className="h-4 w-1/2 bg-slate-200 rounded mb-8"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-slate-100 rounded"></div>
          <div className="h-20 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white p-6 rounded-xl border border-slate-200 text-slate-500">
        AI Intelligence metrics not available.
      </div>
    );
  }

  const highPct = metrics.totalAnalyzed > 0 ? (metrics.confidenceDistribution.high / metrics.totalAnalyzed) * 100 : 0;
  const medPct = metrics.totalAnalyzed > 0 ? (metrics.confidenceDistribution.medium / metrics.totalAnalyzed) * 100 : 0;
  const lowPct = metrics.totalAnalyzed > 0 ? (metrics.confidenceDistribution.low / metrics.totalAnalyzed) * 100 : 0;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-50 border border-purple-100 text-purple-700">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                AI Intelligence & Auto-Triage Health
              </h3>
              <p className="text-xs text-slate-500">
                Kannada NLP, Multilingual OCR & Priority Triage Accuracy
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            Phase 7 Engine
          </span>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Cpu className="w-3.5 h-3.5 text-purple-500" />
              <span>Triaged</span>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {metrics.totalAnalyzed.toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Routing Conf.</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">
              {metrics.autoRoutingConfidenceAverage.toFixed(1)}%
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Duplicate Pairs</span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {metrics.duplicateCandidatesFound}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>NLP Entities</span>
            </div>
            <p className="text-xl font-bold text-amber-600 truncate">
              {metrics.nlpEntitiesDetectedCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Breakdown bars for confidence */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Classification Confidence Stratification
          </h4>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">High Confidence (&gt;85%)</span>
                <span className="font-semibold text-emerald-600">
                  {metrics.confidenceDistribution.high} ({highPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${highPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">Medium Confidence (60% - 85%)</span>
                <span className="font-semibold text-amber-600">
                  {metrics.confidenceDistribution.medium} ({medPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${medPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">Low Confidence (&lt;60% flagged for human review)</span>
                <span className="font-semibold text-red-600">
                  {metrics.confidenceDistribution.low} ({lowPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${lowPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Zero PII Retained in Feature Embeddings</span>
        <span>Audited ML Pipeline (Rule 8.3)</span>
      </div>
    </div>
  );
};
