# Safentry

## Current State
Safentry is a multi-tenant corporate visitor management system (v40+) built as a React frontend with localStorage persistence. It includes 40+ feature batches covering visitor registration, kiosk mode, QR badges, appointments, blacklist, compliance, parking, heatmap, CSV import, self-pre-reg portal, and accessibility.

## Requested Changes (Diff)

### Add
1. **Refakatçi (Escort) Atama ve Takibi** -- VIP/yüksek güvenlikli ziyaretçiye personel atanır; personel "teslim aldım / teslim ettim" logu tutar. CompanyDashboard'da yönetim, StaffDashboard'da kendi escort atamalarını görür.
2. **Dijital İmza** -- NDA ve politika belgesi onayında onay kutusuna ek olarak mouse/dokunmatik ile imza çizme canvas'ı. Ziyaretçi kayıt formuna ve kiosk akışına entegre. SignatureCanvas bileşeni zaten mevcut, kullanıma alınacak.
3. **İzin Yenileme Talebi (Permit Renewal)** -- Süresi dolan müteahhit iznine "Yenileme Talep Et" butonu; admin onay kuyruğu ve onay/red akışı.
4. **Güvenlik Devriye Logu** -- Personel "kontrol noktası" ekleyip "Devriye kaydı tut" yapabilir; tarih/saat/personel/konum loglanır. StaffDashboard'da yeni sekme.
5. **Kayıp & Bulunan Eşya Defteri** -- Tesiste bırakılan/güvenliğe teslim edilen sahipsiz eşya kaydı; tanım, bulunan yer, tarih, talep eden kişi ve iade logu. CompanyDashboard'da yeni sekme.

### Modify
- Ziyaretçi kayıt formu ve kiosk NDA adımı: SignatureCanvas bileşenini entegre et, imza verisi kayıt nesnesine eklenir.
- Müteahhit iş izinleri (CompanyDashboard): süresi dolan/dolmak üzere olan izinlere yenileme talebi butonu ve admin onay arayüzü.
- localStorage store: escort kayıtları, devriye logları, kayıp eşya, izin yenileme talepleri için yeni veri anahtarları.

### Remove
- Yok.

## Implementation Plan
1. store.ts'e yeni CRUD fonksiyonları ekle: escorts, patrolLogs, lostFound, permitRenewalRequests.
2. EscortManager bileşeni: CompanyDashboard > Refakatçiler sekmesi; atama, "teslim al/ver" log butonu.
3. PatrolLog bileşeni: StaffDashboard > Devriye sekmesi; kontrol noktası ekle, log listesi.
4. LostFound bileşeni: CompanyDashboard > Kayıp Eşya sekmesi; kayıt ekle, iade onayla.
5. Permit renewal: CompanyDashboard > İş İzinleri sekmesine "Yenileme Talebi" butonu ve admin onay listesi.
6. Dijital imza: SignatureCanvas bileşenini ziyaretçi kayıt formu NDA adımına ve KioskMode NDA adımına entegre et; imza base64 olarak saklanır.
