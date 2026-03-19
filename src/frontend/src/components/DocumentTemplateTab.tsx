import React, { useState } from "react";
import { toast } from "sonner";
import type { DocumentTemplate } from "../types";
import { generateId } from "../utils";

const BADGE_FIELDS: { key: string; label: string }[] = [
  { key: "visitorPhoto", label: "Ziyaretçi Fotoğrafı" },
  { key: "department", label: "Departman" },
  { key: "floor", label: "Kat" },
  { key: "accessCardNo", label: "Erişim Kartı No" },
  { key: "hostName", label: "Ev Sahibi" },
  { key: "qrCode", label: "QR Kod" },
  { key: "companyLogo", label: "Şirket Logosu" },
];

const DOC_CATEGORIES: { value: DocumentTemplate["category"]; label: string }[] =
  [
    { value: "NDA", label: "NDA / Gizlilik" },
    { value: "ISG", label: "İSG Beyanı" },
    { value: "policy", label: "Ziyaret Politikası" },
    { value: "custom", label: "Özel Belge" },
  ];

interface Props {
  companyId: string;
  templates: DocumentTemplate[];
  badgeFields: string[];
  onSave: (t: DocumentTemplate) => void;
  onDelete: (id: string) => void;
  onBadgeFieldsChange: (fields: string[]) => void;
  onReload: () => void;
}

export default function DocumentTemplateTab({
  companyId,
  templates,
  badgeFields,
  onSave,
  onDelete,
  onBadgeFieldsChange,
  onReload,
}: Props) {
  const [section, setSection] = useState<"belgeler" | "rozet">("belgeler");
  const [editing, setEditing] = useState<DocumentTemplate | null>(null);
  const [localBadgeFields, setLocalBadgeFields] =
    useState<string[]>(badgeFields);

  const startNew = () =>
    setEditing({
      id: generateId(),
      companyId,
      name: "",
      category: "custom",
      content: "",
      isActive: true,
    });

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Belge adı boş olamaz");
      return;
    }
    onSave(editing);
    setEditing(null);
    onReload();
    toast.success("Belge şablonu kaydedildi");
  };

  const toggleBadgeField = (key: string) => {
    const updated = localBadgeFields.includes(key)
      ? localBadgeFields.filter((f) => f !== key)
      : [...localBadgeFields, key];
    setLocalBadgeFields(updated);
    onBadgeFieldsChange(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-bold text-lg">🗂️ Şablonlar</h2>
          <p className="text-slate-400 text-sm">
            Belge ve rozet tasarım şablonlarını yönetin
          </p>
        </div>
      </div>

      {/* Sub-section tabs */}
      <div className="flex gap-2 mb-6">
        {(["belgeler", "rozet"] as const).map((s) => (
          <button
            key={s}
            type="button"
            data-ocid={`doc_templates.${s}.tab`}
            onClick={() => setSection(s)}
            className="px-5 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              section === s
                ? {
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                    color: "#fff",
                  }
                : {
                    background: "rgba(255,255,255,0.05)",
                    color: "#94a3b8",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }
            }
          >
            {s === "belgeler" ? "📄 Belgeler" : "🪪 Rozet Tasarımı"}
          </button>
        ))}
      </div>

      {/* Belgeler */}
      {section === "belgeler" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              type="button"
              data-ocid="doc_templates.open_modal_button"
              onClick={startNew}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              + Yeni Belge Şablonu
            </button>
          </div>

          {templates.length === 0 ? (
            <div
              data-ocid="doc_templates.empty_state"
              className="text-center py-16 text-slate-500"
            >
              <div className="text-5xl mb-3">📄</div>
              <p className="text-sm">Henüz belge şablonu eklenmedi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((tmpl, idx) => (
                <div
                  key={tmpl.id}
                  data-ocid={`doc_templates.item.${idx + 1}`}
                  className="p-4 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${
                      tmpl.isActive
                        ? "rgba(20,184,166,0.3)"
                        : "rgba(255,255,255,0.08)"
                    }`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white font-semibold">{tmpl.name}</p>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs"
                          style={{
                            background: "rgba(14,165,233,0.15)",
                            color: "#38bdf8",
                          }}
                        >
                          {DOC_CATEGORIES.find((c) => c.value === tmpl.category)
                            ?.label ?? tmpl.category}
                        </span>
                        {!tmpl.isActive && (
                          <span
                            className="px-2 py-0.5 rounded-full text-xs"
                            style={{
                              background: "rgba(100,100,100,0.2)",
                              color: "#64748b",
                            }}
                          >
                            Devre Dışı
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs line-clamp-2">
                        {tmpl.content || "(İçerik yok)"}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        data-ocid={`doc_templates.edit_button.${idx + 1}`}
                        onClick={() => setEditing(tmpl)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{
                          background: "rgba(255,255,255,0.07)",
                          color: "#94a3b8",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        Düzenle
                      </button>
                      <button
                        type="button"
                        data-ocid={`doc_templates.delete_button.${idx + 1}`}
                        onClick={() => {
                          onDelete(tmpl.id);
                          onReload();
                          toast.success("Belge silindi");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          color: "#f87171",
                          border: "1px solid rgba(239,68,68,0.2)",
                        }}
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rozet Tasarımı */}
      {section === "rozet" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-white font-semibold mb-3">
              Rozette Gösterilecek Alanlar
            </p>
            <div className="space-y-2">
              {BADGE_FIELDS.map((f) => (
                <label
                  key={f.key}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/5"
                  style={{
                    background: localBadgeFields.includes(f.key)
                      ? "rgba(14,165,233,0.08)"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${
                      localBadgeFields.includes(f.key)
                        ? "rgba(14,165,233,0.3)"
                        : "rgba(255,255,255,0.07)"
                    }`,
                  }}
                >
                  <input
                    data-ocid={`doc_templates.${f.key}.checkbox`}
                    type="checkbox"
                    checked={localBadgeFields.includes(f.key)}
                    onChange={() => toggleBadgeField(f.key)}
                    className="w-4 h-4 rounded accent-sky-500"
                  />
                  <span className="text-slate-300 text-sm">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-white font-semibold mb-3">Rozet Önizlemesi</p>
            <div
              className="rounded-2xl p-5"
              style={{
                background: "#fff",
                color: "#111",
                maxWidth: 260,
                boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
              }}
            >
              <div className="text-center mb-3">
                {localBadgeFields.includes("companyLogo") && (
                  <div
                    className="w-12 h-12 rounded-lg mx-auto mb-2 flex items-center justify-center text-2xl"
                    style={{ background: "#0f172a" }}
                  >
                    🏢
                  </div>
                )}
                <p className="font-bold text-sm">ZİYARETÇİ</p>
              </div>
              {localBadgeFields.includes("visitorPhoto") && (
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl"
                  style={{ background: "#e2e8f0" }}
                >
                  👤
                </div>
              )}
              <p
                className="text-center font-bold text-base mb-2"
                style={{ color: "#0f172a" }}
              >
                Ahmet Yılmaz
              </p>
              {localBadgeFields.includes("department") && (
                <p className="text-center text-xs text-gray-600">
                  🏢 IT Departmanı
                </p>
              )}
              {localBadgeFields.includes("floor") && (
                <p className="text-center text-xs text-gray-600">📍 3. Kat</p>
              )}
              {localBadgeFields.includes("hostName") && (
                <p className="text-center text-xs text-gray-600">
                  👤 Host: Ayşe Kaya
                </p>
              )}
              {localBadgeFields.includes("accessCardNo") && (
                <p
                  className="text-center text-xs font-mono mt-2"
                  style={{ color: "#0ea5e9" }}
                >
                  Kart: T-047
                </p>
              )}
              {localBadgeFields.includes("qrCode") && (
                <div
                  className="w-14 h-14 mx-auto mt-3 rounded flex items-center justify-center text-2xl"
                  style={{ background: "#f1f5f9" }}
                >
                  ▦
                </div>
              )}
            </div>
            <p className="text-slate-500 text-xs mt-3">
              * Önizleme örnek veri kullanmaktadır
            </p>
          </div>
        </div>
      )}

      {/* Document editor modal */}
      {editing && (
        <div
          data-ocid="doc_templates.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Belge Şablonu</h3>
              <button
                type="button"
                data-ocid="doc_templates.close_button"
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-xs mb-1 block">Belge Adı</p>
                <input
                  data-ocid="doc_templates.input"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="NDA Metni, İSG Beyanı..."
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1 block">Kategori</p>
                <select
                  data-ocid="doc_templates.select"
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      category: e.target.value as DocumentTemplate["category"],
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    outline: "none",
                  }}
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1 block">İçerik</p>
                <textarea
                  data-ocid="doc_templates.textarea"
                  value={editing.content}
                  onChange={(e) =>
                    setEditing({ ...editing, content: e.target.value })
                  }
                  placeholder="Belge içeriğini buraya yazın..."
                  rows={8}
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm resize-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    outline: "none",
                  }}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.isActive}
                  onChange={(e) =>
                    setEditing({ ...editing, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-sky-500"
                />
                <span className="text-slate-300 text-sm">Aktif</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                data-ocid="doc_templates.cancel_button"
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#94a3b8",
                }}
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="doc_templates.save_button"
                onClick={save}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
