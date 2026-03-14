# Safentry

## Current State
Safentry is a multi-tenant corporate visitor management system with a React frontend (browser-memory only). Features include: visitor registration with digital signature, badge printing, real-time in-building list, appointment system (recurring), repeat visitor autofill, CSV export/import, vehicle plate recording, exit survey, evacuation section, announcements, audit logs, visitor categories, visitor history, capacity limits, NDA/KVKK agreements, waiting time alerts, visitor notes, kiosk mode (with waiting screen), shift support, advanced reporting, personnel performance tracking, custom form fields, automatic exit, visitor invitation links/codes, overtime warnings, ID check confirmation modal, printable evacuation list, fallback contact routing. Camera and QR code components are now selected.

## Requested Changes (Diff)

### Add
1. **Ziyaretçi fotoğrafı** -- In the visitor registration form (staff panel) and kiosk mode, add a webcam photo capture step using `camera/useCamera`. Photo saved as base64 in visitor record. Displayed as thumbnail in visitor list and detail.
2. **QR kod ile hızlı giriş** -- In kiosk mode, add a "QR ile Giriş" button that opens QR scanner using `qr-code/useQRScanner`. When an invitation code QR is scanned, auto-fill the visitor form fields from the matching appointment/invite record.
3. **Randevu geri sayımı** -- In the appointments tab (staff panel), show a live countdown badge next to each upcoming appointment (e.g., "18 dk sonra"). Update every minute.
4. **Özel karşılama mesajı** -- In company profile settings, add a "Kiosk Karşılama Mesajı" text field. This message is displayed on the kiosk welcome screen instead of the default text.
5. **Erişilebilirlik/özel ihtiyaç notu** -- Add an optional "Özel Gereksinim" dropdown field to the visitor form (Tekerlekli Sandalye, Refakatçi, İşaret Dili, Diğer, Yok). Show an icon indicator in the active visitor list when a visitor has special needs.

### Modify
- KioskMode.tsx: Add QR scanner entry option on the welcome screen; show custom welcome message from company settings; integrate photo capture step in the form flow.
- StaffDashboard.tsx: Add photo capture to visitor registration modal; show photo thumbnails in visitor list; add live countdown to appointments tab; add accessibility icon in active visitor rows.
- CompanyDashboard.tsx: Add "Kiosk Karşılama Mesajı" field in company profile settings.

### Remove
- Nothing removed.

## Implementation Plan
1. Add `visitorPhoto: string` (base64) and `specialNeeds: string` fields to the visitor data model in state.
2. Add `kioskWelcomeMessage: string` to company settings state.
3. Create a `VisitorPhotoCapture` component using `useCamera` hook -- shows live preview, capture button, retake option, displays captured photo.
4. Create a `QREntryScanner` component using `useQRScanner` -- scans QR, matches against invite codes, auto-fills form.
5. In `StaffDashboard.tsx`: integrate `VisitorPhotoCapture` in visitor registration modal; add `specialNeeds` dropdown; show photo thumbnail + special needs icon in visitor rows; add live countdown badges on appointments.
6. In `KioskMode.tsx`: add QR entry option on welcome; use custom welcome message; add photo capture step in kiosk form.
7. In `CompanyDashboard.tsx`: add kioskWelcomeMessage input in profile tab.
8. Validate and build.
