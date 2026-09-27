import React, { useState, useMemo } from "react";
import { GeoPoint, GeoHotspot, DistrictScorecardItem } from "@/services/api/analytics.service";
import { Priority } from "@/types/complaint";
import {
  MapPin,
  Flame,
  ShieldCheck,
  Layers,
  Info,
  Loader2,
} from "lucide-react";

interface GisMapViewerProps {
  points: GeoPoint[];
  hotspots: GeoHotspot[];
  districtScorecard: DistrictScorecardItem[];
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  selectedDepartment: string;
  onSelectDepartment: (dept: string) => void;
  selectedPriority: string;
  onSelectPriority: (priority: string) => void;
  loading: boolean;
}

// Bounding box for Karnataka State coordinates
// Lat: ~11.5°N to ~18.5°N (Span: 7°)
// Lng: ~74.0°E to ~78.5°E (Span: 4.5°)
const KARNATAKA_BOUNDS = {
  minLat: 11.5,
  maxLat: 18.5,
  minLng: 74.0,
  maxLng: 78.5,
};

const KARNATAKA_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  "Bengaluru Urban": { lat: 12.9716, lng: 77.5946 },
  "Bengaluru Rural": { lat: 13.2847, lng: 77.5505 },
  "Mysuru": { lat: 12.2958, lng: 76.6394 },
  "Belagavi": { lat: 15.8497, lng: 74.4977 },
  "Kalaburagi": { lat: 17.3297, lng: 76.8343 },
  "Hubballi-Dharwad": { lat: 15.3647, lng: 75.124 },
  "Mangaluru (Dakshina Kannada)": { lat: 12.9141, lng: 74.856 },
  "Ballari": { lat: 15.1394, lng: 76.9214 },
  "Shivamogga": { lat: 13.9299, lng: 75.5681 },
  "Tumakuru": { lat: 13.3409, lng: 77.101 },
  "Udupi": { lat: 13.3409, lng: 74.7421 },
  "Davanagere": { lat: 14.4644, lng: 75.9218 },
  "Hassan": { lat: 13.0033, lng: 76.1004 },
  "Raichur": { lat: 16.2076, lng: 77.3463 },
  "Bidar": { lat: 17.9104, lng: 77.5199 },
  "Mandya": { lat: 12.5218, lng: 76.8951 },
  "Chikkamagaluru": { lat: 13.3161, lng: 75.772 },
  "Vijayapura": { lat: 16.8302, lng: 75.71 },
  "Chitradurga": { lat: 14.2251, lng: 76.398 },
  "Kolar": { lat: 13.1367, lng: 78.1291 },
  "Chikkaballapura": { lat: 13.4355, lng: 77.7275 },
  "Uttara Kannada": { lat: 14.8136, lng: 74.1298 },
  "Koppal": { lat: 15.3526, lng: 76.1554 },
  "Bagalkote": { lat: 16.1691, lng: 75.6615 },
  "Gadag": { lat: 15.4297, lng: 75.631 },
  "Yadgir": { lat: 16.7627, lng: 77.1378 },
  "Chamarajanagar": { lat: 11.9261, lng: 76.9437 },
  "Haveri": { lat: 14.7954, lng: 75.4024 },
  "Ramanagara": { lat: 12.7209, lng: 77.2799 },
  "Kodagu": { lat: 12.4244, lng: 75.7382 },
  "Vijayanagara": { lat: 15.28, lng: 76.39 },
};

export const GisMapViewer: React.FC<GisMapViewerProps> = ({
  points,
  hotspots,
  districtScorecard,
  selectedDistrict,
  onSelectDistrict,
  selectedDepartment,
  onSelectDepartment,
  selectedPriority,
  onSelectPriority,
  loading,
}) => {
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<GeoHotspot | null>(null);
  const [viewMode, setViewMode] = useState<"POINTS" | "CLUSTERS">("CLUSTERS");

  // Project lat/lng to SVG canvas percentage (width: 500, height: 600)
  const projectCoordinates = (lat: number, lng: number) => {
    const x = ((lng - KARNATAKA_BOUNDS.minLng) / (KARNATAKA_BOUNDS.maxLng - KARNATAKA_BOUNDS.minLng)) * 460 + 20;
    // Invert Y because SVG coordinates go top-to-bottom while latitude goes south-to-north
    const y = ((KARNATAKA_BOUNDS.maxLat - lat) / (KARNATAKA_BOUNDS.maxLat - KARNATAKA_BOUNDS.minLat)) * 540 + 30;
    return { x: Math.max(20, Math.min(480, x)), y: Math.max(30, Math.min(570, y)) };
  };

  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (selectedDistrict !== "ALL" && p.district !== selectedDistrict) return false;
      if (selectedDepartment !== "ALL" && p.department !== selectedDepartment) return false;
      if (selectedPriority !== "ALL" && p.priority !== selectedPriority) return false;
      return true;
    });
  }, [points, selectedDistrict, selectedDepartment, selectedPriority]);

  const filteredHotspots = useMemo(() => {
    return hotspots.filter((h) => {
      if (selectedDistrict !== "ALL" && h.district !== selectedDistrict) return false;
      if (selectedDepartment !== "ALL" && h.topDepartment !== selectedDepartment) return false;
      return true;
    });
  }, [hotspots, selectedDistrict, selectedDepartment]);

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-900 leading-relaxed">
          <span className="font-bold">Section 32 Data Protection & Privacy Guard:</span> Public geographic coordinates display administrative cluster density only. Specific citizen identifiers, mobile numbers, and residential street addresses are strictly suppressed from all GIS layers.
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* District Selector */}
          <select
            value={selectedDistrict}
            onChange={(e) => onSelectDistrict(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 outline-hidden focus:ring-2 focus:ring-purple-600"
          >
            <option value="ALL">All Karnataka Districts</option>
            <option value="Mysuru">Mysuru</option>
            <option value="Bengaluru Urban">Bengaluru Urban</option>
            <option value="Belagavi">Belagavi</option>
            <option value="Kalaburagi">Kalaburagi</option>
            <option value="Dharwad">Dharwad</option>
            <option value="Dakshina Kannada">Dakshina Kannada</option>
            <option value="Tumakuru">Tumakuru</option>
            <option value="Shivamogga">Shivamogga</option>
            <option value="Ballari">Ballari</option>
          </select>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => onSelectDepartment(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 outline-hidden focus:ring-2 focus:ring-purple-600"
          >
            <option value="ALL">All Departments</option>
            <option value="Sanitation & Solid Waste">Sanitation & Solid Waste</option>
            <option value="Electricity & Power">Electricity & Power</option>
            <option value="Rural Water Supply">Rural Water Supply</option>
            <option value="Roads & Transport">Roads & Transport</option>
            <option value="Public Health & Medical">Public Health & Medical</option>
            <option value="Revenue & Land Records">Revenue & Land Records</option>
            <option value="Panchayat Raj & Drainage">Panchayat Raj & Drainage</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => onSelectPriority(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 outline-hidden focus:ring-2 focus:ring-purple-600"
          >
            <option value="ALL">All Priorities</option>
            <option value={Priority.CRITICAL}>Critical Only</option>
            <option value={Priority.HIGH}>High Priority</option>
            <option value={Priority.MEDIUM}>Medium Priority</option>
            <option value={Priority.LOW}>Low Priority</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-1 text-xs text-purple-600 font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading GIS...
            </div>
          )}
          {districtScorecard.length > 0 && (
            <span className="hidden sm:inline text-[11px] text-slate-500 font-medium">
              {districtScorecard.length} Districts Mapped
            </span>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => {
                setViewMode("CLUSTERS");
                setSelectedPoint(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "CLUSTERS" ? "bg-white text-purple-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Spatial Clusters ({filteredHotspots.length})
            </button>
            <button
              onClick={() => {
                setViewMode("POINTS");
                setSelectedHotspot(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === "POINTS" ? "bg-white text-purple-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Grievance Pins ({filteredPoints.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Map & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Vector GIS Canvas */}
        <div className="lg:col-span-8 bg-slate-950 rounded-2xl p-6 relative overflow-hidden shadow-xl border border-slate-800 min-h-[550px] flex flex-col items-center justify-center">
          {/* Map Title Header */}
          <div className="absolute top-4 left-4 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-purple-300 text-xs font-bold border border-slate-700">
              <Layers className="w-3.5 h-3.5" />
              Karnataka GIS Cartographic Grid
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Active Scope: <span className="text-white font-semibold">{selectedDistrict === "ALL" ? "Statewide" : selectedDistrict}</span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <svg
            viewBox="0 0 500 600"
            className="w-full h-auto max-h-[520px] filter drop-shadow-lg select-none"
          >
            {/* Ambient Karnataka State Silhouette */}
            <path
              d="M 170 40 Q 220 30, 270 50 L 330 90 Q 360 140, 370 190 L 330 250 Q 350 310, 330 360 L 290 430 Q 260 500, 220 540 L 170 520 Q 130 450, 120 390 L 110 320 Q 100 240, 120 170 Z"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* District Centroid Anchors */}
            {Object.entries(KARNATAKA_DISTRICT_COORDS).map(([district, coords]) => {
              const pt = projectCoordinates(coords.lat, coords.lng);
              const isSelected = selectedDistrict === district;
              return (
                <g
                  key={district}
                  onClick={() => onSelectDistrict(district)}
                  className="cursor-pointer group"
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 6 : 3}
                    fill={isSelected ? "#a855f7" : "#475569"}
                    className="transition-all duration-300"
                  />
                  <text
                    x={pt.x + 8}
                    y={pt.y + 4}
                    fill={isSelected ? "#f3e8ff" : "#64748b"}
                    fontSize={isSelected ? "11" : "9"}
                    fontWeight={isSelected ? "bold" : "normal"}
                    fontFamily="monospace"
                  >
                    {district}
                  </text>
                </g>
              );
            })}

            {/* Render Grievance Pins Mode */}
            {viewMode === "POINTS" &&
              filteredPoints.map((pt) => {
                const coord = projectCoordinates(pt.latitude, pt.longitude);
                const isSelected = selectedPoint?.id === pt.id;
                let fill = "#3b82f6";
                if (pt.priority === Priority.CRITICAL) fill = "#ef4444";
                else if (pt.priority === Priority.HIGH) fill = "#f59e0b";

                return (
                  <g
                    key={pt.id}
                    onClick={() => {
                      setSelectedPoint(pt);
                      setSelectedHotspot(null);
                    }}
                    className="cursor-pointer transition-transform hover:scale-125"
                  >
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isSelected ? 8 : 5}
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2 : 1}
                      opacity={0.9}
                    />
                  </g>
                );
              })}

            {/* Render Spatial Hotspot Clusters Mode */}
            {viewMode === "CLUSTERS" &&
              filteredHotspots.map((hs, idx) => {
                const coord = projectCoordinates(hs.latitude, hs.longitude);
                const isSelected = selectedHotspot?.locationKey === hs.locationKey;
                const radius = Math.min(26, Math.max(12, hs.count * 4));
                const color = hs.severity === "CRITICAL" ? "#ef4444" : hs.severity === "HIGH" ? "#f59e0b" : "#8b5cf6";

                return (
                  <g
                    key={idx}
                    onClick={() => {
                      setSelectedHotspot(hs);
                      setSelectedPoint(null);
                    }}
                    className="cursor-pointer transition-transform hover:scale-110"
                  >
                    {/* Pulsing ring for critical severity */}
                    {hs.severity === "CRITICAL" && (
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r={radius + 8}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        opacity="0.4"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={radius}
                      fill={color}
                      opacity={isSelected ? 0.95 : 0.75}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x={coord.x}
                      y={coord.y + 4}
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {hs.count}
                    </text>
                  </g>
                );
              })}
          </svg>

          {/* Map Legend */}
          <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-xs p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5 z-10">
            <div className="font-bold text-white text-xs mb-1">GIS Priority Legend</div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>Critical / Urgent Safety Hazard</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>High Priority / Sakala Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Medium / Standard Resolution</span>
            </div>
          </div>
        </div>

        {/* Right-Hand Inspector Drawer & District Ranking */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Selection Inspector */}
          {selectedPoint ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Grievance Inspector
                </span>
                <button
                  onClick={() => setSelectedPoint(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <div>
                <div className="text-xs font-mono font-bold text-purple-700">
                  {selectedPoint.complaintNumber}
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedPoint.title}</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Department</span>
                  <span className="font-semibold text-slate-900">{selectedPoint.department}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Priority</span>
                  <span
                    className={`font-bold ${
                      selectedPoint.priority === Priority.CRITICAL ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {selectedPoint.priority}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Village & Ward</span>
                  <span className="font-semibold text-slate-900">
                    {selectedPoint.village} {selectedPoint.ward ? `(${selectedPoint.ward})` : ""}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">District</span>
                  <span className="font-semibold text-slate-900">{selectedPoint.district}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <MapPin className="w-3 h-3 text-purple-600" />
                Lat: {selectedPoint.latitude}, Lng: {selectedPoint.longitude}
              </div>
            </div>
          ) : selectedHotspot ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Hotspot Cluster Detail
                </span>
                <button
                  onClick={() => setSelectedHotspot(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Flame
                  className={`w-5 h-5 ${
                    selectedHotspot.severity === "CRITICAL" ? "text-red-600" : "text-amber-600"
                  }`}
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedHotspot.village}</h4>
                  <span className="text-xs text-slate-500">{selectedHotspot.district}</span>
                </div>
              </div>

              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-red-900">Concentration Density:</span>
                  <span className="text-red-950 font-black">{selectedHotspot.count} grievances</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Critical Priority:</span>
                  <span className="font-bold text-red-700">{selectedHotspot.criticalCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Primary Department:</span>
                  <span className="font-semibold text-slate-900">{selectedHotspot.topDepartment}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                Requires coordinated field inspection between Gram Panchayat development officer and {selectedHotspot.topDepartment} engineers.
              </p>
            </div>
          ) : (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs text-slate-500 text-center">
              <Info className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              Click any grievance pin or cluster circle on the Karnataka map to inspect ground intelligence.
            </div>
          )}

          {/* Top Spatial Hotspots Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-red-600" />
              Active Infrastructure Hotspots
            </h4>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredHotspots.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No dense clusters detected in current filter.
                </div>
              ) : (
                filteredHotspots.slice(0, 5).map((hs, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSelectedHotspot(hs);
                      setSelectedPoint(null);
                    }}
                    className="p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{hs.village}</div>
                      <div className="text-slate-500 text-[11px]">
                        {hs.district} • {hs.topDepartment}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full font-black text-xs bg-red-100 text-red-800">
                      {hs.count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
