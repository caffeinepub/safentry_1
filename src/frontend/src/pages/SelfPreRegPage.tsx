import { useState } from "react";
import { findCompanyByLoginCode, saveSelfPreRegEntry } from "../store";
import type { SelfPreRegEntry } from "../types";

function getSelfPreRegCompanyCode(): string {
  const match = window.location.pathname.match(
    /^\/self-prereg\/([A-Za-z0-9]+)$/,
  );
  return match ? match[1] : "";
}

function generateRef(): string {
  return `SPR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export default function SelfPreRegPage() {
  const companyCode = getSelfPreRegCompanyCode();
  const company = findCompanyByLoginCode(companyCode);

  const [form, setForm] = useState({
    name: "",
    tc: "",
    phone: "",
    purpose: "",
    hostName: "",
    date: "",
    time: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [refNo, setRefNo] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  if (!company) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#0a0f1e" }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-white text-xl font-bold mb-2">
            Şirket Bulunamadı
          </h1>
          <p className="text-slate-400 text-sm">
            Bu bağlantı geçersiz veya süresi dolmuş olabilir.
          </p>
        </div>
      </div>
    );
  }

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Ad Soyad zorunludur";
    if (!form.tc.trim()) e.tc = "TC No zorunludur";
    if (!form.phone.trim()) e.phone = "Telefon zorunludur";
    if (!form.purpose.trim()) e.purpose = "Ziyaret amacı zorunludur";
    if (!form.hostName.trim()) e.hostName = "Host personel adı zorunludur";
    if (!form.date) e.date = "Tarih zorunludur";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const ref = generateRef();
    const entry: SelfPreRegEntry = {
      id: ref,
      companyCode,
      companyId: company.companyId,
      name: form.name.trim(),
      tc: form.tc.trim(),
      phone: form.phone.trim(),
      purpose: form.purpose.trim(),
      hostName: form.hostName.trim(),
      date: form.date,
      time: form.time,
      status: "pending",
      submittedAt: Date.now(),
    };
    saveSelfPreRegEntry(entry);
    setRefNo(ref);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "#0a0f1e" }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{
            background: "#0f1729",
            border: "1.5px solid rgba(34,197,94,0.4)",
          }}
        >
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-white text-xl font-bold mb-2">
            Başvurunuz Alındı!
          </h1>
          <p className="text-slate-400 text-sm mb-6">
            {company.name} şirketine ziyaret ön kaydınız başarıyla iletildi.
            Lütfen ziyaret gününde bu referans numarasını güvenlik görevlisine
            gösteriniz.
          </p>
          <div
            className="py-4 px-6 rounded-xl mb-6"
            style={{
              background: "rgba(14,165,233,0.1)",
              border: "1px solid rgba(14,165,233,0.3)",
            }}
          >
            <p className="text-slate-400 text-xs mb-1">Referans Numaranız</p>
            <p className="text-teal-300 text-2xl font-mono font-bold tracking-widest">
              {refNo}
            </p>
          </div>
          <div className="text-left space-y-1 text-sm text-slate-300 bg-white/5 rounded-xl p-4">
            <p>
              <span className="text-slate-500">Ad Soyad:</span> {form.name}
            </p>
            <p>
              <span className="text-slate-500">Ziyaret Tarihi:</span>{" "}
              {form.date}
              {form.time ? ` ${form.time}` : ""}
            </p>
            <p>
              <span className="text-slate-500">Host Personel:</span>{" "}
              {form.hostName}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = "text",
    placeholder = "",
  ) => (
    <div>
      <label htmlFor={id} className="block text-slate-300 text-sm mb-1">
        {label} *
      </label>
      <input
        id={id}
        data-ocid={`self_prereg.${id}.input`}
        type={type}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setErrors((prev) => {
            const n = { ...prev };
            delete n[id];
            return n;
          });
        }}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: errors[id]
            ? "1.5px solid #ef4444"
            : "1.5px solid rgba(255,255,255,0.1)",
        }}
      />
      {errors[id] && (
        <p
          data-ocid={`self_prereg.${id}.error_state`}
          className="text-red-400 text-xs mt-1"
        >
          {errors[id]}
        </p>
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#0a0f1e" }}
    >
      <div className="w-full max-w-lg">
        {/* Company Header */}
        <div className="text-center mb-8">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="h-14 mx-auto mb-3 rounded-lg"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mx-auto mb-3"
              style={{
                background: "rgba(14,165,233,0.15)",
                border: "1px solid rgba(14,165,233,0.3)",
              }}
            >
              🏢
            </div>
          )}
          <h1 className="text-white text-xl font-bold">{company.name}</h1>
          <p className="text-slate-400 text-sm mt-1">
            Ziyaretçi Ön Kayıt Formu
          </p>
        </div>

        {/* Form */}
        <form
          data-ocid="self_prereg.form"
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "#0f1729",
            border: "1.5px solid rgba(14,165,233,0.2)",
          }}
        >
          {field(
            "name",
            "Ad Soyad",
            form.name,
            (v) => setForm((f) => ({ ...f, name: v })),
            "text",
            "Tam adınızı girin",
          )}
          {field(
            "tc",
            "TC Kimlik No",
            form.tc,
            (v) => setForm((f) => ({ ...f, tc: v })),
            "text",
            "11 haneli TC kimlik numaranız",
          )}
          {field(
            "phone",
            "Telefon",
            form.phone,
            (v) => setForm((f) => ({ ...f, phone: v })),
            "tel",
            "0500 000 00 00",
          )}
          {field(
            "purpose",
            "Ziyaret Amacı",
            form.purpose,
            (v) => setForm((f) => ({ ...f, purpose: v })),
            "text",
            "Görüşme amacınızı belirtin",
          )}
          {field(
            "hostName",
            "Host Personel Adı",
            form.hostName,
            (v) => setForm((f) => ({ ...f, hostName: v })),
            "text",
            "Ziyaret edeceğiniz kişinin adı",
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="date"
                className="block text-slate-300 text-sm mb-1"
              >
                Ziyaret Tarihi *
              </label>
              <input
                id="date"
                data-ocid="self_prereg.date.input"
                type="date"
                value={form.date}
                onChange={(e) => {
                  setForm((f) => ({ ...f, date: e.target.value }));
                  setErrors((p) => {
                    const n = { ...p };
                    n.date = undefined;
                    return n;
                  });
                }}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: errors.date
                    ? "1.5px solid #ef4444"
                    : "1.5px solid rgba(255,255,255,0.1)",
                  colorScheme: "dark",
                }}
              />
              {errors.date && (
                <p
                  data-ocid="self_prereg.date.error_state"
                  className="text-red-400 text-xs mt-1"
                >
                  {errors.date}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="time"
                className="block text-slate-300 text-sm mb-1"
              >
                Saat (isteğe bağlı)
              </label>
              <input
                id="time"
                data-ocid="self_prereg.time.input"
                type="time"
                value={form.time}
                onChange={(e) =>
                  setForm((f) => ({ ...f, time: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1.5px solid rgba(255,255,255,0.1)",
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {company.visitorPolicyEnabled && company.visitorPolicy && (
            <div
              className="p-3 rounded-xl text-xs text-slate-300"
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <p className="text-amber-400 font-medium mb-1">
                📋 Ziyaretçi Politikası
              </p>
              <p className="text-slate-400">{company.visitorPolicy}</p>
            </div>
          )}

          <button
            type="submit"
            data-ocid="self_prereg.submit_button"
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{
              background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
              border: "1px solid rgba(14,165,233,0.5)",
            }}
          >
            Başvuruyu Gönder
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          Bu form {company.name} ziyaretçi yönetim sistemi tarafından
          oluşturulmuştur.
        </p>
      </div>
    </div>
  );
}
