# Safentry

## Current State
Safentry is a frontend-only (v15) corporate visitor management system with:
- Personnel Panel: visitor registration, active visitors, in-building list, appointments, kiosk mode, visit history, pre-screening, invitation codes, recurring appointments
- Company Panel: visitor list (with daily/weekly/monthly/all time filters), personnel management, blacklist, statistics, evacuation list, announcements, audit log, profile
- Features: visitor categories, NDA/KVKK, badge printing, QR entry, CSV export, digital signature, custom form fields, shift detection, automatic exit, capacity alerts, multi-day visits, department routing, equipment tracking, pre-screening questions

## Requested Changes (Diff)

### Add
1. **Automatic blacklist check on registration** -- When registering a visitor (staff form or kiosk), check TC number against blacklist and block/warn if found
2. **Personnel absence management** -- Personnel can mark themselves as absent (vacation/sick); appointments to absent personnel show warning and offer reassignment
3. **Customizable exit survey** -- Company admin can define custom exit survey questions from Company Profile; exit survey uses those questions dynamically
4. **Advanced multi-field search/filter** -- Visitor list gets combined filters: name/TC text search + category dropdown + date range + assigned personnel, all combinable
5. **End-of-shift report** -- Automatic summary when a shift ends: total visitors, average stay duration, no-shows, per-category breakdown
6. **One-click repeat invitation** -- From visitor history, a "Re-invite" button creates a new appointment pre-filled with that visitor's data
7. **Alert/warning history log** -- All triggered alerts (capacity exceeded, after-hours entry, blacklist attempt, pre-screening fail) recorded with timestamp in a dedicated log tab

### Modify
- Visitor registration form: add blacklist check before saving
- Kiosk registration: add blacklist check before saving
- Company Profile tab: add custom exit survey question editor
- Company Visitors tab: replace simple search with multi-field filter panel
- Shift panel/detection: add end-of-shift report generation
- Visitor history view: add re-invite/re-appoint button per entry

### Remove
- Nothing removed

## Implementation Plan
1. Add `alertHistory` array to company data store; create helper to log alerts
2. Implement blacklist TC check in both staff registration form and kiosk form; show blocking modal if match found, log to alert history
3. Add `absentUntil` / `absenceReason` fields to personnel data; add absence toggle UI in staff profile; show warning badge on appointments for absent personnel with reassign option
4. Add `customExitQuestions` array to company profile; add question editor UI in Company Profile tab; make exit survey modal render dynamic questions
5. Replace visitor list search input with multi-field filter panel (name/TC input + category select + date-from/to + personnel select)
6. Add shift report modal: triggered when shift ends or manually from shift panel; shows stats for that shift period
7. Add re-invite button in visitor history rows; clicking opens new appointment modal pre-filled with visitor info
8. Add "Uyarı Geçmişi" (Alert History) tab in Company Panel showing all logged alerts with type, timestamp, detail
