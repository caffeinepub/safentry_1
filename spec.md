# Safentry v67

## Current State
Safentry is a feature-rich multi-tenant VMS with 66 versions of incremental improvements. The app has CompanyDashboard.tsx (~14k lines), StaffDashboard.tsx (~10k lines), and extensive store/types. All core data is backend-persistent. Last version (v66) added customizable form fields, internal messaging, photo recognition view, contractor company profiles, visitor queue management, and advanced stats filter.

## Requested Changes (Diff)

### Add
1. **Ziyaret Sonrası Toplantı Tutanağı** -- After visit departure, host can add meeting notes, decisions, and follow-up items linked to the visit record. Visible in visitor full profile and exportable. New tab/section in CompanyDashboard and accessible from visitor card actions.
2. **Çok Şubeli Konsolide Raporlama** -- Companies with multiple branches/locations can view a consolidated report comparing visitor counts, SLA compliance, satisfaction scores, and incident counts across all branches. New tab in CompanyDashboard.
3. **Ziyaretçi Geçici Erişim Yükseltme Talebi** -- During an active visit, host can request temporary access level upgrade for visitor (e.g., add production floor access). Security manager approves/rejects. Full request + approval log. Accessible from active visitor card.
4. **Etkinlik ve Konferans Yönetim Modülü** -- Full event lifecycle: create event with date/capacity/location, send bulk invite link, track pre-registrations per session, check in attendees on event day, generate post-event attendance report. New tab in CompanyDashboard.
5. **Ziyaretçi Puan ve Rozet Sistemi (Gamification)** -- Visitors auto-earn titles based on visit count (e.g., "Platin Misafir" at 10+ visits, "Güvenilir Tedarikçi" for contractors). Shown in kiosk welcome and visitor profile. Configurable thresholds.
6. **Özelleştirilebilir Onay Akışı Şablonları** -- Admin can define approval flow templates per visitor category (contractor: 3-step, VIP: auto-approve, standard: single host). When creating a visitor, the appropriate template is applied. New section in CompanyDashboard settings.

### Modify
- store.ts: Add types/storage for meeting notes, event management, access upgrade requests, visitor badges/titles, and approval flow templates.
- types.ts: Add new type definitions for all 6 features.
- CompanyDashboard.tsx: Add new tabs for meeting notes management, consolidated branch reports, event management, visitor gamification settings, and approval flow templates. Add access upgrade request approval UI.
- StaffDashboard.tsx: Add meeting notes entry after visitor departure. Add access upgrade request form for active visitors.
- KioskMode.tsx: Show visitor badge/title in personalized welcome message.

### Remove
- Nothing removed.

## Implementation Plan
1. Extend types.ts with MeetingNote, Event, EventAttendee, AccessUpgradeRequest, VisitorBadge, ApprovalFlowTemplate types
2. Extend store.ts with CRUD functions for all new data types (localStorage-backed)
3. Add MeetingNotes tab in CompanyDashboard - list all visit notes, searchable by visitor/date
4. Add meeting note entry button on departed visitor cards in StaffDashboard
5. Add ConsolidatedReport tab in CompanyDashboard - aggregates data across branches
6. Add AccessUpgrade request button on active visitor cards in StaffDashboard
7. Add AccessUpgrade approval section in CompanyDashboard
8. Add Events tab in CompanyDashboard - full CRUD + bulk invite link + attendee check-in
9. Add gamification settings in CompanyDashboard (configure title thresholds)
10. Show earned badge/title on visitor profile and kiosk welcome
11. Add ApprovalTemplates section in CompanyDashboard settings
12. Apply template logic when creating new visitor records
