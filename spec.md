# Safentry

## Current State
V28 is live. The app is a multi-tenant corporate visitor management system with comprehensive features: visitor registration, blacklist, kiosk mode, appointments, notifications, audit trail, messaging, lobby display, shift planning, security checklists, comment management, fast re-entry PIN, segmentation analytics, kiosk content customization, pre-registration links, queue management, departmental capacity, etc.

## Requested Changes (Diff)

### Add
1. **Ziyaretçi ön kayıt (pre-registration)** -- When personnel creates an appointment, a shareable pre-registration form link is generated. Visitor fills in their details before arriving. When they reach the kiosk, their info is pre-filled and they just confirm.
2. **Bekleme sırası / sıra numarası** -- Queue number system on kiosk. When multiple visitors are waiting, each gets a queue number and estimated wait time (based on 3 min avg per visitor). Queue status visible on lobby display.
3. **Güvenlik olay kaydı** -- Independent security incident log separate from blacklist and emergency mode. Security personnel can log incidents: "unauthorized entry attempt at Gate B", "suspicious vehicle". Each incident logged with date/time/personnel. Viewable/reportable from company admin panel.
4. **Departman bazlı ziyaretçi kotası** -- Per-department daily visitor limit. Admin sets max visitors per department. When limit reached, new visitors to that department are blocked. Displayed in department management.
5. **TC kimlik geçerlilik kontrolü** -- Turkish ID number (TC Kimlik No) validation using the official Luhn-like algorithm (11-digit check). Show format error before submission if invalid.
6. **Kiosk → personel aktif onay akışı** -- When visitor completes kiosk form, create a pending approval request visible in staff dashboard with Accept/Reject buttons. Staff gets notification. Only after acceptance does visitor status become "active". Rejected visitors get a message on kiosk screen.

### Modify
- KioskMode: Add queue number display, pre-registration lookup, TC validation, active approval waiting screen
- CompanyDashboard: Add security incidents tab, department quota management
- StaffDashboard: Add active approval queue with Accept/Reject, pre-registration link generation on appointments
- Store/types: Add incident records, queue state, department quotas, pre-registration records, pending approvals

### Remove
- Nothing removed

## Implementation Plan
1. Extend types.ts with: SecurityIncident, VisitorPreReg, PendingApproval, queue state
2. Extend store.ts with CRUD functions for new data types
3. Add TC validation utility function
4. Update KioskMode: queue system, pre-reg lookup, TC validation, approval waiting screen
5. Update StaffDashboard: active approval queue tab/section, pre-reg link on appointments
6. Update CompanyDashboard: security incidents tab, department quota fields
7. Update lobby display to show queue status
