# Safentry

## Current State
V39 is live. The system is a feature-complete frontend-only visitor management platform with localStorage persistence. It supports company/personnel code-based auth, visitor registration, kiosk mode, QR badges, blacklist, statistics, and many advanced workflows. All data is stored in localStorage.

## Requested Changes (Diff)

### Add
1. **Bulk CSV Visitor Import** -- A "CSV Yükle" button in the StaffDashboard visitor registration area and in CompanyDashboard. User uploads a CSV file with columns: name, tc, phone, company, category, hostPersonnel, appointmentDate. Rows are validated and bulk-imported as pre-registered visitors/appointments. A preview table shows before confirming. Download a template CSV button included.
2. **Visitor Self-Service Pre-Registration Portal** -- A new standalone page `/self-prereg/:companyCode` that any visitor can open on their phone. Shows company name, a registration form (name, TC, phone, visit purpose, host personnel name, date/time). On submit, creates a pre-registration entry that appears in the staff dashboard approval queue. Generates a QR code for the visitor to show at arrival. Personnel can share the link from their dashboard.
3. **Accessibility improvements (WCAG)** -- High contrast mode toggle in the top menu (saves to localStorage). All interactive elements get proper aria-labels. Focus ring styles made visible. Skip-to-content link. Color contrast improved for text on dark backgrounds. Screen reader friendly form labels.

### Modify
- CompanyDashboard: Add CSV import button in visitors/appointments area; add "Self-Reg Portal Link" copy button in profile or header.
- StaffDashboard: Add CSV import button; add share link for self-reg portal.
- App.tsx: Add route handling for `/self-prereg/:companyCode`.
- types.ts: Add `SelfPreRegEntry` type if needed.
- store.ts: Add functions for self-prereg entries and CSV import.
- index.css / App: High contrast mode class toggle.

### Remove
- Nothing removed.

## Implementation Plan
1. Update types.ts with SelfPreRegEntry type.
2. Update store.ts with getSelfPreRegEntries, saveSelfPreRegEntry functions.
3. Create SelfPreRegPage.tsx -- standalone visitor self-registration portal.
4. Create CsvImportModal.tsx -- CSV upload, preview, validate, bulk import.
5. Update App.tsx to route `/self-prereg/:companyCode`.
6. Update CompanyDashboard to show CSV import button and self-reg portal share link.
7. Update StaffDashboard to show CSV import button and self-reg portal share link.
8. Add high contrast mode toggle in the top navigation/header of both dashboards.
9. Add WCAG aria-labels, visible focus rings, skip-to-content link in global CSS.
