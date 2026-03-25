# Safentry v73

## Current State
Safentry is a corporate visitor management system at v72. Features include kiosk mode, company dashboard with many tabs, staff dashboard, role-based access (admin/receptionist/staff), and extensive localStorage-based data management.

## Requested Changes (Diff)

### Add
1. **Kiosk bakım/devre dışı modu**: Admin can toggle kiosk into maintenance mode with a custom message. Kiosk reads this flag on load and shows a maintenance screen instead of the normal flow.
2. **Granüler personel yetki matrisi**: Admin can configure per-staff module access (which tabs/sections each staff member can see), stored per company. New tab in CompanyDashboard.
3. **GDPR veri yedek paketi**: New section in CompanyDashboard that exports all company data (visitors, staff, blacklist, appointments, incidents) as a downloadable JSON file.

### Modify
- store.ts: Add getKioskMaintenanceMode / saveKioskMaintenanceMode, getStaffPermissions / saveStaffPermissions functions
- KioskMode.tsx: Check maintenance mode on load, show maintenance screen if enabled
- CompanyDashboard.tsx: Add "🔧 Kiosk Bakım", "🔑 Yetki Matrisi", "📦 Veri Yedeği" tabs/sections

### Remove
Nothing removed.

## Implementation Plan
1. Add store functions for kiosk maintenance mode and staff permissions
2. Update KioskMode to check and display maintenance screen
3. Add KioskMaintenanceSection component in CompanyDashboard
4. Add StaffPermissionMatrix component in CompanyDashboard
5. Add GDPRDataBackup component in CompanyDashboard
