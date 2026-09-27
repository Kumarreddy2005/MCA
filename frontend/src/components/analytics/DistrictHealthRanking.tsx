import React, { useState } from "react";
import type { DistrictScorecardItem } from "@/services/api/analytics.service";
import { Search, MapPin, Award, AlertCircle } from "lucide-react";

interface DistrictHealthRankingProps {
  districts: DistrictScorecardItem[];
  onSelectDistrict?: (districtName: string) => void;
  selectedDistrict?: string | null;
}

export const DistrictHealthRanking: React.FC<DistrictHealthRankingProps> = ({
  districts,
  onSelectDistrict,
  selectedDistrict,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"compliance" | "volume" | "hotspots">("compliance");

  const filtered = districts
    .filter((d: DistrictScorecardItem) => d.district.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a: DistrictScorecardItem, b: DistrictScorecardItem) => {
      if (sortBy === "compliance") return b.complianceRate - a.complianceRate;
      if (sortBy === "volume") return b.total - a.total;
      return b.activeHotspots - a.activeHotspots;
    });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Karnataka District Governance Index
            </h3>
          </div>
          <span className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold rounded-full border border-blue-200 dark:border-blue-800">
            {districts.length} Districts
          </span>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setSortBy("compliance")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                sortBy === "compliance"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              Sakala %
            </button>
            <button
              onClick={() => setSortBy("volume")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                sortBy === "volume"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              Volume
            </button>
            <button
              onClick={() => setSortBy("hotspots")}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                sortBy === "hotspots"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              Hotspots
            </button>
          </div>
        </div>
      </div>

      {/* District List */}
      <div className="overflow-y-auto max-h-[420px] divide-y divide-gray-100 dark:divide-gray-700/60 p-1">
        {filtered.map((d: DistrictScorecardItem, index: number) => {
          const isSelected = selectedDistrict === d.district;
          const isHealthy = d.complianceRate >= 80;
          const isModerate = d.complianceRate >= 50 && d.complianceRate < 80;

          return (
            <div
              key={d.district}
              onClick={() => onSelectDistrict?.(d.district)}
              className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center text-xs font-mono font-bold text-gray-400">
                  #{index + 1}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <p className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                      {d.district}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {d.total} Total · {d.resolved} Resolved
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {d.activeHotspots > 0 && (
                  <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold border border-red-200 dark:border-red-800">
                    <AlertCircle className="w-3 h-3" />
                    {d.activeHotspots} Hotspot{d.activeHotspots > 1 ? "s" : ""}
                  </span>
                )}

                <div className="text-right">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${
                      isHealthy
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : isModerate
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    }`}
                  >
                    {d.complianceRate.toFixed(1)}%
                  </span>
                  <div className="text-[10px] text-gray-400 mt-0.5">Sakala Rate</div>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-gray-400">
            No Karnataka districts match "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
};
