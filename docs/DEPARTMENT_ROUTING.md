# VCGIS Department Routing & Isolation Architecture

## Active Departments

VCGIS supports **three active operational departments**:
- `WATER` — Water Supply & Sanitation
- `ELECTRICITY` — Electricity & Power Distribution
- `ROAD` — Roads & Transport Infrastructure

---

## Routing Protocol

1. **AI Classification Stage:**
   - Complaint text is processed by `ai-service/app/services/classifier_service.py`.
   - If confidence is high (`p >= 0.50`, `margin >= 0.15`), `primary_department` is set to `ROAD`, `ELECTRICITY`, or `WATER`.
   - If evidence is ambiguous, low confidence, or out-of-scope, `primary_department` is set to `UNCERTAIN` or `OUT_OF_SCOPE`.

2. **Backend Auto-Routing (`complaint-routing.service.ts`):**
   - Locates active `DEPARTMENT_STAFF` users for `departmentCode`.
   - Locates supervising `OFFICIAL` for `departmentCode`.
   - Sets operational routing to `DEPARTMENT_STAFF` queue and supervisory link to `assignedOfficialId`.
   - If no staff or official is available, the complaint status shifts to `ON_HOLD` / exception state with explicit audit logging.

---

## Department Isolation Security Rules

- **Middleware Enforcement:** `requireDepartmentStaffDepartment` and `requireOfficialDepartment` in `backend/src/middlewares/department-isolation.middleware.ts`.
- **Validation Rule:**
  ```ts
  staffDeptCode === complaint.departmentCode
  ```
- **Unauthorized Attempt Response:** HTTP 403 Forbidden with `DEPARTMENT_ISOLATION_VIOLATION` code and an automatic security audit record.
