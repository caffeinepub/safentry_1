import React, { useState } from "react";

interface Scenario {
  id: string;
  category: string;
  title: string;
  description: string;
  steps: string[];
  tips: string[];
  severity: "low" | "medium" | "high";
}

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: "1",
    category: "VIP Karşılama",
    severity: "low",
    title: "VIP Ziyaretçi Karşılama Protokolü",
    description:
      "Üst düzey yönetici, devlet yetkilisi veya önemli iş ortağı gelişlerinde uygulanacak prosedür.",
    steps: [
      "Ziyaretçi bilgilerini önceden sistemde doğrula ve randevuyu onayla",
      "VIP giriş noktasına (Ana Kapı) yönlendir, normal giriş kuyruğunu atla",
      "İsmiyle karşıla: 'Hoş geldiniz [İsim Bey/Hanım], sizi bekliyorduk'",
      "Özel VIP rozeti hazırla ve ziyaret amacını tekrar teyit et",
      "Refakatçi personeli (escort) bilgilendir ve aktarımı gerçekleştir",
      "Ziyaretçi rehberini ve WiFi bilgisini sun",
      "Sistemde VIP kategorisi ve özel notları kaydet",
    ],
    tips: [
      "Özel talepleri önceden öğren",
      "Fotoğraf çekimi konusunda hassas ol",
      "Araç park yeri önceden ayarla",
    ],
  },
  {
    id: "2",
    category: "Güvenlik İhlali",
    severity: "high",
    title: "Agresif veya Kuralları Rededen Ziyaretçi",
    description:
      "Sisteme kayıt olmayı, kimlik göstermeyi veya kurallara uymayı reddeden ziyaretçi durumu.",
    steps: [
      "Sakin ve nazik bir tonla kuralları açıkla: 'Güvenliğiniz için bu prosedürü uygulamak zorundayız'",
      "Ziyaretçiye ayrılma seçeneği sun, zorlamayı dene",
      "Durumu güvenlik amiriyle hemen paylaş (dashboard üzerinden bildir)",
      "Tartışmayı ana giriş alanından uzağa taşı, diğer ziyaretçilerin önünde sorun yaratma",
      "Gerekirse güvenlik amiri/yönetimi ile ziyaretçiyi buluştur",
      "Çözümsüz kalırsa kibarca binadan ayrılmasını iste ve olay logu oluştur",
      "Her adımı sistem üzerinde belge et",
    ],
    tips: [
      "Asla karşı taraf gibi yüksek sesle konuşma",
      "Tek başına karar verme, süpervizörü dahil et",
      "Kamera kapsamında kal",
    ],
  },
  {
    id: "3",
    category: "Acil Tahliye",
    severity: "high",
    title: "Yangın Alarmı / Acil Tahliye Prosedürü",
    description:
      "Yangın alarmı çaldığında veya tahliye kararı alındığında güvenlik personelinin izleyeceği adımlar.",
    steps: [
      "Sistemde 'Acil Mod'u aktif et -- anlık headcount listesini al",
      "Kiosk ve lobi ekranlarında 'TAHLİYE' duyurusunu yayınla",
      "Aktif ziyaretçi listesindeki kişileri kendi sorumlu katına göre bildir",
      "Asansör kullanımını engelle, acil çıkış yönlendirmelerini sesli olarak yap",
      "Refakatli ziyaretçilerin (VIP, engelli) güvenli tahliyesini önce tamamla",
      "Muster noktasında katman katman sayım yap, sisteme işle",
      "Eksik kişi varsa itfaiye ve kurtarma ekibine bildir",
      "Tahliye tamamlanınca sistem üzerinden 'Güvenli' işaretle",
    ],
    tips: [
      "Panik yaratma, sakin sesle yönlendir",
      "Kapıları kontrol et ama kilitleme",
      "Yetkisiz kişilerin binaya girişini engelle",
    ],
  },
  {
    id: "4",
    category: "Kara Liste",
    severity: "medium",
    title: "Kara Listeli Ziyaretçi Girişim Tespiti",
    description:
      "Sisteme kayıtlı yasaklı kişinin giriş girişiminde güvenlik görevlisinin yapması gerekenler.",
    steps: [
      "Ziyaretçiyi sakin bir şekilde bekletmeye al: 'Kaydınızı doğruluyorum, bir dakika'",
      "Sistemi kontrol et ve kara liste kaydını güvenlik amiriyle paylaş",
      "Ziyaretçiye nedenini açıklamak zorunda değilsin: 'Maalesef bugün giriş yapmanızı onaylayamıyoruz'",
      "Eğer itiraz ederse 'Şirketimiz kararıdır, amiriminizi veya hukuk departmanını arayabilirsiniz' de",
      "Israrcı olursa kapıya refakat et ve güvenli şekilde dışarıya uğurla",
      "Tüm olayı sistem üzerinde detaylı logla",
    ],
    tips: [
      "Hiçbir zaman 'kara listede' ifadesini yüksek sesle kullanma",
      "Tanıkla hareket et",
      "Çekimde kal",
    ],
  },
  {
    id: "5",
    category: "Kayıp Eşya",
    severity: "low",
    title: "Kayıp & Bulunan Eşya Prosedürü",
    description:
      "Binada bulunan veya kayıp bildirilen eşya için standart işlem akışı.",
    steps: [
      "Bulunan eşyayı teslim alan personel adını ve saatini sisteme kaydet",
      "Eşyayı 'Kayıp & Bulunan' dolabına veya resepsiyon kasasına koy",
      "Eşyanın sahibi kamera görüntüsü veya beyan ile tespit edilirse bilgilendir",
      "Teslimatta alıcıdan kimlik ve imza al, sisteme işle",
      "30 gün sahipsiz kalan eşyalar için şirket prosedürünü uygula (yetkili kişiye devret)",
    ],
    tips: [
      "Değerli eşyaları (telefon, cüzdan) mutlaka amire bildir",
      "İçeriği açma",
      "Her adımı fotoğrafla belge",
    ],
  },
  {
    id: "6",
    category: "Sağlık Acil",
    severity: "high",
    title: "Ziyaretçi Sağlık Acil Durumu",
    description:
      "Binada bir ziyaretçinin bayılması, kalp krizi veya başka sağlık acilinde prosedür.",
    steps: [
      "Hemen 112'yi ara ve konumu net olarak bildir",
      "İlk yardım sertifikalı personeli çağır (Personel Sertifikaları sekmesinden kontrol et)",
      "Asansörü ambulans ekibine açık tut ve giriş kapısına yönlendirici koy",
      "Ziyaretçinin acil iletişim kişisini sistemden bul ve ara",
      "Çevreyi açık tut, kalabalık oluşturmaktan kaçın",
      "Olay kaydı oluştur: saat, yer, durum, alınan aksiyonlar",
      "Ambulans gelene kadar yanından ayrılma",
    ],
    tips: [
      "CPR için 30:2 ritmi",
      "AED cihazı konumunu bil",
      "Her şeyi sisteme kaydet",
    ],
  },
  {
    id: "7",
    category: "Yetkisiz Giriş",
    severity: "high",
    title: "Yetkisiz Bölgeye Giriş Tespit Edilmesi",
    description:
      "İzni olmayan bir ziyaretçinin kısıtlı alana girdiğinin tespitinde uygulanacak prosedür.",
    steps: [
      "Ziyaretçiye yaklaş ve kayıt/rozet kontrolü yap",
      "Erişim iznini sisteme göre doğrula (Erişim Geçmişi sekmesi)",
      "Yetkisi yoksa kibarca ama net şekilde: 'Bu alan yalnızca yetkili personele açık, sizi çıkışa eşlik edeceğim'",
      "Ziyaretçiyi refakat ederek çıkar, yalnız bırakma",
      "Olay kaydını oluştur ve güvenlik amirini bilgilendir",
      "Gerekirse ziyaret erken sonlandırılır ve sistem güncellenr",
    ],
    tips: [
      "Fiziksel temas kurmaktan kaçın",
      "Her zaman tanıkla hareket et",
      "Kamera görüntüsünü koruma altına al",
    ],
  },
  {
    id: "8",
    category: "Sistem Arızası",
    severity: "medium",
    title: "Kiosk / Sistem Arızası Durumunda Manuel Prosedür",
    description:
      "Sistemin çökmesi veya kioskin devre dışı kalması halinde ziyaretçi kabulü nasıl yapılır.",
    steps: [
      "Kiosk Bakım modunu aktif et (Şirket Paneli > Kiosk Bakım)",
      "Resepsiyon masasına yönlendirme tabelası koy",
      "Manuel kağıt kayıt defterini çıkar ve ziyaretçi bilgilerini al: ad, TC, telefon, ziyaret nedeni, saat",
      "Rozet yazıcısı manuel olarak kullanılamıyorsa geçici el yazısı rozet kullan",
      "Sistem geri geldiğinde tüm manuel kayıtları sisteme aktar",
      "Teknik ekibe bildiri gönder ve tahmini çözüm süresi sor",
    ],
    tips: [
      "Manuel defterin her zaman hazırda olması gerekir",
      "Kritik ziyaretçileri güvenlik amiri karşılamalı",
    ],
  },
];

const SEV_COLORS: Record<
  string,
  { bg: string; border: string; badge: string; label: string }
> = {
  high: {
    bg: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.25)",
    badge: "rgba(239,68,68,0.2)",
    label: "🔴 Yüksek",
  },
  medium: {
    bg: "rgba(251,191,36,0.06)",
    border: "rgba(251,191,36,0.25)",
    badge: "rgba(251,191,36,0.2)",
    label: "🟡 Orta",
  },
  low: {
    bg: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.2)",
    badge: "rgba(34,197,94,0.15)",
    label: "🟢 Düşük",
  },
};

const CATEGORIES = [
  "Tümü",
  "VIP Karşılama",
  "Güvenlik İhlali",
  "Acil Tahliye",
  "Kara Liste",
  "Kayıp Eşya",
  "Sağlık Acil",
  "Yetkisiz Giriş",
  "Sistem Arızası",
];

export default function SecurityScenariosTab() {
  const [cat, setCat] = useState("Tümü");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = DEFAULT_SCENARIOS.filter(
    (s) =>
      (cat === "Tümü" || s.category === cat) &&
      (!search ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div>
      <div className="mb-5">
        <h2 className="text-white font-bold text-xl mb-1">
          📖 Güvenlik Senaryo Kütüphanesi
        </h2>
        <p className="text-slate-400 text-sm">
          Sahada anlık başvuru için standart güvenlik senaryoları ve adım adım
          talimatlar.
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          className="flex-1 px-4 py-2 rounded-xl text-white text-sm"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
          placeholder="Senaryo ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setCat(c)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={
                cat === c
                  ? {
                      background: "rgba(14,165,233,0.2)",
                      border: "1px solid rgba(14,165,233,0.4)",
                      color: "#38bdf8",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#64748b",
                    }
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((s) => {
          const sev = SEV_COLORS[s.severity];
          const isOpen = expanded === s.id;
          return (
            <div
              key={s.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
            >
              <button
                type="button"
                className="w-full text-left px-5 py-4 flex items-center gap-3"
                onClick={() => setExpanded(isOpen ? null : s.id)}
              >
                <span
                  className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: sev.badge, color: "#e2e8f0" }}
                >
                  {sev.label}
                </span>
                <div className="flex-1">
                  <div className="text-white font-semibold text-sm">
                    {s.title}
                  </div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    {s.category}
                  </div>
                </div>
                <span className="text-slate-400 text-sm flex-shrink-0">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5">
                  <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                    {s.description}
                  </p>

                  <h4 className="text-white font-semibold text-sm mb-2">
                    📋 Adım Adım Prosedür
                  </h4>
                  <ol className="space-y-2 mb-4">
                    {s.steps.map((step, i) => (
                      <li
                        key={step.slice(0, 20)}
                        className="flex gap-3 text-sm"
                      >
                        <span
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{
                            background: "rgba(14,165,233,0.2)",
                            color: "#38bdf8",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-slate-300 pt-0.5 leading-relaxed">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>

                  {s.tips.length > 0 && (
                    <>
                      <h4 className="text-amber-400 font-semibold text-sm mb-2">
                        💡 Önemli İpuçları
                      </h4>
                      <ul className="space-y-1">
                        {s.tips.map((tip) => (
                          <li
                            key={tip.slice(0, 20)}
                            className="text-slate-400 text-sm flex gap-2"
                          >
                            <span className="text-amber-400 flex-shrink-0">
                              →
                            </span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-slate-400">
            Aranan kriterlere uygun senaryo bulunamadı.
          </p>
        </div>
      )}
    </div>
  );
}
