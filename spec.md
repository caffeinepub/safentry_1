# Safentry

## Current State
V83 canlıda. CompanyDashboard.tsx (17673 satır), StaffDashboard.tsx (11607 satır). Ön kayıt portalı, zamanlanmış raporlar ve kayıp eşya zaten mevcut.

## Requested Changes (Diff)

### Add
1. **Gizli/Anonim Ziyaret Modu** -- Ziyaretçi kaydında "Gizli Ziyaret" toggle; aktifse isim/firma lobi ekranında, ziyaretçi rehberinde, genel raporlarda maskeleniyor ("Gizli Ziyaretçi" görünür); yalnızca admin tam bilgiye erişebilir. CompanyDashboard'da "🕵️ Gizli Ziyaretler" sekmesi.
2. **Departman Bazlı Onay Akışı** -- CompanyDashboard'da "🏛️ Departman Onay Kuralları" sekmesi; her departmana onay tipi atanıyor (otomatik onay / tek onaylayıcı / çoklu onaylayıcı); ziyaretçi kaydında host departmanına göre ilgili kural tetikleniyor, kural adı kayıt üzerinde görünüyor.
3. **Geçici Erişim Kartı Zimmet Defteri** -- CompanyDashboard'da "🗝️ Kart Zimmet Defteri" sekmesi; kart numarası + açıklama + zimmetlenen ziyaretçi/personel kaydı; çıkış yapılmak istenince iade edilmemiş kart varsa uyarı; iade edilmeyen kartlar listesi ve raporu.

### Modify
- Visitor kaydına `isConfidential: boolean` alanı ekleniyor
- Ziyaretçi listesinde gizli kayıtlar maskeleniyor (admin hariç)
- Visitor exit akışında zimmetli kart kontrolü yapılıyor

### Remove
Hiçbir şey kaldırılmıyor.

## Implementation Plan
1. `types.ts`'e `isConfidential`, `departmentApprovalRule`, `cardIssuance` tipleri ekle
2. Visitor kayıt formuna gizli ziyaret toggle ekle
3. Visitor listesinde maskeleme mantığı: `isConfidential && !isAdmin` → "🕵️ Gizli Ziyaretçi"
4. CompanyDashboard'a 3 yeni sekme ekle: gizli ziyaretler (sadece admin), departman onay kuralları, kart zimmet defteri
5. Çıkış akışında zimmetli kart uyarısı
