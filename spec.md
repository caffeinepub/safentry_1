# Safentry v49 — Appointment Backend Persistence

## Current State
Core data (company, staff, visitor, blacklist) is backend-persistent via Motoko. Appointments are still localStorage-only, meaning personnel on different devices cannot share appointment data. This breaks the multi-tenant isolation promise.

## Requested Changes (Diff)

### Add
- Appointment type in Motoko backend with all required fields
- `saveAppointment(entry)` backend function per company
- `getAppointments(companyId)` backend query
- `deleteAppointment(companyId, id)` backend function
- `syncSaveAppointment` and `syncDeleteAppointment` in backendSync.ts
- Appointment merge in `syncFromBackend` (on login, pull backend appointments and merge into localStorage)

### Modify
- `saveAppointment` in store.ts: fire syncSaveAppointment after localStorage write
- `deleteAppointment` in store.ts: fire syncDeleteAppointment after localStorage delete
- `syncFromBackend` in backendSync.ts: add appointment pull/merge step

### Remove
- Nothing removed

## Implementation Plan
1. Extend Motoko actor with Appointment type and CRUD functions
2. Update backendSync.ts to add appointment sync helpers and merge logic
3. Update store.ts saveAppointment and deleteAppointment to call sync helpers
