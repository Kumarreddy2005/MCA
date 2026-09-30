# VCGIS Security & Authorization Architecture

## Security Controls Overview

1. **Authentication:**
   - Citizen OTP: Cryptographic 6-digit numeric OTP with 5-minute auto-expiry TTL index in MongoDB.
   - Staff Auth: bcrypt password hashing (10 salt rounds) with JWT access token (15m) and refresh token rotation (7d).

2. **Role-Based Access Control (RBAC):**
   - Backend `authenticate` and `authorize(...roles)` middlewares enforce authorization at every route endpoint.

3. **Department Isolation Security:**
   - Strict server-side validation ensuring Department Staff and Officials can ONLY view or modify grievances within their assigned department.
   - Unauthorized cross-department attempts trigger HTTP 403 Forbidden with `DEPARTMENT_ISOLATION_VIOLATION` code and write an audit security event to the `auditlogs` collection.

4. **Input Sanitization & Injection Defense:**
   - `sanitize.middleware.ts` recursively strips `$` operators and prototype pollution keys to prevent NoSQL injection.
   - Helmet security headers: HSTS, CSP, X-Content-Type-Options (`nosniff`).

5. **AI Safety & Abstention Protection:**
   - Low-confidence or ambiguous complaints return `primary_department = "UNCERTAIN"` and require human verification before department routing.
