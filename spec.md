# Safentry v62

## Current State
Safentry is a multi-tenant corporate visitor management system (VMS) with 60+ features including visitor registration, blacklist, appointments, kiosk, staff management, role-based access, GDPR/KVKK compliance, blob storage, backend sync, and many advanced panels. v61 added visitor group registration, shift swap, recurring meetings, host availability check, companion registration, and emergency broadcast.

## Requested Changes (Diff)

### Add
1. **Güvenlik personeli eğitim ve quiz modülü** -- Zorunlu eğitim içeriği (ders + quiz); skor ve tamamlanma kaydı; tamamlanmadan tam yetki verilmez
2. **Kiosk tema özelleştirme** -- Şirkete özel arka plan rengi, karşılama başlığı, buton rengi ve logo konumu ayarları (Profil sekmesinden)
3. **Ziyaretçi özel etiket sistemi** -- Admin özelleştirilebilir etiket oluşturur; ziyaretçi kaydına birden fazla etiket atanır; filtreleme ve raporlarda kullanılır
4. **Çift taraflı belge imzalama** -- NDA/protokol belgesi hem ziyaretçi hem host tarafından imzalanır; iki imza tamamlanmadan belge geçerli sayılmaz
5. **Lobi bekleme sırası ekranı (Display modu)** -- /lobby-display/:companyId URL'inde TV için optimize edilmiş tam ekran panel; bekliyenler, giriş yapanlar, yaklaşan randevular
6. **Geçmiş host önerisi** -- Randevu formunda aynı firmadan daha önce gelmiş ziyaretçi seçilince geçmişteki host önerisi gösterilir

### Modify
- CompanyDashboard: Etiket yönetimi sekmesi, kiosk tema ayarları Profil sekmesine eklenir
- StaffDashboard: Eğitim modülü sekmesi eklenir
- Visitor kayıt formu: Etiket seçimi ve çift imza akışı eklenir
- Randevu formu: Geçmiş host önerisi eklenir
- types.ts ve store.ts: Etiket, eğitim ve kiosk tema tipleri eklenir

### Remove
- Yok

## Implementation Plan
1. types.ts ve store.ts'e VisitorTag, StaffTraining, KioskTheme tipleri ekle
2. Şirket Paneli'ne "🏷️ Etiketler" sekmesi ekle (etiket CRUD)
3. Ziyaretçi kayıt formuna etiket seçimi ekle
4. Personel Paneli'ne "🎓 Eğitim" sekmesi ekle (ders listesi + quiz)
5. Profil sekmesine kiosk tema özelleştirme bölümü ekle
6. KioskMode bileşenine tema desteği ekle
7. Randevu formuna geçmiş host önerisi ekle
8. NDA/imza akışına çift taraflı imza adımı ekle
9. LobbyDisplayPage bileşeni oluştur (/lobby-display/:companyId)
10. App.tsx'e LobbyDisplayPage rotası ekle
