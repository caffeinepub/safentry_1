import { useState } from "react";
import { toast } from "sonner";
import {
  findCompanyByLoginCode,
  getBlacklistAppeals,
  saveBlacklistAppeal,
} from "../store";
import type { AppScreen } from "../types";
import { generateId } from "../utils";

interface Props {
  tcNumber?: string;
  onNavigate: (s: AppScreen) => void;
}

export default function BlacklistAppealPage({
  tcNumber: initialTc = "",
  onNavigate,
}: Props) {
  const [form, setForm] = useState({
    tcNumber: initialTc,
    companyCode: "",
    appealReason: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setError("");
    if (!form.tcNumber || !form.companyCode || !form.appealReason.trim()) {
      setError("Tüm alanlar zorunludur.");
      return;
    }
    if (form.tcNumber.length < 6) {
      setError("Geçerli bir TC/Pasaport numarası girin.");
      return;
    }
    if (form.appealReason.trim().length < 20) {
      setError("İtiraz gerekçesi en az 20 karakter olmalıdır.");
      return;
    }

    const company = findCompanyByLoginCode(form.companyCode);
    if (!company) {
      setError("Bu şirket kodu geçerli değil.");
      return;
    }

    // Check if already has a pending appeal
    const existing = getBlacklistAppeals(company.companyId).find(
      (a) => a.tcNumber === form.tcNumber && a.status === "pending",
    );
    if (existing) {
      setError(
        `Zaten bekleyen bir itirazınız var. Referans: ${existing.id.slice(-8).toUpperCase()}`,
      );
      return;
    }

    setLoading(true);
    const id = generateId();
    saveBlacklistAppeal({
      id,
      companyId: company.companyId,
      tcNumber: form.tcNumber,
      appealReason: form.appealReason.trim(),
      status: "pending",
      submittedAt: Date.now(),
    });
    setRefNumber(id.slice(-8).toUpperCase());
    setSubmitted(true);
    setLoading(false);
    toast.success("İtirazınız iletildi");
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
      >
        <div
          className="max-w-md w-full text-center p-10 rounded-3xl"
          style={{
            background: "rgba(34,197,94,0.07)",
            border: "1.5px solid rgba(34,197,94,0.3)",
          }}
        >
          <div className="text-5xl mb-5">✅</div>
          <h2 className="text-white font-bold text-xl mb-3">
            İtirazınız Alındı
          </h2>
          <p className="text-slate-300 text-sm mb-6">
            İtirazınız şirket yönetimine iletildi. Sonuç hakkında
            bilgilendirileceksiniz.
          </p>
          <div
            className="px-6 py-4 rounded-2xl mb-6"
            style={{
              background: "rgba(14,165,233,0.1)",
              border: "1px solid rgba(14,165,233,0.3)",
            }}
          >
            <p className="text-slate-400 text-xs mb-1">Referans Numaranız</p>
            <p className="text-[#0ea5e9] font-mono font-bold text-2xl">
              {refNumber}
            </p>
            <p className="text-slate-500 text-xs mt-2">Bu numarayı saklayın</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("welcome")}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: "#0a0f1e" }}
    >
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(14,165,233,0.1)",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <span className="text-3xl">⚖️</span>
          </div>
          <h1 className="text-white font-bold text-2xl mb-2">
            Kara Liste İtirazı
          </h1>
          <p className="text-slate-400 text-sm">
            Kara listeye alınmanın hatalı olduğunu düşünüyorsanız itiraz
            başvurusu yapabilirsiniz.
          </p>
        </div>

        {/* Form */}
        <div
          className="p-6 rounded-2xl space-y-5"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1.5px solid rgba(255,255,255,0.1)",
          }}
        >
          {error && (
            <div
              className="p-3 rounded-xl text-sm"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="appeal-tc"
              className="block text-slate-400 text-xs mb-1.5 font-medium"
            >
              TC Kimlik / Pasaport No *
            </label>
            <input
              id="appeal-tc"
              data-ocid="appeal.tc.input"
              value={form.tcNumber}
              maxLength={20}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  tcNumber: e.target.value.replace(/\s/g, ""),
                }))
              }
              placeholder="TC kimlik veya pasaport numaranız"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9] font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="appeal-company"
              className="block text-slate-400 text-xs mb-1.5 font-medium"
            >
              Şirket Giriş Kodu *
            </label>
            <input
              id="appeal-company"
              data-ocid="appeal.company_code.input"
              value={form.companyCode}
              maxLength={12}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  companyCode: e.target.value.trim().toUpperCase(),
                }))
              }
              placeholder="12 haneli şirket kodu"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9] font-mono"
            />
            <p className="text-slate-500 text-xs mt-1">
              Kara listeye eklendiğiniz şirketin giriş kodunu girin
            </p>
          </div>

          <div>
            <label
              htmlFor="appeal-reason"
              className="block text-slate-400 text-xs mb-1.5 font-medium"
            >
              İtiraz Gerekçesi * (en az 20 karakter)
            </label>
            <textarea
              id="appeal-reason"
              data-ocid="appeal.reason.textarea"
              value={form.appealReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, appealReason: e.target.value }))
              }
              placeholder="Neden kara listeye alındığınızı ve itiraz gerekçenizi açıklayın..."
              rows={5}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9] resize-none"
            />
            <p className="text-right text-slate-500 text-xs mt-1">
              {form.appealReason.length} karakter
            </p>
          </div>

          <button
            type="button"
            data-ocid="appeal.submit_button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            {loading ? "Gönderiliyor..." : "İtiraz Başvurusu Yap"}
          </button>

          <button
            type="button"
            onClick={() => onNavigate("welcome")}
            className="w-full py-2 rounded-xl text-slate-400 text-sm hover:text-white transition-colors"
          >
            ← Ana Sayfaya Dön
          </button>
        </div>
      </div>
    </div>
  );
}
