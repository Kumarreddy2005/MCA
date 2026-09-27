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
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse h-72">
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500">
        AI Intelligence metrics not available.
      </div>
    );
  }

  const highPct = metrics.totalAnalyzed > 0 ? (metrics.confidenceDistribution.high / metrics.totalAnalyzed) * 100 : 0;
  const medPct = metrics.totalAnalyzed > 0 ? (metrics.confidenceDistribution.medium / metrics.totalAnalyzed) * 100 : 0;
  const lowPct = metrics.totalAnalyzed > 0 ? (metrics.confidenceDistribution.low / metrics.totalAnalyzed) * 100 : 0;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                AI Intelligence & Auto-Triage Health
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Kannada NLP, Multilingual OCR & Priority Triage Accuracy
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Phase 7 Engine
          </span>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Cpu className="w-3.5 h-3.5 text-purple-500" />
              <span>Triaged</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {metrics.totalAnalyzed.toLocaleString()}
            </p>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Routing Conf.</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.autoRoutingConfidenceAverage.toFixed(1)}%
            </p>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Duplicate Pairs</span>
            </div>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {metrics.duplicateCandidatesFound}
            </p>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>NLP Entities</span>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400 truncate">
              {metrics.nlpEntitiesDetectedCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Breakdown bars for confidence */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Classification Confidence Stratification
          </h4>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-300">High Confidence (&gt;85%)</span>
                <span className="font-semibold text-emerald-600">
                  {metrics.confidenceDistribution.high} ({highPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${highPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-300">Medium Confidence (60% - 85%)</span>
                <span className="font-semibold text-amber-600">
                  {metrics.confidenceDistribution.medium} ({medPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${medPct}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-300">Low Confidence (&lt;60% flagged for human review)</span>
                <span className="font-semibold text-red-600">
                  {metrics.confidenceDistribution.low} ({lowPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: `${lowPct}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-400 flex items-center justify-between">
        <span>Zero PII Retained in Feature Embeddings</span>
        <span>Audited ML Pipeline (Rule 8.3)</span>
      </div>
    </div>
  );
};
