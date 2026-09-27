import React from "react";
import { DepartmentPerformanceItem } from "@/services/api/analytics.service";
import { Building2, CheckCircle2, Clock } from "lucide-react";

interface DepartmentPerformanceTableProps {
  departments: DepartmentPerformanceItem[];
  loading: boolean;
}

export const DepartmentPerformanceTable: React.FC<DepartmentPerformanceTableProps> = ({
  departments,
  loading,
}) => {
  const getGradeBadge = (grade: "A+" | "A" | "B" | "C" | "D") => {
    switch (grade) {
      case "A+":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">A+</span>;
      case "A":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">A</span>;
      case "B":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">B</span>;
      case "C":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">C</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">D</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-700" />
            Karnataka Departmental Performance Scorecard
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Rankings evaluate Sakala resolution velocity, statutory deadline compliance, and backlog load.
          </p>
        </div>
        <div className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border">
          {departments.length} Monitored Departments
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-6 py-4">Department</th>
              <th className="px-6 py-4">Total Load</th>
              <th className="px-6 py-4">Resolved</th>
              <th className="px-6 py-4">Active Backlog</th>
              <th className="px-6 py-4">SLA Compliance</th>
              <th className="px-6 py-4">Avg Redressal</th>
              <th className="px-6 py-4 text-center">Sakala Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  Loading departmental performance metrics...
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  No department records found.
                </td>
              </tr>
            ) : (
              departments.map((d) => (
                <tr key={d.department} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{d.department}</div>
                    <div className="text-[11px] font-mono text-purple-700">{d.code}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">{d.total}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {d.resolved}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-amber-700">{d.open}</span>
                    {d.breached > 0 && (
                      <span className="ml-1 text-[11px] text-red-600 font-bold">
                        ({d.breached} breached)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32">
                      <div className="flex justify-between text-xs mb-1 font-bold">
                        <span
                          className={
                            d.complianceRate >= 85
                              ? "text-emerald-700"
                              : d.complianceRate >= 70
                              ? "text-amber-700"
                              : "text-red-700"
                          }
                        >
                          {d.complianceRate}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            d.complianceRate >= 85
                              ? "bg-emerald-500"
                              : d.complianceRate >= 70
                              ? "bg-amber-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, d.complianceRate))}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {d.avgResolutionHours}h
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">{getGradeBadge(d.grade)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
