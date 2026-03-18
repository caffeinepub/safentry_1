import { useState } from "react";
import { findCompanyByLoginCode } from "../store";
import { saveVisitorFeedback } from "../store";
import type { AppScreen, VisitorFeedback } from "../types";
import { generateId } from "../utils";

interface Props {
  companyCode: string;
  onNavigate: (s: AppScreen) => void;
}

export default function VisitorFeedbackPage({
  companyCode,
  onNavigate,
}: Props) {
  const company = findCompanyByLoginCode(companyCode);
  const [category, setCategory] = useState<
    "complaint" | "suggestion" | "compliment"
  >("suggestion");
  const [message, setMessage] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!company) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#0f172a" }}
      >
        <div
          className="max-w-md w-full p-8 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-white font-bold text-xl mb-2">
            Şirket Bulunamadı
          </h1>
          <p className="text-slate-400 text-sm">
            Bu link geçersiz veya süresi dolmuş olabilir.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("welcome")}
            className="mt-6 px-6 py-2 rounded-xl text-white text-sm font-semibold"
            style={{
              background: "rgba(14,165,233,0.3)",
              border: "1px solid rgba(14,165,233,0.5)",
            }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  const CATEGORIES = [
    {
      key: "complaint" as const,
      label: "Şikayet",
      emoji: "⚠️",
      color: "#ef4444",
    },
    {
      key: "suggestion" as const,
      label: "Öneri",
      emoji: "💡",
      color: "#0ea5e9",
    },
    {
      key: "compliment" as const,
      label: "Memnuniyet",
      emoji: "⭐",
      color: "#22c55e",
    },
  ];

  const handleSubmit = () => {
    if (!message.trim()) {
      setError("Lütfen bir mesaj yazın.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Mesajınız en az 10 karakter olmalıdır.");
      return;
    }
    const feedback: VisitorFeedback = {
      id: generateId(),
      companyId: company.companyId,
      category,
      message: message.trim(),
      submittedAt: Date.now(),
      isAnonymous,
      visitorName: isAnonymous ? undefined : visitorName.trim() || undefined,
      status: "new",
    };
    saveVisitorFeedback(feedback);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#0f172a" }}
      >
        <div
          className="max-w-md w-full p-8 rounded-2xl text-center"
          style={{
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-white font-bold text-xl mb-2">Teşekkürler!</h1>
          <p className="text-slate-300 text-sm">
            Geri bildiriminiz başarıyla iletildi. Değerli görüşleriniz için
            teşekkür ederiz.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#0f172a" }}
    >
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{
              background: "rgba(14,165,233,0.15)",
              border: "1px solid rgba(14,165,233,0.3)",
            }}
          >
            💬
          </div>
          <h1 className="text-white font-bold text-2xl">{company.name}</h1>
          <p className="text-slate-400 text-sm mt-1">Geri Bildirim Formu</p>
        </div>

        {/* Form */}
        <div
          className="p-6 rounded-2xl space-y-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Category */}
          <div>
            <p className="text-slate-300 text-sm font-medium block mb-2">
              Geri Bildirim Türü
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  data-ocid={`feedback.category_${cat.key}.button`}
                  onClick={() => setCategory(cat.key)}
                  className="p-3 rounded-xl text-center transition-all"
                  style={{
                    background:
                      category === cat.key
                        ? `${cat.color}22`
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${category === cat.key ? `${cat.color}66` : "rgba(255,255,255,0.08)"}`,
                    color: category === cat.key ? cat.color : "#94a3b8",
                  }}
                >
                  <div className="text-xl mb-1">{cat.emoji}</div>
                  <div className="text-xs font-medium">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-slate-300 text-sm font-medium block mb-2">
              Mesajınız <span className="text-red-400">*</span>
            </p>
            <textarea
              data-ocid="feedback.message.textarea"
              className="w-full px-4 py-3 rounded-xl text-sm text-white resize-none outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                minHeight: "120px",
              }}
              placeholder="Görüşlerinizi buraya yazın..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError("");
              }}
            />
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">
                Anonim Gönder
              </p>
              <p className="text-slate-500 text-xs">Kimliğiniz gizli tutulur</p>
            </div>
            <button
              type="button"
              data-ocid="feedback.anonymous.toggle"
              onClick={() => setIsAnonymous((v) => !v)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{
                background: isAnonymous
                  ? "rgba(14,165,233,0.6)"
                  : "rgba(255,255,255,0.15)",
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{
                  transform: isAnonymous ? "translateX(24px)" : "translateX(0)",
                }}
              />
            </button>
          </div>

          {/* Name field if not anonymous */}
          {!isAnonymous && (
            <div>
              <p className="text-slate-300 text-sm font-medium block mb-2">
                Adınız (isteğe bağlı)
              </p>
              <input
                type="text"
                data-ocid="feedback.name.input"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                placeholder="Adınızı girin"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            data-ocid="feedback.submit.button"
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm"
            style={{
              background: "rgba(14,165,233,0.35)",
              border: "1px solid rgba(14,165,233,0.5)",
            }}
          >
            Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
