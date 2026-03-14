# Safentry

## Current State
Fully functional frontend-only visitor management system with: company registration/login, personnel login, visitor entry/exit recording, blacklist enforcement, visitor search/filter, personnel code reset, statistics panel, 7-day chart, PDF badge with QR code, digital signature, 10-language i18n, glassmorphism UI (dark navy + teal + amber). Data stored in browser memory only.

## Requested Changes (Diff)

### Add
1. Rozet yazdırma -- After PDF badge generation, add a "Yazdır" button that triggers browser print dialog.
2. Bina içi anlık liste -- New "Şu An Binada" tab: visitors who entered but not exited, elapsed time, total count.
3. Randevu sistemi -- Personnel creates appointments (visitor name, ID, host, date/time, purpose). Security sees today's appointments and approves with one click (converts to visitor entry).
4. Tekrarlayan ziyaretçi tanıma -- On ID entry in visitor form, auto-fill fields from previous visits.
5. CSV dışa aktarma -- Admin panel date range picker + export to CSV.
6. Araç plaka kaydı -- Optional plate field in visitor entry form, shown in visitor list.
7. Çıkış değerlendirmesi -- Star rating (1-5) + optional comment when recording exit. Average shown in statistics.

### Modify
- Visitor form: add plate field, auto-fill from history.
- Exit flow: rating/comment step before confirming.
- Statistics: add average rating metric.
- PDF badge: ensure print button after generation.

### Remove
- Nothing removed.

## Implementation Plan
1. Extend visitor data model with plate, rating, ratingComment fields.
2. Add appointment data model with id, visitorName, visitorId, host, date, time, purpose, status.
3. Implement auto-fill on ID input.
4. Add plate field to visitor form.
5. Add "Şu An Binada" tab with elapsed time counter.
6. Add appointment create form and today's appointments approval list.
7. Add exit rating modal.
8. Add CSV export with date range filter.
9. Add print button after PDF generation.
10. Update statistics to show average rating.
