import React, { useState } from "react";
import { toast } from "sonner";
import { generateId } from "../utils";

export interface CompetencyCert {
  id: string;
  companyId: string;
  holderName: string;
  idNumber?: string;
  certName: string;
  certNumber?: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  category?: string;
  notes?: string;
  createdAt: number;
}

export function getCompetencyCerts(companyId: string): CompetencyCert[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_competency_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

export function saveCompetencyCert(cert: CompetencyCert) {
  const list = getCompetencyCerts(cert.companyId).filter(
    (c) => c.id !== cert.id,
  );
  localStorage.setItem(
    `safentry_competency_${cert.companyId}`,
    JSON.stringify([cert, ...list]),
  );
}

export function deleteCompetencyCert(companyId: string, id: string) {
  const list = getCompetencyCerts(companyId).filter((c) => c.id !== id);
  localStorage.setItem(
    `safentry_competency_${companyId}`,
    JSON.stringify(list),
  );
}

function getCertStatus(expiryDate: string): "valid" | "expiring" | "expired" {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring";
  return "valid";
}

const EMPTY_FORM = {
  holderName: "",
  idNumber: "",
  certName: "",
  certNumber: "",
  issuingAuthority: "",
  issueDate: "",
  expiryDate: "",
  category: "",
  notes: "",
};

interface Props {
  companyId: string;
}

export default function CompetencyTab({ companyId }: Props) {
  const [certs, setCerts] = useState<CompetencyCert[]>(() =>
    getCompetencyCerts(companyId),
  );
  const [showForm, setShowForm] = useState(false);
  const [editCert, setEditCert] = useState<CompetencyCert | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterStatus, setFilterStatus] = useState<
    "all" | "valid" | "expiring" | "expired"
  >("all");
  const [search, setSearch] = useState("");

  const reload = () => setCerts(getCompetencyCerts(companyId));

  const expiring = certs.filter(
    (c) => getCertStatus(c.expiryDate) === "expiring",
  );
  const expired = certs.filter(
    (c) => getCertStatus(c.expiryDate) === "expired",
  );

  const filtered = certs.filter((c) => {
    const s = getCertStatus(c.expiryDate);
    if (filterStatus !== "all" && s !== filterStatus) return false;
    if (
      search &&
      !c.holderName.toLowerCase().includes(search.toLowerCase()) &&
      !c.certName.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const submitForm = () => {
    if (
      !form.holderName ||
      !form.certName ||
      !form.issuingAuthority ||
      !form.expiryDate
    ) {
      toast.error("Lütfen zorunlu alanları doldurun.");
      return;
    }
    const cert: CompetencyCert = {
      ...(editCert ?? { id: generateId(), companyId, createdAt: Date.now() }),
      ...form,
    };
    saveCompetencyCert(cert);
    setShowForm(false);
    setEditCert(null);
    setForm({ ...EMPTY_FORM });
    reload();
    toast.success(editCert ? "Sertifika güncellendi." : "Sertifika eklendi.");
  };

  const startEdit = (c: CompetencyCert) => {
    setEditCert(c);
    setForm({
      holderName: c.holderName,
      idNumber: c.idNumber ?? "",
      certName: c.certName,
      certNumber: c.certNumber ?? "",
      issuingAuthority: c.issuingAuthority,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
      category: c.category ?? "",
      notes: c.notes ?? "",
    });
    setShowForm(true);
  };

  const deleteCert = (id: string) => {
    deleteCompetencyCert(companyId, id);
    reload();
    toast.success("Sertifika silindi.");
  };

  const exportCsv = () => {
    const headers = [
      "Ad Soyad",
      "TC/ID",
      "Sertifika Adı",
      "Sertifika No",
      "Veren Kurum",
      "Düzenleme Tarihi",
      "Geçerlilik Tarihi",
      "Durum",
    ];
    const rows = filtered.map((c) => [
      c.holderName,
      c.idNumber ?? "",
      c.certName,
      c.certNumber ?? "",
      c.issuingAuthority,
      c.issueDate,
      c.expiryDate,
      getCertStatus(c.expiryDate) === "valid"
        ? "Geçerli"
        : getCertStatus(c.expiryDate) === "expiring"
          ? "30 Günde Doluyor"
          : "Süresi Dolmuş",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yetkinlik_sertifikalari.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-ocid="competency.section" className="space-y-5">
      {/* Warning Banner */}
      {(expiring.length > 0 || expired.length > 0) && (
        <div
          className="p-4 rounded-2xl"
          style={{
            background:
              expired.length > 0
                ? "rgba(239,68,68,0.1)"
                : "rgba(245,158,11,0.1)",
            border:
              expired.length > 0
                ? "1.5px solid rgba(239,68,68,0.35)"
                : "1.5px solid rgba(245,158,11,0.35)",
          }}
        >
          <p
            className="font-bold text-sm"
            style={{ color: expired.length > 0 ? "#ef4444" : "#f59e0b" }}
          >
            ⚠️ Sertifika Durumu Uyarısı
          </p>
          <div className="mt-2 space-y-1 text-sm">
            {expired.length > 0 && (
              <p className="text-red-400">
                🔴 {expired.length} sertifikanın süresi dolmuş
              </p>
            )}
            {expiring.length > 0 && (
              <p className="text-amber-400">
                🟡 {expiring.length} sertifika 30 gün içinde sona erecek
              </p>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2">
          {(["all", "valid", "expiring", "expired"] as const).map((s) => (
            <button
              key={s}
              type="button"
              data-ocid={`competency.filter_${s}.tab`}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background:
                  filterStatus === s
                    ? s === "expired"
                      ? "rgba(239,68,68,0.2)"
                      : s === "expiring"
                        ? "rgba(245,158,11,0.2)"
                        : s === "valid"
                          ? "rgba(34,197,94,0.2)"
                          : "rgba(14,165,233,0.2)"
                    : "rgba(255,255,255,0.05)",
                color:
                  filterStatus === s
                    ? s === "expired"
                      ? "#ef4444"
                      : s === "expiring"
                        ? "#f59e0b"
                        : s === "valid"
                          ? "#4ade80"
                          : "#38bdf8"
                    : "#94a3b8",
                border:
                  filterStatus === s
                    ? "none"
                    : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {s === "all"
                ? `Tümü (${certs.length})`
                : s === "valid"
                  ? "✅ Geçerli"
                  : s === "expiring"
                    ? "⚠️ 30 Günde Doluyor"
                    : "🔴 Süresi Dolmuş"}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            data-ocid="competency.search.input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad veya sertifika ara..."
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            data-ocid="competency.export.button"
            onClick={exportCsv}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}
          >
            📥 CSV
          </button>
          <button
            type="button"
            data-ocid="competency.add.button"
            onClick={() => {
              setShowForm(true);
              setEditCert(null);
              setForm({ ...EMPTY_FORM });
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            ➕ Sertifika Ekle
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div
          data-ocid="competency.dialog"
          className="p-5 rounded-2xl"
          style={{
            background: "rgba(14,165,233,0.07)",
            border: "1.5px solid rgba(14,165,233,0.25)",
          }}
        >
          <h3 className="text-cyan-400 font-semibold text-sm mb-4">
            {editCert
              ? "✏️ Sertifika Düzenle"
              : "➕ Yeni Sertifika / Yetkinlik Belgesi"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input
              data-ocid="competency.holder_name.input"
              value={form.holderName}
              onChange={(e) =>
                setForm((f) => ({ ...f, holderName: e.target.value }))
              }
              placeholder="Ad Soyad *"
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <input
              data-ocid="competency.id_number.input"
              value={form.idNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, idNumber: e.target.value }))
              }
              placeholder="TC Kimlik / ID"
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <input
              data-ocid="competency.cert_name.input"
              value={form.certName}
              onChange={(e) =>
                setForm((f) => ({ ...f, certName: e.target.value }))
              }
              placeholder="Sertifika Adı * (ör. İSG Eğitimi)"
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <input
              data-ocid="competency.cert_number.input"
              value={form.certNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, certNumber: e.target.value }))
              }
              placeholder="Sertifika Numarası"
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <input
              data-ocid="competency.issuing_authority.input"
              value={form.issuingAuthority}
              onChange={(e) =>
                setForm((f) => ({ ...f, issuingAuthority: e.target.value }))
              }
              placeholder="Veren Kurum *"
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <input
              data-ocid="competency.category.input"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder="Kategori (ör. Müteahhit, Teknik)"
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
            />
            <div>
              <label
                htmlFor="comp-issue"
                className="text-xs text-slate-400 block mb-1"
              >
                Düzenleme Tarihi
              </label>
              <input
                id="comp-issue"
                type="date"
                data-ocid="competency.issue_date.input"
                value={form.issueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, issueDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label
                htmlFor="comp-expiry"
                className="text-xs text-slate-400 block mb-1"
              >
                Geçerlilik Tarihi *
              </label>
              <input
                id="comp-expiry"
                type="date"
                data-ocid="competency.expiry_date.input"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiryDate: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
          <textarea
            data-ocid="competency.notes.textarea"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Notlar (opsiyonel)"
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:outline-none focus:border-cyan-400 mb-3"
          />
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="competency.save.button"
              onClick={submitForm}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              Kaydet
            </button>
            <button
              type="button"
              data-ocid="competency.cancel.button"
              onClick={() => {
                setShowForm(false);
                setEditCert(null);
              }}
              className="px-4 py-2 rounded-xl text-sm text-slate-400 border border-white/15 hover:bg-white/5"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Certificate List */}
      {filtered.length === 0 ? (
        <div
          data-ocid="competency.empty_state"
          className="text-center py-12 text-slate-500"
        >
          <div className="text-4xl mb-2">🏅</div>
          <p>
            {search || filterStatus !== "all"
              ? "Filtreye uygun sertifika bulunamadı."
              : "Henüz sertifika eklenmedi."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, i) => {
            const status = getCertStatus(c.expiryDate);
            const expiry = new Date(c.expiryDate);
            const now = new Date();
            const daysLeft = Math.ceil(
              (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            return (
              <div
                key={c.id}
                data-ocid={`competency.item.${i + 1}`}
                className="p-4 rounded-2xl"
                style={{
                  background:
                    status === "expired"
                      ? "rgba(239,68,68,0.06)"
                      : status === "expiring"
                        ? "rgba(245,158,11,0.06)"
                        : "rgba(255,255,255,0.04)",
                  border:
                    status === "expired"
                      ? "1px solid rgba(239,68,68,0.3)"
                      : status === "expiring"
                        ? "1px solid rgba(245,158,11,0.3)"
                        : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          background:
                            status === "expired"
                              ? "#ef4444"
                              : status === "expiring"
                                ? "#f59e0b"
                                : "#22c55e",
                        }}
                      />
                      <span className="text-white font-semibold text-sm">
                        {c.certName}
                      </span>
                      {c.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs text-slate-400 bg-white/5">
                          {c.category}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 text-sm">{c.holderName}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Veren: {c.issuingAuthority}
                      {c.certNumber && ` • No: ${c.certNumber}`}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs">
                      {c.issueDate && (
                        <span className="text-slate-400">📅 {c.issueDate}</span>
                      )}
                      <span
                        style={{
                          color:
                            status === "expired"
                              ? "#ef4444"
                              : status === "expiring"
                                ? "#f59e0b"
                                : "#4ade80",
                        }}
                      >
                        {status === "expired"
                          ? `🔴 Süresi doldu (${Math.abs(daysLeft)} gün önce)`
                          : status === "expiring"
                            ? `⚠️ ${daysLeft} gün kaldı`
                            : `✅ ${daysLeft} gün geçerli`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      data-ocid={`competency.edit.${i + 1}`}
                      onClick={() => startEdit(c)}
                      className="text-xs px-2 py-1 rounded text-slate-400 hover:text-cyan-400"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      data-ocid={`competency.delete.${i + 1}`}
                      onClick={() => deleteCert(c.id)}
                      className="text-xs px-2 py-1 rounded text-slate-400 hover:text-red-400"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
