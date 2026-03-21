# Safentry v54

## Current State
Safentry is a multi-tenant corporate visitor management system (v53) with a Motoko backend and React frontend. Features include visitor registration, blacklist, personnel, appointments, kiosk, QR/badge printing, NDA/signatures, blob storage for photos/documents, SLA-adjacent wait-time stats, satisfaction surveys, post-visit feedback pages, and 50+ additional features across CompanyDashboard and StaffDashboard.

## Requested Changes (Diff)

### Add
1. **SLA / Bekleme süresi ihlal takibi** -- Admin tanımlanan SLA sürelerini (ör. max 5 dk bekleme) CompanyDashboard > SLA sekmesinde yönetebilmeli. Aktif ziyaretçiler için bekleme süresi SLA'yı aştığında ihlal logu oluşturulmalı. SLA ihlal raporu tablo+grafik ile gösterilmeli.
2. **Ziyaretçi NPS analizi** -- Mevcut memnuniyet puanları (1-5 yıldız) NPS metodolojisiyle yeniden hesaplanmalı: 5=Promoter, 3-4=Passive, 1-2=Detractor. CompanyDashboard > İstatistikler altında NPS skoru (0-100 arası) ve Promoter/Passive/Detractor dağılımı gösterilmeli.
3. **Mobil self check-in QR kodu** -- StaffDashboard veya ziyaretçiye gönderilecek bir link ile ziyaretçi kendi telefonundan `/selfcheckin/<token>` URL'ine giderek kayıt formunu doldurup "Beklemede" statüsüyle kaydolabilmeli. AppScreen tipine "self-checkin" eklenmeli. Yeni SelfCheckinPage bileşeni oluşturulmalı.
4. **Ziyaretçi kara liste ön uyarı (pre-check)** -- Ziyaretçi kayıt formu (hem manuel kayıt hem kiosk) TC kimlik numarası alanı onChange tetiklendiğinde anında kara liste sorgusu yapıp form submit'ten önce sarı uyarı bandı göstermeli.
5. **Periyodik bakım ve temizlik talebi** -- StaffDashboard ve CompanyDashboard'a "Bakım Talepleri" sekmesi eklenmeli. Personel; yer, kategori (temizlik/teknik/güvenlik/diğer), açıklama ile talep açabilmeli. Admin talepleri görüp "İşlemde" / "Tamamlandı" olarak güncelleyebilmeli.
6. **Ziyaretçi anket QR kodu (post-visit)** -- Ziyaretçi çıkış yapıldığında veya rozet görüntülendiğinde mevcut feedback URL'ine yönlendiren QR kodu gösterilmeli. Çıkış modal/kartında "Anket QR" butonu ile QR kodu popup açılmalı.

### Modify
- CompanyDashboard: SLA sekmesi eklenmeli, İstatistikler sekmesine NPS bölümü eklenmeli
- StaffDashboard: Bakım Talepleri sekmesi eklenmeli
- Visitor kayıt formu (kiosk dahil): TC alanına pre-check eklenmeli
- Visitor çıkış akışı: Anket QR butonu eklenmeli
- types.ts: SlaRule, MaintenanceRequest tipleri eklenmeli; AppScreen'e "self-checkin" eklenmeli
- store.ts: SlaRule ve MaintenanceRequest CRUD fonksiyonları eklenmeli
- App.tsx: self-checkin rotası eklenmeli

### Remove
- Hiçbir mevcut özellik kaldırılmayacak

## Implementation Plan
1. types.ts'e SlaRule, MaintenanceRequest tipleri ekle; AppScreen'e "self-checkin" ekle
2. store.ts'e getSlaRules/saveSlaRule/deleteSlaRule ve getMaintenanceRequests/saveMaintenanceRequest fonksiyonları ekle
3. SelfCheckinPage.tsx bileşeni oluştur (mobil-friendly basit form)
4. CompanyDashboard'a SLA sekmesi ekle (kural tanımlama + ihlal logu tablosu)
5. CompanyDashboard İstatistikler sekmesine NPS hesaplama ve gösterimi ekle
6. StaffDashboard ve CompanyDashboard'a Bakım Talepleri sekmesi ekle
7. Visitor kayıt formlarına (NewVisitorForm, KioskMode) TC onChange pre-check ekle
8. Visitor çıkış modal/kartına Anket QR butonu ekle
9. App.tsx'e self-checkin URL rotasını ve screen geçişini ekle
