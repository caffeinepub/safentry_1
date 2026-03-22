import { useState } from "react";
import { getContractorDocuments, saveContractorDocument } from "../store";
import type { ContractorDocument } from "../types";

const DOC_TYPE_LABELS: Record<string, string> = {
  isg: "İSG Sertifikası",
  sigorta: "İş Kazası Sigortası",
  yeterlilik: "Mesleki Yeterlilik",
  kimlik: "Kimlik / Pasaport",
  diger: "Diğer",
};

export default function ContractorPortalTab({
  companyId,
}: { companyId: string }) {
  const [_tick, setTick] = useState(0);
  const [selected, setSelected] = useState<ContractorDocument | null>(null);
  const docs = getContractorDocuments(companyId);

  const portalUrl = `${window.location.origin}/contractor-portal/${companyId}`;

  const approve = (doc: ContractorDocument) => {
    saveContractorDocument({
      ...doc,
      status: "approved",
      reviewedAt: Date.now(),
    });
    setTick((t) => t + 1);
    setSelected(null);
  };
  const reject = (doc: ContractorDocument) => {
    saveContractorDocument({
      ...doc,
      status: "rejected",
      reviewedAt: Date.now(),
    });
    setTick((t) => t + 1);
    setSelected(null);
  };

  const pending = docs.filter((d) => d.status === "pending");
  const reviewed = docs.filter((d) => d.status !== "pending");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-white font-semibold text-lg">
          📋 Müteahhit Belge Portalı
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs font-mono truncate max-w-xs">
            {portalUrl}
          </span>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(portalUrl)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{
              background: "rgba(13,148,136,0.3)",
              border: "1px solid rgba(13,148,136,0.5)",
            }}
          >
            Kopyala
          </button>
        </div>
      </div>
      <p className="text-slate-400 text-sm">
        Müteahhitlere bu linki gönderin; belgelerini gelmeden önce yüklesinler.
        Gelen belgeler aşağıda gözükür.
      </p>

      {pending.length > 0 && (
        <div>
          <p className="text-amber-400 font-semibold text-sm mb-3">
            ⏳ İnceleme Bekleyenler ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((doc) => (
              <button
                type="button"
                key={doc.id}
                className="w-full flex items-center justify-between p-4 rounded-xl cursor-pointer hover:bg-white/5 transition-all text-left"
                style={{
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
                onClick={() => setSelected(doc)}
              >
                <div>
                  <p className="text-white font-medium text-sm">
                    {doc.contractorName}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {DOC_TYPE_LABELS[doc.docType] || doc.docType} •{" "}
                    {doc.fileName}
                  </p>
                  {doc.expiryDate && (
                    <p className="text-amber-400 text-xs">
                      Geçerlilik: {doc.expiryDate}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      approve(doc);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{
                      background: "rgba(34,197,94,0.25)",
                      border: "1px solid rgba(34,197,94,0.4)",
                    }}
                  >
                    ✅ Onayla
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      reject(doc);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      border: "1px solid rgba(239,68,68,0.4)",
                    }}
                  >
                    ❌ Reddet
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div>
          <p className="text-slate-400 font-semibold text-sm mb-3">
            📁 İncelenenler ({reviewed.length})
          </p>
          <div className="space-y-2">
            {reviewed.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <p className="text-white text-sm">{doc.contractorName}</p>
                  <p className="text-slate-400 text-xs">
                    {DOC_TYPE_LABELS[doc.docType] || doc.docType} •{" "}
                    {doc.fileName}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    doc.status === "approved"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                  style={{
                    background:
                      doc.status === "approved"
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(239,68,68,0.15)",
                  }}
                >
                  {doc.status === "approved" ? "✅ Onaylı" : "❌ Reddedildi"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {docs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-400">Henüz belge yüklenmedi.</p>
          <p className="text-slate-500 text-sm mt-1">
            Yukarıdaki portal linkini müteahhitlere gönderin.
          </p>
        </div>
      )}

      {/* Preview modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <h3 className="text-white font-bold text-lg mb-4">
              📄 Belge Önizleme
            </h3>
            <p className="text-slate-300 mb-1">
              <strong>Müteahhit:</strong> {selected.contractorName}
            </p>
            <p className="text-slate-300 mb-1">
              <strong>Belge:</strong>{" "}
              {DOC_TYPE_LABELS[selected.docType] || selected.docType}
            </p>
            <p className="text-slate-300 mb-4">
              <strong>Dosya:</strong> {selected.fileName}
            </p>
            {selected.fileBase64.startsWith("data:image") && (
              <img
                src={selected.fileBase64}
                alt="belge"
                className="w-full rounded-xl mb-4 max-h-64 object-contain"
              />
            )}
            {selected.fileBase64.startsWith("data:application/pdf") && (
              <div
                className="rounded-xl p-4 text-center mb-4"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <p className="text-slate-300">📄 PDF dosyası yüklendi</p>
                <a
                  href={selected.fileBase64}
                  download={selected.fileName}
                  className="text-teal-400 underline text-sm mt-1 block"
                >
                  İndir
                </a>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => approve(selected)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "rgba(34,197,94,0.25)",
                  border: "1px solid rgba(34,197,94,0.4)",
                }}
              >
                ✅ Onayla
              </button>
              <button
                type="button"
                onClick={() => reject(selected)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "rgba(239,68,68,0.2)",
                  border: "1px solid rgba(239,68,68,0.4)",
                }}
              >
                ❌ Reddet
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
