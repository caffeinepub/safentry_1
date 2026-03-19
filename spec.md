# Safentry v42 - Backend Integration

## Current State
Frontend-only v41 with localStorage. Motoko backend generated with company/staff registration and login endpoints.

## Requested Changes (Diff)

### Add
- Backend calls in auth pages (CompanyRegister, CompanyLogin, StaffRegister, StaffLogin)

### Modify
- All 4 auth pages: async backend calls with try/catch localStorage fallback

### Remove
- Nothing; localStorage remains as fallback

## Implementation Plan
1. CompanyRegister: after saveCompany(), call actor.registerCompany() silently
2. CompanyLogin: try actor.loginCompany() first, sync company to localStorage if found, fallback to localStorage
3. StaffRegister: after saveStaff(), call actor.registerStaff() silently (role: non-admin -> security)
4. StaffLogin: try actor.loginStaff() first, sync staff to localStorage if found, fallback to localStorage
5. All backend calls wrapped in try/catch; failures are silent
