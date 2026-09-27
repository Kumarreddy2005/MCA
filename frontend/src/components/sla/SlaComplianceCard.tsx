import React, { useEffect, useState, useCallback } from "react";
import {
  AlertCircle,
  Award,
  Clock,
  Play,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { ISlaAnalyticsData, Priority } from "@/types/complaint";
import { slaService, SlaSweepResult } from "@/services/api/sla.service";

interface SlaComplianceCardProps {
  department?: string;
  onSweepComplete?: () => void;
}

export const SlaComplianceCard: React.FC<SlaComplianceCardProps> = ({
  department,
  onSweepComplete,
}) => {
  const [analytics, setAnalytics] = useState<ISlaAnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sweeping, setSweeping] = useState<boolean>(false);
  const [sweepResult, setSweepResult] = useState<SlaSweepResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await slaService.getAnalytics(department);
      setAnalytics(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load SLA analytics";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [department]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRunSweep = async () => {
    try {
      setSweeping(true);
      setError(null);
      const result = await slaService.triggerSweep();
      setSweepResult(result);
      await fetchAnalytics();
      if (onSweepComplete) {
        onSweepComplete();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run SLA sweep";
      setError(msg);
    } finally {
      setSweeping(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs text-center text-xs text-slate-500">
        Loading real-time SLA compliance analytics...
      </div>
    );
  }

  const complianceRate = analytics?.complianceRatePercentage ?? 100;
  const isHealthy = complianceRate >= 85;
  const isWarning = complianceRate >= 70 && complianceRate < 85;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-8">
      {/* Header with Sweep Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 text-[11px] font-bold mb-1 border border-blue-200">
            <Award className="w-3.5 h-3.5" />
            Karnataka Citizen Guarantee of Services Act (Sakala)
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            SLA Compliance & Multi-Tier Escalation Monitor
          </h2>
          <p className="text-xs text-slate-500">
            Automated monitoring across Taluk (Level 1) &rarr; District (Level 2) &rarr; State (Level 3)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            title="Refresh SLA stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRunSweep}
            disabled={sweeping}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs disabled:opacity-50"
          >
            {sweeping ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            {sweeping ? "Sweeping..." : "Run SLA Sweep"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sweepResult && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <span>
            Sweep complete: <strong>{sweepResult.scannedCount}</strong> scanned,{" "}
            <strong>{sweepResult.warningsDispatched}</strong> warnings,{" "}
            <strong>{sweepResult.breachesDetected}</strong> breaches,{" "}
            <strong>{sweepResult.escalationsTriggered}</strong> auto-escalations triggered.
          </span>
          <button
            onClick={() => setSweepResult(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main SLA Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
        {/* Compliance Rate */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            SLA Compliance
          </div>
          <div
            className={`text-2xl font-bold ${
              isHealthy ? "text-emerald-600" : isWarning ? "text-amber-600" : "text-rose-600"
            }`}
          >
            {complianceRate}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {analytics?.resolvedWithinSlaCount ?? 0} resolved within target
          </div>
        </div>

        {/* Overdue Breaches */}
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-red-700 mb-1">
            Active Breaches
          </div>
          <div className="text-2xl font-bold text-red-700">
            {analytics?.breachedCount ?? 0}
          </div>
          <div className="text-[10px] text-red-600 mt-1">Overdue resolution target</div>
        </div>

        {/* Approaching Deadline (At Risk) */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">
            At Risk (&lt;24h)
          </div>
          <div className="text-2xl font-bold text-amber-700">
            {analytics?.atRiskCount ?? 0}
          </div>
          <div className="text-[10px] text-amber-600 mt-1">Warning alerts issued</div>
        </div>

        {/* Avg Resolution Turnaround */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Avg Turnaround
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {analytics?.averageResolutionHours ?? 0}h
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {Math.round((analytics?.averageResolutionHours ?? 0) / 24)} days average
          </div>
        </div>
      </div>

      {/* Priority Breakdown Progress Bars */}
      <div className="space-y-3 pt-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Compliance by Priority Category
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              name: "Critical (24h SLA)",
              key: Priority.CRITICAL,
              badge: "bg-rose-100 text-rose-800",
            },
            {
              name: "High (48h SLA)",
              key: Priority.HIGH,
              badge: "bg-orange-100 text-orange-800",
            },
            {
              name: "Medium (5 Days)",
              key: Priority.MEDIUM,
              badge: "bg-amber-100 text-amber-800",
            },
            {
              name: "Low (10 Days)",
              key: Priority.LOW,
              badge: "bg-slate-100 text-slate-800",
            },
          ].map((item) => {
            const data = analytics?.byPriority[item.key as Priority] ?? {
              total: 0,
              breached: 0,
              complianceRate: 100,
            };
            return (
              <div
                key={item.key}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs"
              >
                <div className="flex items-center justify-between font-medium mb-1.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.badge}`}>
                    {item.name}
                  </span>
                  <span className="font-bold text-slate-800">{data.complianceRate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      data.complianceRate >= 80 ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                    style={{ width: `${data.complianceRate}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Total: {data.total}</span>
                  <span>Breached: {data.breached}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multi-tier Escalation Legend */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />
          Escalation Levels:
        </span>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
          Level 0: Field Official
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
          Level 1: Taluk Tahsildar (On Breach)
        </span>
        <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 font-semibold">
          Level 2: District Collector (&gt;24h)
        </span>
        <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-800 border border-red-200 font-bold">
          Level 3: State Secretariat (&gt;48h)
        </span>
      </div>
    </div>
  );
};
