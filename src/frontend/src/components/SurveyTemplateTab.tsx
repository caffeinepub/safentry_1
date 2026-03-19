import React, { useState } from "react";
import { toast } from "sonner";
import type { SurveyQuestion, SurveyTemplate } from "../types";
import { generateId } from "../utils";

const QUESTION_TYPES = [
  { value: "star", label: "⭐ Yıldız (1-5)" },
  { value: "yesno", label: "✅ Evet/Hayır" },
  { value: "multiple", label: "🔘 Çoktan Seçmeli" },
  { value: "text", label: "📝 Metin" },
];

interface Props {
  companyId: string;
  templates: SurveyTemplate[];
  onSave: (t: SurveyTemplate) => void;
  onDelete: (id: string) => void;
  onReload: () => void;
}

function QuestionEditor({
  q,
  onChange,
  onRemove,
}: {
  q: SurveyQuestion;
  onChange: (q: SurveyQuestion) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="p-4 rounded-xl space-y-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex gap-3 items-start">
        <div className="flex-1 space-y-2">
          <input
            value={q.label}
            onChange={(e) => onChange({ ...q, label: e.target.value })}
            placeholder="Soru metni"
            className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              outline: "none",
            }}
          />
          <select
            value={q.type}
            onChange={(e) =>
              onChange({ ...q, type: e.target.value as SurveyQuestion["type"] })
            }
            className="px-3 py-1.5 rounded-lg text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              outline: "none",
            }}
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {q.type === "multiple" && (
            <textarea
              value={(q.options ?? []).join("\n")}
              onChange={(e) =>
                onChange({
                  ...q,
                  options: e.target.value.split("\n").filter((x) => x.trim()),
                })
              }
              placeholder="Her satıra bir seçenek yazın"
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm text-white resize-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                outline: "none",
              }}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-300 text-xl mt-1 flex-shrink-0"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function SurveyTemplateTab({
  companyId,
  templates,
  onSave,
  onDelete,
  onReload,
}: Props) {
  const [editing, setEditing] = useState<SurveyTemplate | null>(null);

  const startNew = () =>
    setEditing({
      id: generateId(),
      companyId,
      name: "",
      questions: [],
      isActive: false,
    });

  const addQuestion = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      questions: [
        ...editing.questions,
        { id: generateId(), type: "star", label: "", options: [] },
      ],
    });
  };

  const updateQuestion = (idx: number, q: SurveyQuestion) => {
    if (!editing) return;
    const questions = [...editing.questions];
    questions[idx] = q;
    setEditing({ ...editing, questions });
  };

  const removeQuestion = (idx: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      questions: editing.questions.filter((_, i) => i !== idx),
    });
  };

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error("Şablon adı boş olamaz");
      return;
    }
    onSave(editing);
    setEditing(null);
    toast.success("Anket şablonu kaydedildi");
    onReload();
  };

  const toggleActive = (tmpl: SurveyTemplate) => {
    // Deactivate all others, toggle this
    const updatedActive = !tmpl.isActive;
    if (updatedActive) {
      // deactivate others
      for (const t of templates) {
        if (t.id !== tmpl.id && t.isActive) {
          onSave({ ...t, isActive: false });
        }
      }
    }
    onSave({ ...tmpl, isActive: updatedActive });
    onReload();
    toast.success(updatedActive ? "Şablon aktif edildi" : "Şablon devre dışı");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-bold text-lg">📋 Anket Şablonları</h2>
          <p className="text-slate-400 text-sm">
            Ziyaretçi çıkış anketleri için özel soru şablonları oluşturun
          </p>
        </div>
        <button
          type="button"
          data-ocid="survey_templates.open_modal_button"
          onClick={startNew}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Yeni Şablon
        </button>
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <div
          data-ocid="survey_templates.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-5xl mb-3">📋</div>
          <p className="text-sm">Henüz anket şablonu oluşturulmadı</p>
          <p className="text-xs mt-1">Yeni Şablon butonuyla başlayın</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {templates.map((tmpl, idx) => (
            <div
              key={tmpl.id}
              data-ocid={`survey_templates.item.${idx + 1}`}
              className="flex items-center justify-between p-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  tmpl.isActive
                    ? "rgba(20,184,166,0.4)"
                    : "rgba(255,255,255,0.08)"
                }`,
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{
                    background: tmpl.isActive
                      ? "rgba(20,184,166,0.2)"
                      : "rgba(255,255,255,0.06)",
                  }}
                >
                  📋
                </div>
                <div>
                  <p className="text-white font-semibold">{tmpl.name}</p>
                  <p className="text-slate-500 text-xs">
                    {tmpl.questions.length} soru
                    {tmpl.isActive && (
                      <span
                        className="ml-2 px-2 py-0.5 rounded-full text-xs"
                        style={{
                          background: "rgba(20,184,166,0.2)",
                          color: "#2dd4bf",
                        }}
                      >
                        Aktif
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-ocid={`survey_templates.toggle.${idx + 1}`}
                  onClick={() => toggleActive(tmpl)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: tmpl.isActive
                      ? "rgba(20,184,166,0.2)"
                      : "rgba(255,255,255,0.07)",
                    color: tmpl.isActive ? "#2dd4bf" : "#94a3b8",
                    border: `1px solid ${
                      tmpl.isActive
                        ? "rgba(20,184,166,0.4)"
                        : "rgba(255,255,255,0.1)"
                    }`,
                  }}
                >
                  {tmpl.isActive ? "✓ Aktif" : "Aktif Et"}
                </button>
                <button
                  type="button"
                  data-ocid={`survey_templates.edit_button.${idx + 1}`}
                  onClick={() => setEditing(tmpl)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
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
                  data-ocid={`survey_templates.delete_button.${idx + 1}`}
                  onClick={() => {
                    onDelete(tmpl.id);
                    onReload();
                    toast.success("Şablon silindi");
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
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
          ))}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div
          data-ocid="survey_templates.dialog"
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
              <h3 className="text-white font-bold text-lg">
                {editing.id ? "Anket Şablonu Düzenle" : "Yeni Anket Şablonu"}
              </h3>
              <button
                type="button"
                data-ocid="survey_templates.close_button"
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <input
              data-ocid="survey_templates.input"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="Şablon adı (örn: Standart Çıkış Anketi)"
              className="w-full px-4 py-2.5 rounded-xl mb-4 text-white"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                outline: "none",
              }}
            />

            <div className="space-y-3 mb-4">
              {editing.questions.map((q, i) => (
                <QuestionEditor
                  key={q.id}
                  q={q}
                  onChange={(updated) => updateQuestion(i, updated)}
                  onRemove={() => removeQuestion(i)}
                />
              ))}
            </div>

            <button
              type="button"
              data-ocid="survey_templates.secondary_button"
              onClick={addQuestion}
              className="w-full py-2.5 rounded-xl text-sm font-medium mb-4"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px dashed rgba(255,255,255,0.15)",
                color: "#94a3b8",
              }}
            >
              + Soru Ekle
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="survey_templates.cancel_button"
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
                data-ocid="survey_templates.save_button"
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
