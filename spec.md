# Safentry v80

## Current State
Safentry v79 is live. CompanyDashboard has tabs for badgeinventory and satisfactiontrend as the last two added. The AppTab type union ends at `satisfactiontrend`. Entry point management exists (EntryPointManager component), but no traffic analytics tab. Permit renewals exist in the permits tab, but no dedicated standalone workflow tab. No appointment pre-host reminder settings exist.

## Requested Changes (Diff)

### Add
1. **Giriş Noktası Trafik Analizi tab** (`entrytrafik`) - analyzes traffic per entry point using visitor arrival data, shows hourly distribution chart, shift comparison, top entry points
2. **Randevu Öncesi Host Hatırlatma** (`hostreminder`) - settings tab to configure reminder timing (15/30/60/120 min); runtime simulation that marks upcoming appointments as reminder-sent; shows pending reminders
3. **Müteahhit İzin Yenileme İş Akışı** (`permitworkflow`) - dedicated tab showing permit expiry timeline, auto-detected expiring permits, renewal request creation by admin, approval/reject flow with full audit trail

### Modify
- AppTab union type: add `entrytrafik | hostreminder | permitworkflow`
- Tab list: add 3 new entries
- Tab render section: add 3 new blocks

### Remove
- Nothing removed

## Implementation Plan
1. Extend AppTab type
2. Add tab list entries with labels
3. Implement EntryTrafficTab component inline
4. Implement HostReminderTab component inline
5. Implement PermitWorkflowTab component inline
6. Add tab render blocks
