import React from "react";
import type { TrendItem } from "@/services/api/analytics.service";

interface GrievanceTrendsChartProps {
  data: TrendItem[];
}

export const GrievanceTrendsChart: React.FC<GrievanceTrendsChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        No trend data recorded for the selected window.
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.submitted, d.resolved)),
    1
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Grievance Intake vs. Resolution Trajectory
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Temporal day-by-day velocity across Karnataka State jurisdiction
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
            Grievances Lodged
          </span>
          <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            Disposed / Resolved
          </span>
        </div>
      </div>

      <div className="relative h-64 w-full flex items-end gap-1 sm:gap-2 pt-8 pb-6 border-b border-gray-200 dark:border-gray-700">
        {data.map((point, index) => {
          const submittedHeight = Math.round((point.submitted / maxVal) * 100);
          const resolvedHeight = Math.round((point.resolved / maxVal) * 100);
          const dateLabel = point.label || (point.date.length >= 10 ? point.date.slice(5) : point.date);

          return (
            <div
              key={point.date || index}
              className="flex-1 flex flex-col items-center h-full justify-end group relative"
            >
              {/* Tooltip */}
              <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-20 bg-gray-900 text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap">
                <p className="font-semibold text-gray-200">{point.date}</p>
                <p className="text-blue-300">Lodged: {point.submitted}</p>
                <p className="text-emerald-300">Resolved: {point.resolved}</p>
              </div>

              {/* Bars side by side */}
              <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                <div
                  style={{ height: `${Math.max(submittedHeight, 4)}%` }}
                  className="w-1/2 bg-blue-500 dark:bg-blue-600 rounded-t transition-all duration-300 group-hover:bg-blue-400"
                />
                <div
                  style={{ height: `${Math.max(resolvedHeight, 4)}%` }}
                  className="w-1/2 bg-emerald-500 dark:bg-emerald-600 rounded-t transition-all duration-300 group-hover:bg-emerald-400"
                />
              </div>

              {/* X-axis label (selective display on small screens) */}
              <span className="absolute -bottom-6 text-[10px] text-gray-400 truncate max-w-full text-center">
                {index % Math.ceil(data.length / 10) === 0 ? dateLabel : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Timeline Start: {data[0]?.date || "N/A"}</span>
        <span>Peak Daily Volume: {maxVal} records</span>
        <span>Latest: {data[data.length - 1]?.date || "N/A"}</span>
      </div>
    </div>
  );
};
