import { useState } from "react";
import { saveContractorDocument } from "../store";
import type { ContractorDocument } from "../types";

const DOC_TYPES: { value: string; label: string }[] = [
  { value: "isg", label: "İş Güvenliği Eğitim Sertifikası" },
  { value: "sigorta", label: "İş Kazası Sigortası" },
  { value: "yeterlilik", label: "Mesleki Yeterlilik Belgesi" },
  { value: "kimlik", label: "Kimlik / Pasaport" },
  { value: "diger", label: "Diğer" },
];

export default function ContractorPortalPage({
  companyId,
}: {
  companyId: string;
}) {
  const [name, setName] = useState("");
  const [docType, setDocType] = useState("isg");
  const [fileBase64, setFileBase64] = useState("");
  const [fileName, setFileName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Dosya boyutu 5MB'\u0131 geçemez.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setFileBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Ad\u0131n\u0131z\u0131 girin.");
      return;
    }
    if (!fileBase64) {
      setError("L\u00fctfen bir belge y\u00fckleyin.");
      return;
    }
    const doc: ContractorDocument = {
      id: `cdoc_${Date.now()}`,
      companyId,
      contractorName: name.trim(),
      docType,
      fileName,
      fileBase64,
      expiryDate: expiry || undefined,
      uploadedAt: Date.now(),
      status: "pending",
    };
    saveContractorDocument(doc);
    setSubmitted(true);
  };

  return (
    <div
      style={{ minHeight: "100vh", background: "#0f172a" }}
      className="flex items-center justify-center p-4"
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
        }}
        className="w-full max-w-md p-8"
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📋</div>
          <h1 className="text-white text-2xl font-bold">
            Müteahhit Belge Portalı
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sahaya giriş öncesi belgelerinizi yükleyin
          </p>
        </div>
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-green-400 font-semibold text-lg">
              Belgeniz alındı!
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Yetkililer inceledikten sonra onay bilgisi iletilecektir.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <p className="text-red-400 text-sm bg-red-900/20 rounded-lg p-3">
                {error}
              </p>
            )}
            <div>
              <label
                htmlFor="cp-name"
                className="text-slate-300 text-sm block mb-1"
              >
                Adınız Soyadınız *
              </label>
              <input
                id="cp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-white text-sm"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                placeholder="Ad Soyad"
              />
            </div>
            <div>
              <label
                htmlFor="cp-doctype"
                className="text-slate-300 text-sm block mb-1"
              >
                Belge Türü *
              </label>
              <select
                id="cp-doctype"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-white text-sm"
                style={{
                  background: "rgba(30,41,59,0.9)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {DOC_TYPES.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="cp-expiry"
                className="text-slate-300 text-sm block mb-1"
              >
                Geçerlilik Tarihi (opsiyonel)
              </label>
              <input
                id="cp-expiry"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-white text-sm"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              />
            </div>
            <div>
              <label
                htmlFor="cp-file"
                className="text-slate-300 text-sm block mb-1"
              >
                Belge Dosyası * (max 5MB)
              </label>
              <input
                id="cp-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFile}
                className="w-full text-sm text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-teal-600 file:text-white hover:file:bg-teal-500"
              />
              {fileName && (
                <p className="text-teal-400 text-xs mt-1">📎 {fileName}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all"
              style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}
            >
              Belgeyi Gönder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
