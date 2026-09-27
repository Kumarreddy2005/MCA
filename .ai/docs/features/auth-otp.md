# Citizen OTP & Staff Authentication

RELATED FEATURES: auth-otp, admin-user-management, frontend-shell
RELATED COMPONENTS: auth.controller, auth.middleware, user.model, otp.model, refreshToken.model, LoginPage, AuthContext, ProtectedRoute
RELATED APIs: POST /api/auth/citizen/send-otp, POST /api/auth/citizen/verify-otp, POST /api/auth/staff/login, POST /api/auth/refresh, POST /api/auth/logout, GET /api/auth/me, POST /api/auth/staff
RELATED COLLECTIONS: users, otps, refreshtokens

## Flow

1. **Citizen Authentication:**
   - Citizen enters a 10-digit Indian mobile number.
   - Backend invalidates previous pending OTPs, generates a cryptographically random 6-digit numeric OTP, and stores it in the `otps` collection with a 5-minute MongoDB TTL index.
   - In dev mode, a preview OTP is returned for testing convenience.
   - Citizen enters the 6-digit OTP. On verification, if the user doesn't exist, an account is automatically created with role `CITIZEN` and verified status.
   - JWT access token (15m expiry) and Refresh Token (7d expiry, stored in `refreshtokens`) are generated.

2. **Staff Authentication (Volunteer, Official, Admin):**
   - Staff members authenticate using official email and bcrypt-hashed password.
   - Role matching ensures Citizens cannot log in via password form.
   - Account active status (`isActive`) is validated.
   - Issues access token and refresh token upon successful verification.

3. **RBAC & Route Protection:**
   - `authenticate` middleware validates Bearer JWT token from `Authorization` header.
   - `authorize(...roles)` middleware enforces role boundaries (`CITIZEN`, `VOLUNTEER`, `OFFICIAL`, `ADMIN`).
   - Frontend `ProtectedRoute` guards views and redirects unauthenticated users or users with mismatched roles.

4. **Staff Provisioning:**
   - Admins can provision new staff accounts (Volunteers with assigned village/ward, Officials with assigned department, and sub-admins) via `POST /api/auth/staff`.
