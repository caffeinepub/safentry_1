import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useState, useMemo } from "react";

const FAQ_SECTIONS = [
  {
    title: "🏢 Şirket Paneli",
    items: [
      {
        q: "Şirket kodum nerede?",
        a: "Şirket Paneli > Profil sekmesinde şirket kodunuzu görebilir ve kopyalayabilirsiniz. Bu 12 haneli kod, personelin giriş yapabilmesi için gereklidir.",
      },
      {
        q: "Nasıl yeni personel eklerim?",
        a: "Şirket Paneli > Personel Listesi sekmesine gidin, 'Personel Ekle' butonuna tıklayın. Ad-soyad ve rol girin; sistem otomatik 8 haneli giriş kodu oluşturur.",
      },
      {
        q: "Ziyaretçi kaydı nasıl yapılır?",
        a: "Personel panelinden 'Yeni Ziyaretçi Kaydı' butonu ile veya kiosk ekranından ziyaretçi bilgilerini girerek kayıt yapılabilir. TC kimlik numarası otomatik doğrulanır.",
      },
      {
        q: "Kara listeye nasıl kişi eklerim?",
        a: "Şirket Paneli > Kara Liste sekmesine gidin. TC numarası, isim ve sebep girerek kişiyi ekleyin. Kara listede olan kişiler giriş yapmaya çalıştığında sistem otomatik uyarı verir.",
      },
      {
        q: "Raporları nasıl indirebilirim?",
        a: "İstatistikler sekmesinde 'PDF İndir' butonu ile yazdırabilirsiniz. Özel Rapor sekmesinden istediğiniz alanları seçip CSV veya JSON olarak dışa aktarabilirsiniz.",
      },
      {
        q: "Acil durum modunu nasıl kullanırım?",
        a: "Üst başlıktaki '🚨 Acil Durum' butonuna tıklayın. Aktif olduğunda tüm girişler durdurulur ve tahliye listesi oluşturulabilir. Kilidi kaldırmak için tekrar tıklayın.",
      },
      {
        q: "Çoklu şube nasıl yönetilir?",
        a: "Şubeler sekmesinden yeni şube ekleyebilirsiniz. Her şubeye ad ve adres bilgisi girilir. Lobi ekranında aktif şube bilgisi görüntülenir.",
      },
    ],
  },
  {
    title: "👮 Personel Paneli",
    items: [
      {
        q: "Personel paneline nasıl giriş yapılır?",
        a: "Giriş ekranında şirket kodunuzu (12 hane) ve 8 haneli personel kodunuzu girin. Kod yanlışsa 5 denemeden sonra kısa süreli kilitlenme olur.",
      },
      {
        q: "Ziyaretçi nasıl kaydedilir?",
        a: "Personel Paneli ana ekranında 'Yeni Ziyaretçi Kaydı' alanını doldurun. TC, isim, kategori ve ziyaret amacını girin. Kara liste kontrolü otomatik yapılır.",
      },
      {
        q: "Kiosk onay akışı nasıl çalışır?",
        a: "Ziyaretçi kiosk ekranından form doldurduğunda personel panelinde uyarı çıkar. 'Onay Bekleyenler' bölümünden kabul veya reddet işlemi yapın.",
      },
      {
        q: "Ziyaretçi QR kodu nasıl taranır?",
        a: "Üst başlıktaki '🔍 QR Tara' butonuna tıklayın. Kameraya ziyaretçi rozetindeki QR kodu tutun; sistem otomatik doğrular.",
      },
      {
        q: "Vardiya notu nasıl bırakılır?",
        a: "Üst başlıktaki '📓' butonuna tıklayarak bir sonraki vardiyaya not bırakabilirsiniz. Bir sonraki giriş yapan personel bu notu görür.",
      },
      {
        q: "Hızlı giriş PIN'i nasıl kullanılır?",
        a: "Yönetici tarafından PIN atanan onaylı ziyaretçiler kiosk ekranında PIN ile hızlı giriş yapabilir. PIN Şirket Paneli > Onaylı Ziyaretçiler'den atanır.",
      },
    ],
  },
  {
    title: "📋 Genel",
    items: [
      {
        q: "KVKK / GDPR uyumu nasıl sağlanır?",
        a: "Şirket Paneli > KVKK Talepleri sekmesinden bireysel başvuruları yönetin. Ziyaretçi verileri 90 gün sonra otomatik silinir. Uyum Raporu sekmesinden durum belgesi oluşturabilirsiniz.",
      },
      {
        q: "Veriler ne kadar süre saklanır?",
        a: "Ziyaretçi kayıtları 90 gün tutulur. Arşiv sekmesinden eski kayıtları manuel olarak da silebilirsiniz. GDPR gereği silme talebi geldiğinde 30 gün içinde yanıt verilmelidir.",
      },
      {
        q: "Rozet nasıl yazdırılır?",
        a: "Aktif ziyaretçi kartında 'Rozet Yazdır' seçeneğine tıklayın. Rozet PDF formatında hazırlanır; şirket logosu, isim, giriş saati ve QR kod içerir.",
      },
      {
        q: "Çoklu lokasyon desteği var mı?",
        a: "Evet. Şubeler sekmesinden birden fazla lokasyon tanımlayabilirsiniz. Her şubenin adresi ve sorumlu bilgileri ayrı tutulabilir.",
      },
      {
        q: "Erişilebilirlik modu nedir?",
        a: "Başlıktaki '🌓' butonu ile yüksek kontrast modunu açabilirsiniz. Bu mod görme güçlüğü olan kullanıcılar için tasarlanmıştır ve WCAG AA standartlarını karşılar.",
      },
      {
        q: "Veri yedekleme / dışa aktarma nasıl yapılır?",
        a: "Profil sekmesinden veya Özel Rapor sekmesinden tüm verileri JSON veya CSV formatında dışa aktarabilirsiniz. Ayrıca ⚙️ Sistem sekmesinden sağlık raporu indirilebilir.",
      },
      {
        q: "Dil nasıl değiştirilir?",
        a: "Sağ üst köşedeki dil seçiciden 10 dil arasında seçim yapabilirsiniz: TR, EN, DE, FR, ES, AR, RU, ZH, PT, JP.",
      },
    ],
  },
];

interface HelpCenterProps {
  onClose: () => void;
}

export default function HelpCenter({ onClose }: HelpCenterProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((sec) => ({
      ...sec,
      items: sec.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      ),
    })).filter((sec) => sec.items.length > 0);
  }, [search]);

  return (
    <div
      data-ocid="help_center.panel"
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={-1}
    >
      <div
        className="w-full max-w-md h-full flex flex-col"
        style={{
          background: "linear-gradient(180deg,#0f172a,#0a1628)",
          borderLeft: "1px solid rgba(14,165,233,0.2)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div>
            <div className="text-white font-bold text-base">
              ❓ Yardım Merkezi
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Sık sorulan sorular
            </div>
          </div>
          <button
            type="button"
            data-ocid="help_center.close_button"
            onClick={onClose}
            className="text-slate-400 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 shrink-0">
          <Input
            data-ocid="help_center.search_input"
            placeholder="Soru ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl"
          />
        </div>

        {/* FAQ List */}
        <ScrollArea className="flex-1 px-6 pb-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <div className="text-3xl mb-2">🔍</div>
              <div className="text-sm">Sonuç bulunamadı</div>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((sec) => (
                <div key={sec.title}>
                  <div
                    className="text-xs font-bold uppercase tracking-wider mb-3"
                    style={{ color: "#0ea5e9" }}
                  >
                    {sec.title}
                  </div>
                  <div className="space-y-3">
                    {sec.items.map((item) => (
                      <FAQItem key={item.q} question={item.q} answer={item.a} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <button
        type="button"
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-white/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="text-slate-200 text-sm font-medium">{question}</span>
        <span className="text-slate-500 shrink-0 text-xs mt-0.5">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-slate-400 text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
