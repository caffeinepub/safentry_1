# Safentry

## Current State
- Backend has `registerStaff`, `loginStaff`, `getStaffByCompanyId` endpoints live
- `StaffRegister.tsx` calls `actor.registerStaff()` (fire-and-forget, localStorage-first) ✓
- `StaffLogin.tsx` queries `actor.loginStaff()` first, falls back to localStorage ✓
- `backendSync.ts` syncs visitors and blacklist but has critical method name bugs:
  - calls `actor.addVisitor` (should be `saveVisitor`)
  - calls `actor.getVisitorsByCompany` (should be `getVisitors`)
  - calls `actor.getBlacklistEntries` (should be `getBlacklist`)
  - uses `BigInt` for `visitorId` (should be `string` per backend.d.ts)
- Staff list is NOT synced from backend on login (only visitors+blacklist are)

## Requested Changes (Diff)

### Add
- Staff sync in `syncFromBackend`: after login, fetch `getStaffByCompanyId` and merge into localStorage `safentry_staff`
- `syncSaveStaff` helper for future use

### Modify
- Fix `syncSaveVisitor`: use `actor.saveVisitor` (not `addVisitor`), `visitorId` as string (not BigInt)
- Fix `syncFromBackend`: use `actor.getVisitors` (not `getVisitorsByCompany`) and `actor.getBlacklist` (not `getBlacklistEntries`)
- Fix `syncAddBlacklist`: use `actor.addBlacklistEntry` (already correct, keep)

### Remove
- Nothing removed

## Implementation Plan
1. Rewrite `backendSync.ts` with correct method names, correct types, and staff sync
2. No backend changes needed (all required endpoints already exist)
3. No frontend page changes needed (StaffRegister and StaffLogin already handle backend)
