import React, { useState } from "react";
import {
  deleteApprovalFlowTemplate,
  getApprovalFlowTemplates,
  saveApprovalFlowTemplate,
} from "../store";
import type { ApprovalFlowTemplate, ApprovalStep } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
  categories: string[];
}

const PRESET_TEMPLATES: Omit<
  ApprovalFlowTemplate,
  "id" | "companyId" | "createdAt"
>[] = [
  {
    name: "VIP Hızlı Onay",
    visitorCategory: "VIP",
    steps: [{ order: 1, role: "Admin", timeoutHours: 0, autoApprove: true }],
  },
  {
    name: "Müteahhit 3 Adımlı",
    visitorCategory: "Müteahhit",
    steps: [
      { order: 1, role: "Güvenlik", timeoutHours: 1, autoApprove: false },
      { order: 2, role: "Yönetici", timeoutHours: 2, autoApprove: false },
      { order: 3, role: "İK", timeoutHours: 4, autoApprove: true },
    ],
  },
  {
    name: "Standart Tek Adım",
    visitorCategory: "Tümü",
    steps: [
      { order: 1, role: "Güvenlik", timeoutHours: 10, autoApprove: true },
    ],
  },
];

export default function ApprovalFlowTemplatesTab({
  companyId,
  categories,
}: Props) {
  const [templates, setTemplates] = useState<ApprovalFlowTemplate[]>(() =>
    getApprovalFlowTemplates(companyId),
  );
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", visitorCategory: "Tümü" });
  const [steps, setSteps] = useState<ApprovalStep[]>([
    { order: 1, role: "Güvenlik", timeoutHours: 1, autoApprove: false },
  ]);

  const reload = () => setTemplates(getApprovalFlowTemplates(companyId));

  const handleSave = () => {
    if (!form.name.trim()) return;
    const t: ApprovalFlowTemplate = {
      id: generateId(),
      companyId,
      name: form.name.trim(),
      visitorCategory: form.visitorCategory,
      steps,
      createdAt: Date.now(),
    };
    saveApprovalFlowTemplate(t);
    reload();
    setShowModal(false);
    setForm({ name: "", visitorCategory: "Tümü" });
    setSteps([
      { order: 1, role: "Güvenlik", timeoutHours: 1, autoApprove: false },
    ]);
  };

  const addPreset = (preset: (typeof PRESET_TEMPLATES)[0]) => {
    const t: ApprovalFlowTemplate = {
      id: generateId(),
      companyId,
      ...preset,
      createdAt: Date.now(),
    };
    saveApprovalFlowTemplate(t);
    reload();
  };

  const addStep = () => {
    setSteps((p) => [
      ...p,
      {
        order: p.length + 1,
        role: "Güvenlik",
        timeoutHours: 1,
        autoApprove: false,
      },
    ]);
  };

  const updateStep = (
    i: number,
    field: keyof ApprovalStep,
    value: string | number | boolean,
  ) => {
    setSteps((p) => p.map((s, j) => (j === i ? { ...s, [field]: value } : s)));
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
  };
  const inputCls =
    "w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">
            ⚙️ Onay Akış Şablonları
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Ziyaretçi kategorisine göre özelleştirilebilir onay adımları
          </p>
        </div>
        <button
          type="button"
          data-ocid="onayakilslablonlari.open_modal_button"
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Yeni Şablon
        </button>
      </div>

      {/* Presets */}
      {templates.length === 0 && (
        <div className="p-4 rounded-xl" style={cardStyle}>
          <h3 className="text-white font-semibold text-sm mb-3">
            Hazır Şablonlar
          </h3>
          <div className="space-y-2">
            {PRESET_TEMPLATES.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: "rgba(14,165,233,0.05)",
                  border: "1px solid rgba(14,165,233,0.15)",
                }}
              >
                <div>
                  <p className="text-white text-sm font-medium">{p.name}</p>
                  <p className="text-slate-400 text-xs">
                    {p.visitorCategory} · {p.steps.length} adım
                  </p>
                </div>
                <button
                  type="button"
                  data-ocid="onayakilslablonlari.secondary_button"
                  onClick={() => addPreset(p)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/20 border border-teal-600/30 text-teal-400"
                >
                  Ekle
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div
          data-ocid="onayakilslablonlari.empty_state"
          className="text-center py-10 text-slate-500"
        >
          <p>
            Hazır şablonlardan birini ekleyebilir veya yeni şablon
            oluşturabilirsiniz
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t, i) => (
            <div
              key={t.id}
              data-ocid={`onayakilslablonlari.item.${i + 1}`}
              className="p-4 rounded-xl"
              style={cardStyle}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{t.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
                      {t.visitorCategory}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {t.steps.map((step, j) => (
                      <React.Fragment key={`step-${t.id}-${j}`}>
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            background: "rgba(255,255,255,0.06)",
                            color: "#94a3b8",
                          }}
                        >
                          {step.order}. {step.role}
                          {step.autoApprove && (
                            <span className="text-green-400 ml-1">(oto)</span>
                          )}
                          {step.timeoutHours > 0 && (
                            <span className="text-slate-500 ml-1">
                              {step.timeoutHours}s
                            </span>
                          )}
                        </span>
                        {j < t.steps.length - 1 && (
                          <span className="text-slate-600">→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  data-ocid={`onayakilslablonlari.delete_button.${i + 1}`}
                  onClick={() => {
                    deleteApprovalFlowTemplate(companyId, t.id);
                    reload();
                  }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          data-ocid="onayakilslablonlari.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{
              background: "#0f1729",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 className="text-white font-bold text-lg">Yeni Onay Şablonu</h3>
            <div>
              <p className="text-slate-400 text-xs mb-1">Şablon Adı *</p>
              <input
                data-ocid="onayakilslablonlari.input"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                className={inputCls}
                placeholder="Ör: Standart Güvenlik Kontrolü"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">
                Ziyaretçi Kategorisi
              </p>
              <select
                data-ocid="onayakilslablonlari.select"
                value={form.visitorCategory}
                onChange={(e) =>
                  setForm((p) => ({ ...p, visitorCategory: e.target.value }))
                }
                className={`${inputCls} bg-[#0f1729]`}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-xs">Onay Adımları</p>
                <button
                  type="button"
                  onClick={addStep}
                  className="text-xs text-teal-400 hover:text-teal-300"
                >
                  + Adım Ekle
                </button>
              </div>
              <div className="space-y-2">
                {steps.map((step, i) => (
                  <div
                    key={`${step.order}-${step.role}-${i}`}
                    className="grid grid-cols-3 gap-2 p-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <input
                      value={step.role}
                      onChange={(e) => updateStep(i, "role", e.target.value)}
                      className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-xs"
                      placeholder="Rol"
                    />
                    <input
                      type="number"
                      value={step.timeoutHours}
                      onChange={(e) =>
                        updateStep(
                          i,
                          "timeoutHours",
                          Number.parseInt(e.target.value) || 0,
                        )
                      }
                      className="px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-xs"
                      placeholder="Zaman (saat)"
                    />
                    <label className="flex items-center gap-1 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={step.autoApprove}
                        onChange={(e) =>
                          updateStep(i, "autoApprove", e.target.checked)
                        }
                        className="accent-teal-500"
                      />
                      Oto Onayla
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="onayakilslablonlari.submit_button"
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Kaydet
              </button>
              <button
                type="button"
                data-ocid="onayakilslablonlari.cancel_button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-300"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
