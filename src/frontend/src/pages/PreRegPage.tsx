import { useState } from "react";
import { toast } from "sonner";
import { findPreRegByToken, savePreReg } from "../store";
import type { AppScreen, UploadedDocument } from "../types";
import { generateId } from "../utils";
import { validateTcId } from "../utils/tcValidation";

interface Props {
  token: string;
  onNavigate: (s: AppScreen) => void;
}

export default function PreRegPage({ token }: Props) {
  const preReg = findPreRegByToken(token);
  const [form, setForm] = useState({
    name: preReg?.name ?? "",
    tc: preReg?.tc ?? "",
    phone: preReg?.phone ?? "",
    company: preReg?.company ?? "",
    purpose: preReg?.purpose ?? "",
  });
  const [submitted, setSubmitted] = useState(preReg?.status === "used");
  const [error, setError] = useState("");
  const [tcError, setTcError] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);

  if (!preReg) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
      >
        <div
          className="max-w-md w-full text-center p-10 rounded-3xl"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1.5px solid rgba(239,68,68,0.3)",
          }}
        >
          <div className="text-5xl mb-5">❌</div>
          <h2 className="text-white font-bold text-xl mb-3">
            Geçersiz Bağlantı
          </h2>
          <p className="text-slate-400 text-sm">
            Bu ön kayıt bağlantısı geçerli değil veya süresi dolmuş.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ background: "#0a0f1e" }}
      >
        <div
          className="max-w-md w-full text-center p-10 rounded-3xl"
          style={{
            background: "rgba(14,165,233,0.07)",
            border: "1.5px solid rgba(14,165,233,0.3)",
          }}
        >
          <div className="text-5xl mb-5">✅</div>
          <h2 className="text-white font-bold text-xl mb-3">
            Ön Kayıt Tamamlandı!
          </h2>
          <p className="text-slate-300 text-sm mb-2">
            Bilgileriniz kaydedildi. Ziyaretinizde kiosk&apos;ta token
            numaranızı gösterin.
          </p>
          <div
            className="mt-6 px-6 py-3 rounded-xl text-center font-mono font-bold text-lg"
            style={{
              background: "rgba(14,165,233,0.15)",
              color: "#0ea5e9",
              border: "1px solid rgba(14,165,233,0.3)",
            }}
          >
            {token}
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Bu kodu kiosk ekranına girin
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!form.name || !form.tc || !form.phone) {
      setError("Ad, TC kimlik numarası ve telefon zorunludur.");
      return;
    }
    if (form.tc.length === 11 && !validateTcId(form.tc)) {
      setTcError("Geçersiz TC Kimlik Numarası");
      return;
    }
    const updated = {
      ...preReg,
      ...form,
      status: "used" as const,
      uploadedDocuments: uploadedDocs.length > 0 ? uploadedDocs : undefined,
    };
    savePreReg(updated);
    setSubmitted(true);
    toast.success("Ön kayıt tamamlandı!");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#0a0f1e" }}
    >
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "rgba(14,165,233,0.15)" }}
          >
            <span className="text-3xl">📋</span>
          </div>
          <h1 className="text-white font-bold text-2xl mb-2">
            Ziyaretçi Ön Kaydı
          </h1>
          <p className="text-slate-400 text-sm">
            Ziyaretinizden önce bilgilerinizi doldurun, gelişinizde hızlı giriş
            yapın.
          </p>
        </div>

        {/* Form */}
        <div
          className="p-6 rounded-2xl space-y-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1.5px solid rgba(255,255,255,0.1)",
          }}
        >
          <div>
            <label
              htmlFor="prereg-name"
              className="block text-slate-400 text-xs mb-1.5 font-medium"
            >
              Ad Soyad *
            </label>
            <input
              id="prereg-name"
              data-ocid="prereg.name.input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Adınız Soyadınız"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
            />
          </div>

          <div>
            <label
              htmlFor="prereg-tc"
              className="block text-slate-400 text-xs mb-1.5 font-medium"
            >
              TC Kimlik No *
            </label>
            <input
              id="prereg-tc"
              data-ocid="prereg.tc.input"
              value={form.tc}
              maxLength={11}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setForm((f) => ({ ...f, tc: val }));
                if (tcError) setTcError("");
                if (val.length === 11 && !validateTcId(val)) {
                  setTcError("Geçersiz TC Kimlik Numarası");
                }
              }}
              placeholder="11 haneli TC kimlik numarası"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
              style={tcError ? { borderColor: "rgba(239,68,68,0.6)" } : {}}
            />
            {tcError && (
              <p
                data-ocid="prereg.tc_error"
                className="text-red-400 text-xs mt-1"
              >
                {tcError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="prereg-phone"
              className="block text-slate-400 text-xs mb-1.5 font-medium"
            >
              Telefon *
            </label>
            <input
              id="prereg-phone"
              data-ocid="prereg.phone.input"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="05xx xxx xx xx"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
            />
          </div>

          <div>
            <label
              htmlFor="prereg-company"
              className="block text-slate-400 text-xs mb-1.5 font-medium"
            >
              Şirket / Kurum
            </label>
            <input
              id="prereg-company"
              data-ocid="prereg.company.input"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
              placeholder="Kurumunuzun adı"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
            />
          </div>

          <div>
            <label
              htmlFor="prereg-purpose"
              className="block text-slate-400 text-xs mb-1.5 font-medium"
            >
              Ziyaret Amacı
            </label>
            <input
              id="prereg-purpose"
              data-ocid="prereg.purpose.input"
              value={form.purpose}
              onChange={(e) =>
                setForm((f) => ({ ...f, purpose: e.target.value }))
              }
              placeholder="Ziyaret nedeniniz"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
            />
          </div>

          {/* Document Upload */}
          <div>
            <p className="block text-slate-400 text-xs mb-1.5 font-medium">
              📎 Belgeler (isteğe bağlı, max 3 dosya, max 2MB)
            </p>
            <div className="space-y-2">
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(14,165,233,0.1)",
                    border: "1px solid rgba(14,165,233,0.2)",
                  }}
                >
                  <span className="text-white text-xs truncate flex-1">
                    {doc.name}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setUploadedDocs((d) => d.filter((x) => x.id !== doc.id))
                    }
                    className="ml-2 text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {uploadedDocs.length < 3 && (
                <label
                  data-ocid="prereg.upload_button"
                  htmlFor="prereg-doc-upload"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs text-slate-400 hover:text-white transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px dashed rgba(255,255,255,0.2)",
                  }}
                >
                  <span>📁 Dosya Ekle (PDF, JPG, PNG)</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    id="prereg-doc-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error("Dosya boyutu 2MB'yi aşamaz");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const base64 = ev.target?.result as string;
                        setUploadedDocs((d) => [
                          ...d,
                          {
                            id: generateId(),
                            name: file.name,
                            type: file.type,
                            base64,
                            uploadedAt: Date.now(),
                          },
                        ]);
                      };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {error && (
            <p data-ocid="prereg.error_state" className="text-red-400 text-sm">
              {error}
            </p>
          )}

          <button
            type="button"
            data-ocid="prereg.submit_button"
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
            }}
          >
            Ön Kaydı Tamamla
          </button>
        </div>
      </div>
    </div>
  );
}
