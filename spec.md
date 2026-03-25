# Safentry v72

## Current State
StaffDashboard (10,658 lines) has tabs: register, active, inside, appointments, preregistered, history, profile, invitations, gorevler, mycalendar, messages, incidents, patrol, maintenance, handover, shiftswap, imptasks, training, queue.

The `invitations` tab is declared in the Tab type and shown in the tab bar, but has NO render section (`{tab === "invitations" && ...}` is missing).

Returning visitor suggestion already exists via `handleIdNumberChange` + `returningSuggestion` state — shows a banner when idNumber >= 6 chars matches a past visitor. Name-based dropdown autocomplete does NOT exist.

## Requested Changes (Diff)

### Add
1. **Personel punch-in/punch-out tab** (`punchin`) in StaffDashboard: Personnel can clock in/out of their shift. Stores punch records in localStorage (key: `safentry_punchlog_<companyId>`). Shows current status (on duty / off duty), today's hours worked, and a history table of recent punches. Monthly summary with total hours.
2. **Invitation funnel tab** (fill the missing `invitations` tab render): Show invitation list with status stages: Gönderildi / Açıldı / Ön Kayıt Tamamlandı / Randevuya Dönüştü. Each invitation card shows stage badge, creation date, invited name. Funnel summary at top showing counts per stage.
3. **Name autocomplete dropdown** in register form: When typing visitor name (>=2 chars), show a dropdown of up to 5 matching past visitors (from visitors state, departed ones). Clicking a suggestion fills name, phone, category, visitType fields. This is SEPARATE from the existing idNumber-based returningSuggestion.

### Modify
- Add `punchin` to Tab type in StaffDashboard
- Add punch-in tab button to the tab bar
- Add render section for `invitations` tab
- Add render section for `punchin` tab
- Add name autocomplete state and dropdown to register form name field

### Remove
Nothing.

## Implementation Plan
1. Add `punchin` to Tab type
2. Add punch localStorage helpers (inline, no separate file needed)
3. Add punch state (isPunchedIn, punchLog) to StaffDashboard
4. Add punchin tab button in tab bar
5. Add `{tab === "punchin" && ...}` render section with clock-in/out button, today summary, history table
6. Add `{tab === "invitations" && ...}` render section with funnel header + invitation cards
7. Add nameQuery state + filtered suggestions for name autocomplete
8. Add dropdown overlay below name input field in register form
