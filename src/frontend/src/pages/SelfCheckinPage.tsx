import { useState } from "react";
import {
  findCompanyById,
  getCustomCategories,
  isBlacklisted,
  saveVisitor,
} from "../store";
import type { Visitor } from "../types";

interface Props {
  companyId: string;
}

export default function SelfCheckinPage({ companyId }: Props) {
  const company = findCompanyById(companyId);
  const categories = company
    ? getCustomCategories(companyId)
    : ["Misafir", "Tedarikçi", "Müteahhit", "Teslimat"];

  const [form, setForm] = useState({
    name: "",
    idNumber: "",
    phone: "",
    hostName: "",
    visitReason: "",
    category: "Misafir",
  });
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [blacklistWarning, setBlacklistWarning] = useState(false);

  if (!company) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a1628" }}
      >
        <div className="text-white text-center">
          <p className="text-2xl font-bold mb-2">❌ Şirket bulunamadı</p>
          <p className="text-slate-400">Bu link geçersiz veya süresi dolmuş.</p>
        </div>
      </div>
    );
  }

  const handleIdChange = (val: string) => {
    setForm((f) => ({ ...f, idNumber: val }));
    if (val.length >= 6) {
      setBlacklistWarning(isBlacklisted(companyId, val));
    } else {
      setBlacklistWarning(false);
    }
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.idNumber.trim()) {
      setError("Ad Soyad ve TC/Kimlik numarası zorunludur.");
      return;
    }
    const now = Date.now();
    const visitor: Visitor = {
      visitorId: `sc_${now}_${Math.random().toString(36).slice(2, 8)}`,
      companyId,
      name: form.name.trim(),
      idNumber: form.idNumber.trim(),
      phone: form.phone.trim(),
      hostStaffId: "",
      visitReason: form.visitReason.trim(),
      category: form.category,
      status: "preregistered",
      arrivalTime: now,
      createdAt: now,
      label: "normal",
      visitType: "business",
      ndaAccepted: false,
      department: "",
      floor: "",
      vehiclePlate: "",
      specialNeeds: "Yok",
      visitorPhoto: "",
      signatureData: "",
      multiDay: false,
      screeningAnswers: [],
      accessCardNumber: "",
      ishgAccepted: false,
      emergencyContactName: form.hostName.trim(),
      emergencyContactPhone: "",
      zonePermissions: [],
      badgeQr: `qr_sc_${now}`,
      notes: "",
      registeredBy: "kiosk_self",
    };
    saveVisitor(visitor);
    setSubmitted(form.name.trim());
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "#0a1628" }}
      >
        <div
          className="w-full max-w-md p-8 rounded-3xl text-center"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Kayıt Tamamlandı!
          </h2>
          <p className="text-slate-300 mb-6">
            <span className="text-[#00d4ff] font-semibold">{submitted}</span>,
            ön kaydınız alındı. Lütfen resepsiyona bildirin, görevlimiz sizi
            karşılayacak.
          </p>
          <div
            className="p-4 rounded-2xl"
            style={{
              background: "rgba(0,212,255,0.08)",
              border: "1px solid rgba(0,212,255,0.2)",
            }}
          >
            <p className="text-[#00d4ff] text-sm font-medium">
              🏢 {company.name}
            </p>
            <p className="text-slate-400 text-xs mt-1">Durumunuz: Bekleniyor</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitted(null);
              setForm({
                name: "",
                idNumber: "",
                phone: "",
                hostName: "",
                visitReason: "",
                category: "Misafir",
              });
            }}
            className="mt-6 px-6 py-3 rounded-xl text-sm font-medium text-white"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            Yeni Kayıt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: "#0a1628" }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg,#00d4ff,#0284c7)" }}
          >
            <span className="text-3xl">🏢</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{company.name}</h1>
          <p className="text-slate-400 text-sm mt-1">Self Check-in</p>
        </div>

        <div
          className="rounded-3xl p-6 space-y-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h2 className="text-white font-semibold text-lg">
            📋 Ziyaretçi Formu
          </h2>

          {error && (
            <div
              className="p-3 rounded-xl text-sm text-red-400"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <p className="block text-slate-300 text-sm mb-2">Ad Soyad *</p>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Adınız ve soyadınız"
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>

          <div>
            <p className="block text-slate-300 text-sm mb-2">
              TC / Kimlik No *
            </p>
            <input
              value={form.idNumber}
              onChange={(e) => handleIdChange(e.target.value)}
              placeholder="TC veya pasaport numarası"
              maxLength={11}
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none font-mono"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: `1px solid ${blacklistWarning ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.15)"}`,
              }}
            />
            {blacklistWarning && (
              <div
                className="mt-2 px-3 py-2 rounded-lg text-sm text-amber-400"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                ⚠️ Bu kişi kara listede bulunmaktadır!
              </div>
            )}
          </div>

          <div>
            <p className="block text-slate-300 text-sm mb-2">Telefon</p>
            <input
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="+90 5xx xxx xx xx"
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>

          <div>
            <p className="block text-slate-300 text-sm mb-2">
              Kimi Ziyaret Ediyorsunuz?
            </p>
            <input
              value={form.hostName}
              onChange={(e) =>
                setForm((f) => ({ ...f, hostName: e.target.value }))
              }
              placeholder="Personel adı"
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>

          <div>
            <p className="block text-slate-300 text-sm mb-2">Ziyaret Amacı</p>
            <input
              value={form.visitReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, visitReason: e.target.value }))
              }
              placeholder="Kısaca açıklayın"
              className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>

          <div>
            <p className="block text-slate-300 text-sm mb-2">
              Ziyaret Kategorisi
            </p>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl text-white focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              {categories.map((c) => (
                <option key={c} value={c} style={{ background: "#0f1729" }}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 rounded-xl text-white font-semibold text-base transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#00d4ff,#0284c7)" }}
          >
            ✅ Kaydı Tamamla
          </button>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Güvenli ziyaretçi kaydı — Safentry
        </p>
      </div>
    </div>
  );
}
