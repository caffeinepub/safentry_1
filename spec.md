# Safentry v23

## Current State
Safentry is a frontend-only multi-tenant corporate visitor management system (v22). Features include visitor registration, blacklist, appointments, kiosk mode, QR entry, badge printing, emergency mode, GDPR/KVKK reports, satisfaction ratings, daily summaries, badge customization, parking tracking, approved visitor list, full data export, and kiosk language selection. All data persists in localStorage.

## Requested Changes (Diff)

### Add
1. **Notification center** -- Bell icon in header with unread count badge. Panel lists events: kiosk approvals pending, over-capacity warnings, blacklist hits, badge expiry alerts. Each notification has timestamp, type icon, and dismiss action. Mark all read button.
2. **Department/floor management** -- Admin panel new tab "Departmanlar". CRUD for departments (name, floor, capacity). Visitor registration form's department dropdown becomes dynamic from this list.
3. **Time-restricted access** -- In category management, each visitor category can have allowed time window (start/end time, days of week). During registration, if visitor category is outside allowed window, show warning and block entry.
4. **Contractor work permit tracking** -- New tab "İş İzinleri" in company panel. Contractors (müteahhit category) must have work permit number, expiry date, insurance info. On registration, system checks if permit is valid. Expiring permits (within 7 days) show amber badge. Expired permits block entry.
5. **Visitor waiting SLA tracking** -- Kiosk-submitted visitors get a "waiting since" timestamp. Personnel panel shows waiting duration for pending kiosk approvals. Stats panel shows average response time. SLA breach threshold (configurable, default 10 min) triggers notification.

### Modify
- Header component: add notification bell with badge
- Category management: add time restriction fields
- Kiosk flow: capture waiting start timestamp
- Stats panel: add average SLA response time metric
- Visitor registration form: use dynamic departments list

### Remove
- Nothing removed

## Implementation Plan
1. Add notifications state to localStorage (array of notification objects with id, type, message, timestamp, read, companyCode)
2. Create NotificationCenter component (bell icon + dropdown panel) integrated into both CompanyDashboard and StaffDashboard headers
3. Add department management tab in CompanyDashboard with CRUD UI
4. Update visitor registration form to use dynamic departments from localStorage
5. Add time window fields to category editor in CompanyDashboard
6. Add time-restriction check in visitor registration logic
7. Create contractor work permit tab in CompanyDashboard with permit records
8. Add permit validation check on visitor registration for müteahhit category
9. Update kiosk submission to store waiting start timestamp
10. Add SLA display in StaffDashboard kiosk approval queue
11. Add SLA average metric to stats panel
