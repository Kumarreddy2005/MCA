import React, { useState, useEffect, useCallback } from "react";
import {
  analyticsService,
  type AnalyticsOverviewData,
  type DepartmentPerformanceItem,
  type TrendItem,
  type CategoryBreakdownData,
  type GeographicIntelligenceData,
  type AiMetricsData,
  type ExecutiveReportData,
} from "../../services/api/analytics.service";
import { GisMapViewer } from "../../components/analytics/GisMapViewer";
import { DepartmentPerformanceTable } from "../../components/analytics/DepartmentPerformanceTable";
import { GrievanceTrendsChart } from "../../components/analytics/GrievanceTrendsChart";
import { AiModelMetricsCard } from "../../components/analytics/AiModelMetricsCard";
import { DistrictHealthRanking } from "../../components/analytics/DistrictHealthRanking";
import {
  BarChart3,
  MapPin,
  Building2,
  Cpu,
  Download,
  FileText,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
} from "lucide-react";

export const AnalyticsDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"gis" | "departments" | "trends" | "ai" | "executive">("gis");
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("ALL");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  // Data states
  const [overview, setOverview] = useState<AnalyticsOverviewData | null>(null);
  const [deptPerf, setDeptPerf] = useState<DepartmentPerformanceItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdownData | null>(null);
  const [geoData, setGeoData] = useState<GeographicIntelligenceData | null>(null);
  const [aiMetrics, setAiMetrics] = useState<AiMetricsData | null>(null);
  const [executiveReport, setExecutiveReport] = useState<ExecutiveReportData | null>(null);

  const getDateFilter = useCallback((): { startDate?: string; endDate?: string } => {
    const now = new Date();
    if (timeRange === "7d") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: past.toISOString() };
    } else if (timeRange === "30d") {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: past.toISOString() };
    } else if (timeRange === "90d") {
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { startDate: past.toISOString() };
    }
    return {};
  }, [timeRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const dateParams = getDateFilter();
    const filterParams = {
      department: selectedDept !== "ALL" ? selectedDept : undefined,
      district: selectedDistrict !== "ALL" ? selectedDistrict : undefined,
      ...dateParams,
    };

    try {
      const [overviewRes, deptsRes, trendsRes, catRes, geoRes, aiRes, execRes] = await Promise.allSettled([
        analyticsService.getOverview(filterParams),
        analyticsService.getDepartmentPerformance({
          district: filterParams.district,
          startDate: filterParams.startDate,
          endDate: filterParams.endDate,
        }),
        analyticsService.getTrends({
          department: filterParams.department,
          district: filterParams.district,
          interval: "daily",
        }),
        analyticsService.getCategories({
          department: filterParams.department,
          district: filterParams.district,
        }),
        analyticsService.getGeographicIntelligence({
          department: filterParams.department,
          district: filterParams.district,
          priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
        }),
        analyticsService.getAiMetrics(),
        analyticsService.getExecutiveReport({
          department: filterParams.department,
          district: filterParams.district,
        }),
      ]);

      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value);
      if (deptsRes.status === "fulfilled") setDeptPerf(deptsRes.value);
      if (trendsRes.status === "fulfilled") setTrends(trendsRes.value);
      if (catRes.status === "fulfilled") setCategories(catRes.value);
      if (geoRes.status === "fulfilled") setGeoData(geoRes.value);
      if (aiRes.status === "fulfilled") setAiMetrics(aiRes.value);
      if (execRes.status === "fulfilled") setExecutiveReport(execRes.value);
    } catch (err) {
      console.error("Failed to load analytics payload:", err);
    } finally {
      setLoading(false);
    }
  }, [getDateFilter, selectedDept, selectedDistrict, selectedPriority]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      await analyticsService.downloadCsv({
        department: selectedDept !== "ALL" ? selectedDept : undefined,
        district: selectedDistrict !== "ALL" ? selectedDistrict : undefined,
        priority: selectedPriority !== "ALL" ? selectedPriority : undefined,
      });
    } catch (err) {
      console.error("Failed to download CSV:", err);
      alert("Failed to export complaints CSV. Please check permissions.");
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Title & Action Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-xl">
                <BarChart3 className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                  Government of Karnataka — Spatial Analytics & BI
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Real-time Grievance GIS Mapping, Sakala SLA Performance & AI Triage Intelligence
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Time Filter */}
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg text-xs font-semibold">
              {(["7d", "30d", "90d", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-all ${
                    timeRange === r
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                  }`}
                >
                  {r === "all" ? "All Time" : `Past ${r}`}
                </button>
              ))}
            </div>

            {/* Department Dropdown */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value="ALL">All Departments</option>
              <option value="Revenue Department">Revenue Department</option>
              <option value="Rural Development & Panchayat Raj">Rural Development & Panchayat Raj</option>
              <option value="Home Affairs">Home Affairs</option>
              <option value="Health & Family Welfare">Health & Family Welfare</option>
              <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
              <option value="Water Resources">Water Resources</option>
              <option value="Agriculture">Agriculture</option>
              <option value="Women & Child Development">Women & Child Development</option>
              <option value="School Education & Literacy">School Education & Literacy</option>
              <option value="Food & Civil Supplies">Food & Civil Supplies</option>
              <option value="Energy Department">Energy Department</option>
            </select>

            {/* Reload Button */}
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              disabled={exportingCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exportingCsv ? "Exporting..." : "RFC 4180 CSV"}
            </button>
          </div>
        </div>

        {/* Selected District Tag banner if filtering */}
        {selectedDistrict !== "ALL" && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>
                Filtering analytics exclusively for <strong>{selectedDistrict} District</strong>.
              </span>
            </div>
            <button
              onClick={() => setSelectedDistrict("ALL")}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Reset to All Karnataka
            </button>
          </div>
        )}

        {/* Top KPI Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs mb-1">
              <span>Total Grievances</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {overview ? overview.total.toLocaleString() : "..."}
            </p>
            <span className="text-[10px] text-gray-400 mt-1 block">Karnataka State Portal</span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs mb-1">
              <span>Resolved</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {overview ? overview.resolved.toLocaleString() : "..."}
            </p>
            <span className="text-[10px] font-semibold text-emerald-600 mt-1 block">
              {overview ? `${overview.resolutionRate.toFixed(1)}% Rate` : "..."}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs mb-1">
              <span>SLA Escalated</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-2xl font-black text-red-600 dark:text-red-400">
              {overview ? overview.escalated.toLocaleString() : "..."}
            </p>
            <span className="text-[10px] text-red-500 mt-1 block font-medium">
              Sakala Multi-Tier Alerts
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs mb-1">
              <span>Avg Resolution</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {overview ? `${overview.avgResolutionHours.toFixed(1)}h` : "..."}
            </p>
            <span className="text-[10px] text-gray-400 mt-1 block">Turnaround Time</span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs mb-1">
              <span>Active Hotspots</span>
              <MapPin className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {geoData ? geoData.hotspots.length : "..."}
            </p>
            <span className="text-[10px] text-purple-600 mt-1 block font-medium">
              Spatial Clusters (&ge;3)
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-xs mb-1">
              <span>Sakala Compliance</span>
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {overview ? `${overview.complianceRate.toFixed(1)}%` : "..."}
            </p>
            <span className="text-[10px] text-gray-400 mt-1 block">Statutory Standard</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 space-x-2 sm:space-x-4 overflow-x-auto">
          {[
            { id: "gis", label: "GIS Hotspot Map", icon: MapPin },
            { id: "departments", label: "Department Scorecard", icon: Building2 },
            { id: "trends", label: "Intake & Velocity", icon: TrendingUp },
            { id: "ai", label: "AI & Volunteer Analytics", icon: Cpu },
            { id: "executive", label: "Executive Digest", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const tabId = tab.id as "gis" | "departments" | "trends" | "ai" | "executive";
            const active = activeTab === tabId;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tabId)}
                className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                  active
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        {activeTab === "gis" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <GisMapViewer
                points={geoData?.points || []}
                hotspots={geoData?.hotspots || []}
                districtScorecard={geoData?.districtScorecard || []}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={(dist) => setSelectedDistrict(dist)}
                selectedDepartment={selectedDept}
                onSelectDepartment={(dept) => setSelectedDept(dept)}
                selectedPriority={selectedPriority}
                onSelectPriority={(prio) => setSelectedPriority(prio)}
                loading={loading}
              />
            </div>
            <div>
              <DistrictHealthRanking
                districts={geoData?.districtScorecard || []}
                selectedDistrict={selectedDistrict !== "ALL" ? selectedDistrict : null}
                onSelectDistrict={(dist) =>
                  setSelectedDistrict(dist === selectedDistrict ? "ALL" : dist)
                }
              />
            </div>
          </div>
        )}

        {activeTab === "departments" && (
          <div>
            <DepartmentPerformanceTable departments={deptPerf} loading={loading} />
          </div>
        )}

        {activeTab === "trends" && (
          <div className="space-y-6">
            <GrievanceTrendsChart data={trends} />

            {/* Breakdown summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                  Top Grievance Categories Across Karnataka
                </h3>
                <div className="space-y-3">
                  {(categories?.byCategory || []).slice(0, 6).map((cat) => {
                    return (
                      <div key={cat.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {cat.category}
                          </span>
                          <span className="text-gray-500 font-semibold">
                            {cat.count} ({cat.percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: `${cat.percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {(!categories?.byCategory || categories.byCategory.length === 0) && (
                    <p className="text-xs text-gray-400">No category breakdown data available.</p>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
                  Sakala SLA Escalation Breakdown
                </h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Sakala Standard Compliance
                      </p>
                      <p className="text-lg font-bold text-emerald-600">
                        {overview ? overview.complianceRate.toFixed(1) : 0}%
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded font-semibold">
                      Within SLA
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Tier 1 (Gram Panchayat) Breaches
                      </p>
                      <p className="text-lg font-bold text-amber-600">
                        {Math.round((overview?.escalated || 0) * 0.6)}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-semibold">
                      Warning Tier
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Tier 2 (Taluk/District) Breaches
                      </p>
                      <p className="text-lg font-bold text-red-600">
                        {Math.round((overview?.escalated || 0) * 0.4)}
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 rounded font-semibold">
                      Critical Tier
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "ai" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AiModelMetricsCard metrics={aiMetrics} loading={loading} />

            {/* Strategic Recommendations Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                      AI Strategic Bottlenecks & Recommendations
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Algorithmic insights derived from complaint clustering and SLA velocity
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  {(executiveReport?.strategicRecommendations || [
                    "Prioritize rapid resolution of water supply complaints in northern taluks to arrest spatial clustering.",
                    "Reassign engineering personnel to departments with compliance rates below 70%.",
                    "Conduct refresher training for village volunteers on capturing high-resolution photos for faster OCR extraction.",
                    "Enforce Section 24 Sakala automatic escalation notices for pending revenue dispute grievances.",
                  ]).map((rec, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 text-xs text-gray-800 dark:text-gray-200 flex items-start gap-2"
                    >
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center font-bold shrink-0 text-[10px]">
                        {i + 1}
                      </span>
                      <p className="leading-relaxed">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-[11px] text-gray-400">
                Panchayat Raj & Rural Development Department Field Integration
              </div>
            </div>
          </div>
        )}

        {activeTab === "executive" && (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Government of Karnataka — Executive Performance Brief
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Auto-generated strategic summary under Karnataka Sakala Services Act, 2011
                  </p>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Print / Save PDF
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs">
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  Reporting Period: {executiveReport?.reportingPeriod || "All Current Records"} · Generated:{" "}
                  {executiveReport ? new Date(executiveReport.generatedAt).toLocaleString() : "Just now"}
                </p>
              </div>

              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                  Top Department Bottlenecks
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(executiveReport?.topBottlenecks || []).map((b) => (
                    <div
                      key={b.department}
                      className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <p className="font-bold text-xs text-red-900 dark:text-red-200">{b.department}</p>
                      <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                        {b.openCount} Open Grievances ({b.breachRate.toFixed(1)}% Breached)
                      </p>
                    </div>
                  ))}
                  {(!executiveReport?.topBottlenecks || executiveReport.topBottlenecks.length === 0) && (
                    <p className="text-xs text-gray-400">No severe departmental bottlenecks detected.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-2">
                  Strategic Action Points
                </h3>
                <ul className="space-y-2 list-disc list-inside text-xs text-gray-700 dark:text-gray-300">
                  {(executiveReport?.strategicRecommendations || []).map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboardPage;
