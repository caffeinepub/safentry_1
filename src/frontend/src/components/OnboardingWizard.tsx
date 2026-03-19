import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import React, { useState } from "react";

const STEPS = [
  {
    title: "🏢 Departmanlarınızı Tanımlayın",
    description:
      "Sol menüden 'Departmanlar' sekmesine giderek şirketinizdeki bölümleri ekleyin. Örneğin: Yazılım, İnsan Kaynakları, Muhasebe. Bu bilgi ziyaretçi yönlendirmede kullanılır.",
    tip: "💡 İpucu: Departman ekleyerek ziyaretçilerinizin doğru kişiye yönlendirilmesini sağlayın.",
  },
  {
    title: "👤 Personel Ekleyin",
    description:
      "'Personel Listesi' sekmesinden yeni güvenlik ve yönetici personeli oluşturun. Her personele otomatik 8 haneli giriş kodu atanır. Kodu personele bildirin.",
    tip: "💡 İpucu: Personel kodlarını güvenli bir şekilde iletmek için uygulamanın kopyalama butonunu kullanın.",
  },
  {
    title: "🕐 Çalışma Saatlerinizi Ayarlayın",
    description:
      "'Çalışma Takvimi' sekmesinden her gün için açılış/kapanış saatlerini belirleyin. Tanımladığınız saatler dışında ziyaretçi girişi kabul edilmeyeceği konusunda uyarı verilir.",
    tip: "💡 İpucu: Resmi tatilleri de ekleyerek takvimi tam hale getirin.",
  },
  {
    title: "🏷️ Ziyaretçi Kategorilerini Yapılandırın",
    description:
      "'Profil' sekmesinden özel ziyaretçi kategorileri oluşturun (ör. VIP, Müteahhit, Teslimat, Denetçi). Her kategoriye renk atayabilir ve zaman kısıtlaması tanımlayabilirsiniz.",
    tip: "💡 İpucu: Kategori bazlı renk kodlaması ile ziyaretçileri tek bakışta ayırt edin.",
  },
  {
    title: "🎉 Kurulum Tamamlandı!",
    description:
      "Harika! Safentry artık kullanıma hazır. Ziyaretçileriniz kiosk ekranından veya personel üzerinden kayıt olabilir. İstatistiklerinizi takip edin, kara listeyi yönetin ve KVKK uyumunu sağlayın.",
    tip: "💡 Herhangi bir konuda yardım için '?' butonuna tıklayarak Yardım Merkezi'ni açabilirsiniz.",
  },
];

interface OnboardingWizardProps {
  companyId: string;
  onClose: () => void;
}

export default function OnboardingWizard({
  companyId,
  onClose,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  const handleComplete = () => {
    localStorage.setItem(`safentry_onboarding_${companyId}`, "done");
    onClose();
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleComplete();
  };

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div
      data-ocid="onboarding.modal"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl p-8"
        style={{
          background: "linear-gradient(135deg,#0f172a,#0f1e36)",
          border: "1px solid rgba(14,165,233,0.3)",
          boxShadow: "0 0 40px rgba(14,165,233,0.15)",
        }}
      >
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs text-slate-400">
            Adım {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            data-ocid="onboarding.close_button"
            onClick={handleComplete}
            className="text-slate-500 hover:text-white text-sm transition-colors"
          >
            Atla
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <Progress value={progress} className="h-1.5" />
        </div>

        {/* Step dots */}
        <div className="flex gap-2 mb-8 justify-center">
          {STEPS.map((s, idx) => (
            <div
              key={s.title}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: idx <= step ? "#0ea5e9" : "rgba(255,255,255,0.15)",
                transform: idx === step ? "scale(1.4)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-white mb-3">{current.title}</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            {current.description}
          </p>
          <div
            className="text-xs text-teal-300 px-4 py-3 rounded-xl"
            style={{
              background: "rgba(20,184,166,0.1)",
              border: "1px solid rgba(20,184,166,0.2)",
            }}
          >
            {current.tip}
          </div>
        </div>

        {/* Action button */}
        <button
          type="button"
          data-ocid="onboarding.next_button"
          onClick={handleNext}
          className="w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
            border: "1px solid #38bdf8",
          }}
        >
          {step < STEPS.length - 1 ? "Devam →" : "🚀 Başlayalım!"}
        </button>
      </div>
    </div>
  );
}

export function shouldShowOnboarding(companyId: string): boolean {
  return !localStorage.getItem(`safentry_onboarding_${companyId}`);
}
