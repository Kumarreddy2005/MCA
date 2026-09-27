/** Canonical VCGIS taxonomy shared by clients and services. */

export const ACTIVE_DEPARTMENT_CODES = ["ROAD", "ELECTRICITY", "WATER"] as const;
export type ActiveDepartmentCode = (typeof ACTIVE_DEPARTMENT_CODES)[number];

export const DEPARTMENT_DISPLAY_NAMES: Record<ActiveDepartmentCode, string> = {
  ROAD: "Roads & Transport",
  ELECTRICITY: "Electricity & Power",
  WATER: "Water Supply",
};

export const DEPARTMENT_SUBCATEGORIES: Record<ActiveDepartmentCode, readonly string[]> = {
  ROAD: ["Pothole", "Road Damage", "Road Collapse", "Waterlogged Road", "Footpath Damage", "Damaged Speed Breaker", "Damaged Manhole", "Roadside Damage", "Bridge/Culvert Damage", "Other Road Issue"],
  ELECTRICITY: ["Power Outage", "Streetlight Failure", "Transformer Problem", "Electrical Pole Damage", "Broken/Low-Hanging Wire", "Exposed Electrical Cable", "Sparking", "Voltage Fluctuation", "Electrical Safety Hazard", "Other Electricity Issue"],
  WATER: ["No Water Supply", "Low Water Pressure", "Pipeline Leakage", "Pipeline Burst", "Borewell Failure", "Pump Failure", "Water Tank Problem", "Water Contamination", "Irregular Water Supply", "Other Water Issue"],
};

export const UNCERTAIN_SUBCATEGORY = "UNCERTAIN" as const;

export function isActiveDepartmentCode(value: string): value is ActiveDepartmentCode {
  return (ACTIVE_DEPARTMENT_CODES as readonly string[]).includes(value);
}

export function subcategoryBelongsToDepartment(department: string, subcategory: string): boolean {
  return isActiveDepartmentCode(department) && DEPARTMENT_SUBCATEGORIES[department].includes(subcategory);
}
