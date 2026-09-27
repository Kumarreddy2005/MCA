/**
 * VCGIS Analytics & Geographic Intelligence Service (Phase 11)
 * High-performance analytics engine aggregating:
 * - Complaint & SLA KPI overview
 * - 11 Karnataka Department Performance Matrix
 * - Time-series intake vs. resolution trends
 * - GIS Hotspot & Spatial Cluster Intelligence (Zero-PII leakage)
 * - Volunteer Field Performance
 * - AI Model & Intelligence Accuracy Metrics
 * - RFC 4180 Compliant CSV Export & Executive Digest
 */

import { Complaint } from "../models/complaint.model.js";
import { Department } from "../models/department.model.js";
import { User } from "../models/user.model.js";
import { ComplaintStatus, Priority, SlaStatus, UserRole } from "../types/domain.js";

export interface AnalyticsFilter {
  department?: string;
  district?: string;
  priority?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// Karnataka District Centroids for geo-fallback
const KARNATAKA_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  Mysuru: { lat: 12.2958, lng: 76.6394 },
  "Bengaluru Urban": { lat: 12.9716, lng: 77.5946 },
  Belagavi: { lat: 15.8497, lng: 74.4977 },
  Kalaburagi: { lat: 17.3297, lng: 76.8343 },
  Dharwad: { lat: 15.4589, lng: 75.0078 },
  "Dakshina Kannada": { lat: 12.9141, lng: 74.856 },
  Tumakuru: { lat: 13.3379, lng: 77.101 },
  Shivamogga: { lat: 13.9299, lng: 75.5681 },
  Ballari: { lat: 15.1394, lng: 76.9214 },
  Hassan: { lat: 13.0033, lng: 76.1004 },
  Mandya: { lat: 12.5218, lng: 76.8951 },
  Udupi: { lat: 13.3409, lng: 74.7421 },
};

function buildComplaintQuery(filter: AnalyticsFilter): Record<string, unknown> {
  const query: Record<string, unknown> = {};

  if (filter.department && filter.department !== "ALL") {
    query.department = filter.department;
  }
  if (filter.district && filter.district !== "ALL") {
    query["location.district"] = filter.district;
  }
  if (filter.priority && filter.priority !== "ALL") {
    query.priority = filter.priority;
  }
  if (filter.status && filter.status !== "ALL") {
    query.status = filter.status;
  }

  if (filter.startDate || filter.endDate) {
    const dateQuery: Record<string, Date> = {};
    if (filter.startDate) dateQuery.$gte = new Date(filter.startDate);
    if (filter.endDate) {
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }
    query.createdAt = dateQuery;
  }

  return query;
}

export class AnalyticsService {
  /**
   * 1. High-Level Executive Overview KPIs
   */
  async getOverviewStats(filter: AnalyticsFilter): Promise<{
    total: number;
    open: number;
    resolved: number;
    breached: number;
    escalated: number;
    resolutionRate: number;
    complianceRate: number;
    breachRate: number;
    avgResolutionHours: number;
    feedbackAverage: number;
  }> {
    const query = buildComplaintQuery(filter);

    const [total, resolvedDocs, breached, escalated] = await Promise.all([
      Complaint.countDocuments(query),
      Complaint.find({
        ...query,
        status: { $in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
      }),
      Complaint.countDocuments({
        ...query,
        "sla.status": SlaStatus.BREACHED,
      }),
      Complaint.countDocuments({
        ...query,
        status: ComplaintStatus.ESCALATED,
      }),
    ]);

    const resolved = resolvedDocs.length;
    const open = Math.max(0, total - resolved);
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    const breachRate = total > 0 ? Math.round((breached / total) * 100) : 0;
    const complianceRate = Math.max(0, 100 - breachRate);

    // Calculate Average Resolution Hours
    let totalResolutionHours = 0;
    let feedbackTotal = 0;
    let feedbackCount = 0;

    for (const doc of resolvedDocs) {
      if (doc.resolution?.resolvedAt && doc.createdAt) {
        const diffMs = new Date(doc.resolution.resolvedAt).getTime() - new Date(doc.createdAt).getTime();
        totalResolutionHours += Math.max(0, diffMs / (1000 * 60 * 60));
      }
      if (doc.feedback?.rating) {
        feedbackTotal += doc.feedback.rating;
        feedbackCount++;
      }
    }

    const avgResolutionHours =
      resolved > 0 ? Math.round((totalResolutionHours / resolved) * 10) / 10 : 0;
    const feedbackAverage =
      feedbackCount > 0 ? Math.round((feedbackTotal / feedbackCount) * 10) / 10 : 0;

    return {
      total,
      open,
      resolved,
      breached,
      escalated,
      resolutionRate,
      complianceRate,
      breachRate,
      avgResolutionHours,
      feedbackAverage,
    };
  }

  /**
   * 2. Department Performance Matrix (Ranking all 11 Karnataka Departments)
   */
  async getDepartmentPerformance(filter: AnalyticsFilter): Promise<
    Array<{
      department: string;
      code: string;
      total: number;
      resolved: number;
      open: number;
      breached: number;
      complianceRate: number;
      avgResolutionHours: number;
      grade: "A+" | "A" | "B" | "C" | "D";
    }>
  > {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    const baseQuery = buildComplaintQuery(filter);

    const results = await Promise.all(
      departments.map(async (dept) => {
        const deptQuery = { ...baseQuery, $or: [{ departmentCode: dept.code }, { department: dept.name }] };
        const [total, resolvedDocs, breached] = await Promise.all([
          Complaint.countDocuments(deptQuery),
          Complaint.find({
            ...deptQuery,
            status: { $in: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
          }),
          Complaint.countDocuments({
            ...deptQuery,
            "sla.status": SlaStatus.BREACHED,
          }),
        ]);

        const resolved = resolvedDocs.length;
        const open = Math.max(0, total - resolved);
        const complianceRate = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;

        let totalHours = 0;
        for (const doc of resolvedDocs) {
          if (doc.resolution?.resolvedAt && doc.createdAt) {
            const diffMs = new Date(doc.resolution.resolvedAt).getTime() - new Date(doc.createdAt).getTime();
            totalHours += Math.max(0, diffMs / (1000 * 60 * 60));
          }
        }
        const avgResolutionHours =
          resolved > 0 ? Math.round((totalHours / resolved) * 10) / 10 : 0;

        let grade: "A+" | "A" | "B" | "C" | "D" = "A";
        if (complianceRate >= 95) grade = "A+";
        else if (complianceRate >= 85) grade = "A";
        else if (complianceRate >= 70) grade = "B";
        else if (complianceRate >= 50) grade = "C";
        else grade = "D";

        return {
          department: dept.name,
          code: dept.code,
          total,
          resolved,
          open,
          breached,
          complianceRate,
          avgResolutionHours,
          grade,
        };
      })
    );

    // Sort by total complaints descending
    return results.sort((a, b) => b.total - a.total);
  }

  /**
   * 3. Time-Series Trends (Intake vs. Resolution over time)
   */
  async getTrends(
    filter: AnalyticsFilter,
    _interval: "daily" | "weekly" | "monthly" = "daily"
  ): Promise<
    Array<{
      date: string;
      label: string;
      submitted: number;
      resolved: number;
    }>
  > {
    const query = buildComplaintQuery(filter);
    const complaints = await Complaint.find(query).sort({ createdAt: 1 });

    const groupedMap = new Map<string, { submitted: number; resolved: number; label: string }>();

    // Default to last 7 days if no complaints
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0] || "default";
      const label = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      groupedMap.set(key, { submitted: 0, resolved: 0, label });
    }

    for (const c of complaints) {
      const createdKey = new Date(c.createdAt).toISOString().split("T")[0] || "default";
      const existing = groupedMap.get(createdKey) || {
        submitted: 0,
        resolved: 0,
        label: new Date(c.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      };
      existing.submitted++;
      groupedMap.set(createdKey, existing);

      if (c.resolution?.resolvedAt) {
        const resolvedKey = new Date(c.resolution.resolvedAt).toISOString().split("T")[0] || "default";
        const resExisting = groupedMap.get(resolvedKey) || {
          submitted: 0,
          resolved: 0,
          label: new Date(c.resolution.resolvedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        };
        resExisting.resolved++;
        groupedMap.set(resolvedKey, resExisting);
      }
    }

    return Array.from(groupedMap.entries())
      .map(([date, val]) => ({
        date,
        label: val.label,
        submitted: val.submitted,
        resolved: val.resolved,
      }))
      .slice(-14); // Return latest 14 intervals
  }

  /**
   * 4. Priority & Category Breakdown
   */
  async getCategoryAndPriorityBreakdown(filter: AnalyticsFilter): Promise<{
    byPriority: Record<Priority, number>;
    byCategory: Array<{ category: string; count: number; percentage: number }>;
    byStatus: Record<string, number>;
  }> {
    const query = buildComplaintQuery(filter);
    const complaints = await Complaint.find(query);

    const byPriority: Record<Priority, number> = {
      [Priority.CRITICAL]: 0,
      [Priority.HIGH]: 0,
      [Priority.MEDIUM]: 0,
      [Priority.LOW]: 0,
    };

    const categoryMap = new Map<string, number>();
    const byStatus: Record<string, number> = {};

    for (const c of complaints) {
      if (c.priority && byPriority[c.priority] !== undefined) {
        byPriority[c.priority]++;
      }
      const cat = c.category || "General";
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);

      byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    }

    const total = complaints.length || 1;
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      byPriority,
      byCategory,
      byStatus,
    };
  }

  /**
   * 5. Geographic Intelligence (GIS Maps & Spatial Hotspots)
   * STRICT PRIVACY GUARD: Excludes citizen names, phones, and private house addresses.
   */
  async getGeographicIntelligence(filter: AnalyticsFilter): Promise<{
    points: Array<{
      id: string;
      complaintNumber: string;
      title: string;
      department: string;
      priority: Priority;
      status: ComplaintStatus;
      latitude: number;
      longitude: number;
      district: string;
      village: string;
      ward?: string;
    }>;
    hotspots: Array<{
      locationKey: string;
      village: string;
      district: string;
      count: number;
      criticalCount: number;
      topDepartment: string;
      latitude: number;
      longitude: number;
      severity: "CRITICAL" | "HIGH" | "MEDIUM";
    }>;
    districtScorecard: Array<{
      district: string;
      total: number;
      resolved: number;
      complianceRate: number;
      activeHotspots: number;
    }>;
  }> {
    const query = buildComplaintQuery(filter);
    const complaints = await Complaint.find(query).limit(500);

    const points: Array<{
      id: string;
      complaintNumber: string;
      title: string;
      department: string;
      priority: Priority;
      status: ComplaintStatus;
      latitude: number;
      longitude: number;
      district: string;
      village: string;
      ward?: string;
    }> = [];

    const hotspotMap = new Map<
      string,
      {
        village: string;
        district: string;
        count: number;
        criticalCount: number;
        deptCounts: Record<string, number>;
        lat: number;
        lng: number;
      }
    >();

    const districtMap = new Map<string, { total: number; resolved: number; breached: number; hotspots: number }>();

    for (const c of complaints) {
      const district = c.location?.district || "Mysuru";
      const village = c.location?.village || "Karnataka Rural";
      const baseCoord =
        KARNATAKA_DISTRICT_COORDS[district] ??
        KARNATAKA_DISTRICT_COORDS["Mysuru"] ?? { lat: 12.2958, lng: 76.6394 };

      // Jitter slightly if exact coordinates aren't set to preserve ground visibility
      let lat = c.location?.coordinates?.latitude;
      let lng = c.location?.coordinates?.longitude;

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        const hash = c.complaintNumber.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const offsetLat = ((hash % 100) - 50) * 0.003;
        const offsetLng = (((hash * 7) % 100) - 50) * 0.003;
        lat = baseCoord.lat + offsetLat;
        lng = baseCoord.lng + offsetLng;
      }

      // Safe Public Attribute projection (ZERO Citizen PII)
      points.push({
        id: c.id,
        complaintNumber: c.complaintNumber,
        title: c.title,
        department: c.department,
        priority: c.priority,
        status: c.status,
        latitude: Math.round(lat * 10000) / 10000,
        longitude: Math.round(lng * 10000) / 10000,
        district,
        village,
        ward: c.location?.ward,
      });

      // Spatial Clustering Key (Village + District)
      const clusterKey = `${village}__${district}`;
      const cluster = hotspotMap.get(clusterKey) || {
        village,
        district,
        count: 0,
        criticalCount: 0,
        deptCounts: {},
        lat,
        lng,
      };

      cluster.count++;
      if (c.priority === Priority.CRITICAL || c.priority === Priority.HIGH) {
        cluster.criticalCount++;
      }
      cluster.deptCounts[c.department] = (cluster.deptCounts[c.department] || 0) + 1;
      hotspotMap.set(clusterKey, cluster);

      // District Health Rollup
      const distData = districtMap.get(district) || { total: 0, resolved: 0, breached: 0, hotspots: 0 };
      distData.total++;
      if (c.status === ComplaintStatus.RESOLVED || c.status === ComplaintStatus.CLOSED) distData.resolved++;
      if (c.sla?.status === SlaStatus.BREACHED) distData.breached++;
      districtMap.set(district, distData);
    }

    // Format Hotspots
    const hotspots = Array.from(hotspotMap.entries())
      .filter(([_key, val]) => val.count >= 2)
      .map(([key, val]) => {
        const topDept = Object.entries(val.deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "General";
        let severity: "CRITICAL" | "HIGH" | "MEDIUM" = "MEDIUM";
        if (val.criticalCount >= 2 || val.count >= 5) severity = "CRITICAL";
        else if (val.count >= 3) severity = "HIGH";

        // Increment district hotspot count
        const d = districtMap.get(val.district);
        if (d) d.hotspots++;

        return {
          locationKey: key,
          village: val.village,
          district: val.district,
          count: val.count,
          criticalCount: val.criticalCount,
          topDepartment: topDept,
          latitude: val.lat,
          longitude: val.lng,
          severity,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Format District Scorecard
    const districtScorecard = Array.from(districtMap.entries())
      .map(([district, data]) => ({
        district,
        total: data.total,
        resolved: data.resolved,
        complianceRate: data.total > 0 ? Math.round(((data.total - data.breached) / data.total) * 100) : 100,
        activeHotspots: data.hotspots,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      points,
      hotspots,
      districtScorecard,
    };
  }

  /**
   * 6. Field Volunteer Operational Analytics
   */
  async getVolunteerMetrics(_filter: AnalyticsFilter): Promise<{
    totalVolunteers: number;
    activeCount: number;
    totalAssistedGrievances: number;
    totalFieldVerifications: number;
    topVolunteers: Array<{
      id: string;
      name: string;
      phone: string;
      village: string;
      district: string;
      assistedCount: number;
      verifiedCount: number;
    }>;
  }> {
    const volunteers = await User.find({ role: UserRole.VOLUNTEER });
    const totalAssistedGrievances = await Complaint.countDocuments({
      source: "VOLUNTEER_ASSISTED",
    });
    const totalFieldVerifications = await Complaint.countDocuments({
      "verification.verifiedBy": { $exists: true },
    });

    const detailedVolunteers = await Promise.all(
      volunteers.map(async (v) => {
        const [assistedCount, verifiedCount] = await Promise.all([
          Complaint.countDocuments({ "citizen.phone": v.phone, source: "VOLUNTEER_ASSISTED" }),
          Complaint.countDocuments({ "verification.verifiedBy": v.id }),
        ]);

        return {
          id: v.id,
          name: v.name,
          phone: v.phone,
          village: v.volunteerProfile?.assignedVillage || "Unassigned",
          district: v.volunteerProfile?.district || "Karnataka",
          assistedCount,
          verifiedCount,
        };
      })
    );

    const sortedVolunteers = detailedVolunteers.sort((a, b) => b.assistedCount + b.verifiedCount - (a.assistedCount + a.verifiedCount));

    return {
      totalVolunteers: volunteers.length,
      activeCount: volunteers.filter((v) => v.isActive).length,
      totalAssistedGrievances,
      totalFieldVerifications,
      topVolunteers: sortedVolunteers.slice(0, 5),
    };
  }

  /**
   * 7. AI Intelligence Microservice Accuracy Metrics
   */
  async getAiIntelligenceMetrics(): Promise<{
    totalAnalyzed: number;
    confidenceDistribution: {
      high: number; // >= 0.85
      medium: number; // 0.65 - 0.85
      low: number; // < 0.65
    };
    duplicateCandidatesFound: number;
    autoRoutingConfidenceAverage: number;
    nlpEntitiesDetectedCount: number;
  }> {
    const complaintsWithAi = await Complaint.find({ aiAnalysis: { $exists: true } });

    let high = 0;
    let medium = 0;
    let low = 0;
    let duplicateCandidatesFound = 0;
    let confidenceSum = 0;
    let nlpEntitiesDetectedCount = 0;

    for (const c of complaintsWithAi) {
      const conf = Number(c.aiAnalysis?.departmentRecommendation?.confidence ?? c.aiAnalysis?.classification?.confidence ?? 0);
      confidenceSum += conf;

      if (conf >= 0.85) high++;
      else if (conf >= 0.65) medium++;
      else low++;

      if (c.aiAnalysis?.duplicateCheck?.isDuplicateCandidate) {
        duplicateCandidatesFound++;
      }

      if (c.aiAnalysis?.nlp?.entities) {
        nlpEntitiesDetectedCount += c.aiAnalysis.nlp.entities.length;
      }
    }

    const totalAnalyzed = complaintsWithAi.length;
    const autoRoutingConfidenceAverage =
      totalAnalyzed > 0 ? Math.round((confidenceSum / totalAnalyzed) * 100) : 0;

    return {
      totalAnalyzed,
      confidenceDistribution: {
        high,
        medium,
        low,
      },
      duplicateCandidatesFound,
      autoRoutingConfidenceAverage,
      nlpEntitiesDetectedCount,
    };
  }

  /**
   * 8. RFC 4180 Compliant CSV Export
   */
  async generateComplaintsCsv(filter: AnalyticsFilter): Promise<string> {
    const query = buildComplaintQuery(filter);
    const complaints = await Complaint.find(query).sort({ createdAt: -1 });

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Complaint Number",
      "Title",
      "Department",
      "Category",
      "Priority",
      "Status",
      "SLA Status",
      "District",
      "Village",
      "Ward",
      "Source",
      "Created Date",
      "Resolved Date",
    ];

    const rows = complaints.map((c) => [
      escapeCsv(c.complaintNumber),
      escapeCsv(c.title),
      escapeCsv(c.department),
      escapeCsv(c.category),
      escapeCsv(c.priority),
      escapeCsv(c.status),
      escapeCsv(c.sla?.status || "ON_TRACK"),
      escapeCsv(c.location?.district),
      escapeCsv(c.location?.village),
      escapeCsv(c.location?.ward || ""),
      escapeCsv(c.source),
      escapeCsv(c.createdAt ? new Date(c.createdAt).toISOString() : ""),
      escapeCsv(c.resolution?.resolvedAt ? new Date(c.resolution.resolvedAt).toISOString() : ""),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }

  /**
   * 9. Strategic Executive Report Digest
   */
  async generateExecutiveReport(filter: AnalyticsFilter): Promise<{
    generatedAt: string;
    reportingPeriod: string;
    overview: Record<string, unknown>;
    topBottlenecks: Array<{ department: string; openCount: number; breachRate: number }>;
    criticalHotspots: Array<{ village: string; district: string; count: number }>;
    strategicRecommendations: string[];
  }> {
    const overview = await this.getOverviewStats(filter);
    const deptMatrix = await this.getDepartmentPerformance(filter);
    const geo = await this.getGeographicIntelligence(filter);

    const topBottlenecks = deptMatrix
      .filter((d) => d.open > 0)
      .sort((a, b) => b.open - a.open)
      .slice(0, 3)
      .map((d) => ({
        department: d.department,
        openCount: d.open,
        breachRate: 100 - d.complianceRate,
      }));

    const criticalHotspots = geo.hotspots.slice(0, 3).map((h) => ({
      village: h.village,
      district: h.district,
      count: h.count,
    }));

    const strategicRecommendations = [
      "Mobilize untied maintenance funds under Jal Jeevan Mission for rural drinking water repairs exceeding 48h.",
      "Direct BESCOM executive engineers to replenish distribution transformer buffer stocks in high-outage taluks.",
      "Instruct Mysuru and Bengaluru urban local bodies to conduct intensive daily black spot clearance drives.",
      "Enforce statutory compensation penalty under Sakala Citizen Charter for persistent SLA defaulters.",
    ];

    return {
      generatedAt: new Date().toISOString(),
      reportingPeriod: filter.startDate ? `${filter.startDate} to ${filter.endDate || "Present"}` : "All Time",
      overview,
      topBottlenecks,
      criticalHotspots,
      strategicRecommendations,
    };
  }
}

export const analyticsService = new AnalyticsService();
