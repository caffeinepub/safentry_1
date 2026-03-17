# Safentry v28

## Current State
Safentry is a frontend-only corporate visitor management system (v27) with localStorage persistence. It has extensive features across company and staff dashboards including visitor registration, blacklist, appointments, kiosk mode, notifications, audit checklists, shift planning, PIN-based fast entry, visitor segmentation analytics, and kiosk content customization.

## Requested Changes (Diff)

### Add
1. **Visitor Self Check-out** -- Kiosk mode gets a "Check Out" flow: visitor enters their PIN or scans their badge QR to self check-out without staff involvement.
2. **Floor/Area-based Capacity** -- In addition to building-wide capacity, admin can define areas/floors with individual capacity limits; current occupancy per area shown in company dashboard.
3. **Audit Trail (simulated)** -- A dedicated log panel in company dashboard recording critical actions (blacklist add/remove, emergency mode toggle, data deletion, capacity changes) with timestamp, actor, and action description.
4. **Personal Staff Calendar** -- Each staff member sees only their own appointments in a personal calendar view within the staff dashboard (separate from the company-wide appointment calendar).
5. **Appointment Confirmation Page (shareable link)** -- When creating an appointment, a shareable confirmation link is generated; opening it shows a clean read-only page with appointment details for the visitor.
6. **Internal Messaging between Security Staff** -- A simple in-app message/note feed within the staff dashboard; staff can post short messages visible to all staff of the same company (stored in localStorage per company).

### Modify
- KioskMode: add self check-out option alongside existing visitor registration
- CompanyDashboard: add audit trail tab and floor/area capacity management
- StaffDashboard: add personal calendar tab and internal messaging tab
- Appointment creation: generate shareable confirmation link
- Store: add helper functions for audit log entries, area capacities, staff messages

### Remove
- Nothing removed

## Implementation Plan
1. Add audit trail data structures and logging helper to store.ts
2. Add area/floor capacity data structures and helpers to store.ts
3. Add staff messages data structures and helpers to store.ts
4. Add appointment confirmation link generation and read-only confirmation page
5. Add self check-out flow to KioskMode
6. Add audit trail tab to CompanyDashboard
7. Add floor/area capacity management UI to CompanyDashboard
8. Add personal calendar tab to StaffDashboard
9. Add internal messaging tab to StaffDashboard
10. Wire audit logging calls at key action points (blacklist, emergency, deletion)
