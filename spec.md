# Safentry

## Current State

Safentry is a multi-tenant corporate visitor management frontend app (v20). All data is persisted via localStorage. The app has:
- Company and Personnel dashboards
- Visitor registration, active/in-building lists, appointments, history
- Blacklist management, statistics, kiosk mode, NDA enforcement
- Audit log, alert history, equipment tracking, evacuation list
- Onboarding, empty states, copy buttons, time-based filtering

## Requested Changes (Diff)

### Add

1. **Acil Durum / Kilitleme Modu** (Emergency Lockdown Mode)
   - New "Acil Durum" button in company and staff dashboards (red, prominent)
   - When activated: all new visitor registration is blocked, a red banner shows on all screens, a lockdown timestamp is recorded
   - Lockdown can be deactivated only from Company Dashboard by admin
   - Lockdown state stored in localStorage per company (`safentry_lockdown_{companyId}`)
   - Staff dashboard: if lockdown active, registration form shows a full-width red alert and submit is disabled

2. **Ziyaretçi Kategori Bazlı NDA** (Category-based NDA)
   - Company Profile tab: ability to add custom NDA text per visitor category
   - Stored in company object as `categoryNda?: Record<string, string>`
   - In visitor registration form (StaffDashboard): when a category is selected, show category-specific NDA text if defined; otherwise use default KVKK text
   - In KioskMode: same logic

3. **Kara Liste Neden Kategorisi** (Blacklist reason categories)
   - BlacklistEntry type: add `reasonCategory?: string` field
   - Predefined categories: "Güvenlik Tehdidi", "Yasak Kişi", "Eski Çalışan", "Hırsızlık", "Diğer"
   - In CompanyDashboard blacklist tab: add dropdown for reason category when adding a new entry
   - Show the category badge next to each blacklist entry

4. **KVKK/GDPR Uyum Raporu** (Compliance Report)
   - New "Uyum Raporu" tab or button in CompanyDashboard
   - Shows: total visitors stored, oldest record date, data retention policy (X days), scheduled deletion date, categories of data collected, compliance statement
   - Print/export button to generate a printable compliance summary

5. **Personel Performans Detayı** (Personnel Performance Detail)
   - In CompanyDashboard Statistics tab: expand personnel performance section
   - Per staff: total registrations, average processing time (time from arrival to form submit), busiest shift, busiest day, % of visitors with ratings, average rating given
   - Clickable staff row to open a modal with full performance breakdown

6. **localStorage Kalıcılığı Doğrulaması**
   - Data already persists via localStorage. Add a visual indicator in both dashboards: a small "Veriler kaydedildi" badge or tooltip noting data is locally stored.
   - Show a one-time notice on first login that data is stored in this browser only.

### Modify
- `BlacklistEntry` type: add `reasonCategory?: string`
- `Company` type: add `categoryNda?: Record<string, string>`
- `CompanyDashboard`: add lockdown toggle, compliance report tab, enhanced performance stats, blacklist category
- `StaffDashboard`: respect lockdown mode, use category-based NDA
- `KioskMode`: respect lockdown mode, use category-based NDA

### Remove
- Nothing removed

## Implementation Plan

1. Update `types.ts`: add `reasonCategory` to BlacklistEntry, add `categoryNda` to Company, add `lockdown` helpers
2. Update `store.ts`: add `getLockdown`, `setLockdown`, `clearLockdown` functions
3. Update `CompanyDashboard.tsx`:
   - Add lockdown toggle button in header
   - Show lockdown banner when active
   - Add blacklist reason category dropdown and badge
   - Add KVKK/GDPR compliance report section in a new tab
   - Expand personnel performance with detailed modal
   - Add category NDA editor in Profile tab
4. Update `StaffDashboard.tsx`:
   - Check lockdown state; block registration form if locked
   - Use category-specific NDA text in registration form
5. Update `KioskMode.tsx`:
   - Check lockdown state; show block screen if locked
   - Use category-specific NDA text
