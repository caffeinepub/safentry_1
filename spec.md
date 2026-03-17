# Safentry v29

## Current State
Safentry is a multi-tenant corporate visitor management frontend (v28). Data persists in localStorage. All major visitor management features are implemented. Camera component exists and is used for visitor photo in registration form. QR code component exists (useQRScanner hook). Custom fields exist per company but are not category-specific. No belongings tracking. No QR badge verification scan. No host appointment approval flow.

## Requested Changes (Diff)

### Add
- **Dinamik ziyaret formu**: Category-specific extra fields. When visitor category is selected (e.g., "Teknik Destek", "Teslimat", "Mülakat"), additional relevant fields appear (e.g., work order number for technical support, delivery order for delivery, position for interviews). Define per-category fields in Company Profile, display in visitor registration form.
- **Emanet / eşya teslim takibi**: When checking in a visitor, record confiscated/held items (phone, laptop, badge, bag, etc.) with item type, description, and quantity. On departure, mark items as returned. Active visitor card shows item count. Company Dashboard has a "Emanetler" view.
- **QR rozet tarama / doğrulama**: Staff can scan a visitor's QR badge using the camera. Uses useQRScanner hook to read the QR code, looks up the visitor, shows their status (active/departed/blacklisted). Accessible via a "QR Tara" button in Staff Dashboard.
- **Host randevu onay akışı**: When an appointment is created for a host (personnel), that host sees a "Bekleyen Onaylar" tab/section in their Staff Dashboard. They can Accept or Reject each pending appointment. Appointment status changes accordingly. Rejected appointments can include a reason.

### Modify
- types.ts: Add `categoryFields` to Company, add `BelongingsItem` interface, add `hostApprovalStatus` to Appointment.
- store.ts: Add belongings CRUD functions.
- StaffDashboard.tsx: Add QR scan modal, belongings tracking in visitor registration/departure, host approval section.
- CompanyDashboard.tsx: Add Emanetler view, category fields configuration in Profile.

### Remove
- Nothing removed.

## Implementation Plan
1. Extend types.ts: Add `categoryFields` (Record<string, {id,label,required}[]>) to Company; add `BelongingsItem` interface; add `hostApprovalStatus?: 'pending'|'approved'|'rejected'` and `hostRejectionReason?` to Appointment.
2. Extend store.ts: Add getBelongings/saveBelonging/returnBelonging functions.
3. StaffDashboard.tsx:
   - Dynamic form: when category changes, show category-specific fields defined in company.categoryFields[category].
   - Belongings: in registration modal add "Emanet Kayıt" section to record held items; in departure/visitor card show items with return button.
   - QR scan: add "QR Tara" button in toolbar; modal with camera QR scanner; on scan show visitor info.
   - Host approval: add "Onay Bekleyenler" badge on Randevular tab; inside tab show pending appointments where hostStaffId == currentStaff; accept/reject buttons.
4. CompanyDashboard.tsx:
   - Category fields config: in Profil tab, section to define per-category extra fields.
   - Emanetler tab: list all active belongings across visitors, filter by status.
