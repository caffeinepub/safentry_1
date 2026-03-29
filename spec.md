# Safentry v86

## Current State
Safentry is a multi-tenant corporate VMS with 85+ versions. The frontend is a large React/TypeScript app with localStorage + backend persistence. v85 added catering requests, max visit duration alerts, and kiosk auto-photo.

## Requested Changes (Diff)

### Add
1. **Hassas alan çift onay zorunluluğu** -- High-security areas (server room, production floor, vault) require TWO separate personnel approvals before visitor entry is granted. Each approval is logged with timestamp and approver ID.
2. **Ziyaretçi yeniden giriş soğuma süresi** -- After a visitor exits, they cannot re-enter until a configurable cooldown period expires (e.g. 2 hours). Not a blacklist — a temporary hold rule. Configurable per company.
3. **Personel günlük görev listesi** -- Each shift, personnel are assigned tasks (e.g. "08:00 - Gate B check", "10:00 - patrol", "12:00 - report submission"). Completed tasks are checked off. Incomplete tasks auto-transfer to the handover report.

### Modify
- Company Panel: add "🔐 Çift Onay Alanları", "⏳ Soğuma Süresi" tabs
- Personnel Panel: add "📋 Günlük Görevler" tab

### Remove
- Nothing removed

## Implementation Plan
1. Add dual-approval area management tab in Company Panel (define areas, assign required approvers, view pending/approved log)
2. Add cooldown period configuration tab in Company Panel (set cooldown duration in minutes/hours, view blocked re-entries)
3. Add daily task list tab in Personnel Panel (create tasks with time/description, mark complete, view incomplete tasks summary)
