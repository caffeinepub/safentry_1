import { useState } from "react";
import { toast } from "sonner";

export interface MsgTemplate {
  id: string;
  title: string;
  scenario: "approval" | "rejection" | "reminder" | "wayfinding";
  visitorCategory: string;
  body: string;
  createdAt: number;
}

const SCENARIO_LABELS: Record<MsgTemplate["scenario"], string> = {
  approval: "✅ Onay",
  rejection: "❌ Red",
  reminder: "🔔 Hatırlatma",
  wayfinding: "🗺️ Yönlendirme",
};

const SCENARIO_COLORS: Record<MsgTemplate["scenario"], string> = {
  approval: "rgba(34,197,94,0.15)",
  rejection: "rgba(239,68,68,0.15)",
  reminder: "rgba(245,158,11,0.15)",
  wayfinding: "rgba(14,165,233,0.15)",
};

const SCENARIO_BORDER: Record<MsgTemplate["scenario"], string> = {
  approval: "rgba(34,197,94,0.3)",
  rejection: "rgba(239,68,68,0.3)",
  reminder: "rgba(245,158,11,0.3)",
  wayfinding: "rgba(14,165,233,0.3)",
};

export function loadMsgTemplates(companyId: string): MsgTemplate[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_msg_templates_${companyId}`) ?? "[]",
    );
  } catch {
    return [];
  }
}

function saveMsgTemplates(companyId: string, templates: MsgTemplate[]) {
  localStorage.setItem(
    `safentry_msg_templates_${companyId}`,
    JSON.stringify(templates),
  );
}

const VISITOR_CATEGORIES = [
  "all",
  "Ziyaretçi",
  "Müteahhit",
  "VIP",
  "Tedarikçi",
  "Kuryye",
  "İş Ortağı",
];

interface Props {
  companyId: string;
}

const emptyForm = (): Omit<MsgTemplate, "id" | "createdAt"> => ({
  title: "",
  scenario: "approval",
  visitorCategory: "all",
  body: "",
});

export default function MsgTemplatesTab({ companyId }: Props) {
  const [templates, setTemplates] = useState<MsgTemplate[]>(() =>
    loadMsgTemplates(companyId),
  );
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterScenario, setFilterScenario] = useState<string>("all");

  const persist = (next: MsgTemplate[]) => {
    setTemplates(next);
    saveMsgTemplates(companyId, next);
  };

  const save = () => {
    if (!form.title.trim()) {
      toast.error("Başlık boş olamaz");
      return;
    }
    if (!form.body.trim()) {
      toast.error("Mesaj içeriği boş olamaz");
      return;
    }
    if (editingId) {
      persist(
        templates.map((t) => (t.id === editingId ? { ...t, ...form } : t)),
      );
      setEditingId(null);
      toast.success("Şablon güncellendi");
    } else {
      persist([
        ...templates,
        { id: `tpl_${Date.now()}`, ...form, createdAt: Date.now() },
      ]);
      toast.success("Şablon eklendi");
    }
    setForm(emptyForm());
  };

  const startEdit = (t: MsgTemplate) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      scenario: t.scenario,
      visitorCategory: t.visitorCategory,
      body: t.body,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const remove = (id: string) => {
    persist(templates.filter((t) => t.id !== id));
    if (editingId === id) cancelEdit();
    toast.success("Şablon silindi");
  };

  const filtered =
    filterScenario === "all"
      ? templates
      : templates.filter((t) => t.scenario === filterScenario);

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(14,165,233,0.15)",
    borderRadius: 12,
    padding: 16,
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(14,165,233,0.2)",
    borderRadius: 8,
    color: "#e2e8f0",
    padding: "8px 12px",
    fontSize: 14,
    width: "100%",
  };

  const btnBase =
    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">💬 İletişim Şablonları</h2>
      <p className="text-sm text-slate-400">
        Ziyaretçi onay, red, hatırlatma ve yönlendirme mesaj şablonlarını
        yönetin. Bu şablonlar kiosk ekranlarında ve ziyaretçi bildirimlerinde
        kullanılır.
      </p>

      {/* Form */}
      <div style={cardStyle}>
        <p className="text-sm font-semibold text-teal-400 mb-3">
          {editingId ? "Şablon Düzenle" : "Yeni Şablon Ekle"}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label
              htmlFor="tpl-title"
              className="text-xs text-slate-400 mb-1 block"
            >
              Başlık
            </label>
            <input
              id="tpl-title"
              type="text"
              placeholder="Şablon başlığı"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              style={inputStyle}
              data-ocid="msg_template.title.input"
            />
          </div>
          <div>
            <label
              htmlFor="tpl-scenario"
              className="text-xs text-slate-400 mb-1 block"
            >
              Senaryo
            </label>
            <select
              id="tpl-scenario"
              value={form.scenario}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  scenario: e.target.value as MsgTemplate["scenario"],
                }))
              }
              style={inputStyle}
              data-ocid="msg_template.scenario.select"
            >
              {(
                Object.entries(SCENARIO_LABELS) as [
                  MsgTemplate["scenario"],
                  string,
                ][]
              ).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="tpl-cat"
              className="text-xs text-slate-400 mb-1 block"
            >
              Ziyaretçi Kategorisi
            </label>
            <select
              id="tpl-cat"
              value={form.visitorCategory}
              onChange={(e) =>
                setForm((f) => ({ ...f, visitorCategory: e.target.value }))
              }
              style={inputStyle}
              data-ocid="msg_template.category.select"
            >
              {VISITOR_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "Tüm Kategoriler" : c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label
            htmlFor="tpl-body"
            className="text-xs text-slate-400 mb-1 block"
          >
            Mesaj İçeriği
          </label>
          <textarea
            id="tpl-body"
            rows={4}
            placeholder="Ziyaretçiye gösterilecek mesaj..."
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            style={inputStyle}
            data-ocid="msg_template.body.textarea"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="msg_template.save.button"
            onClick={save}
            className={btnBase}
            style={{
              background: "rgba(14,165,233,0.2)",
              border: "1px solid rgba(14,165,233,0.4)",
              color: "#38bdf8",
            }}
          >
            {editingId ? "Güncelle" : "Ekle"}
          </button>
          {editingId && (
            <button
              type="button"
              data-ocid="msg_template.cancel.button"
              onClick={cancelEdit}
              className={btnBase}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8",
              }}
            >
              İptal
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", ...Object.keys(SCENARIO_LABELS)] as string[]).map((s) => (
          <button
            key={s}
            type="button"
            data-ocid="msg_template.filter.tab"
            onClick={() => setFilterScenario(s)}
            className={btnBase}
            style={{
              background:
                filterScenario === s
                  ? "rgba(14,165,233,0.2)"
                  : "rgba(255,255,255,0.05)",
              border: `1px solid ${filterScenario === s ? "rgba(14,165,233,0.5)" : "rgba(255,255,255,0.1)"}`,
              color: filterScenario === s ? "#38bdf8" : "#94a3b8",
            }}
          >
            {s === "all"
              ? "Tümü"
              : SCENARIO_LABELS[s as MsgTemplate["scenario"]]}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            paddingTop: 32,
            paddingBottom: 32,
          }}
        >
          <p className="text-slate-400">Şablon bulunamadı.</p>
        </div>
      ) : (
        <div className="space-y-3" data-ocid="msg_template.list">
          {filtered.map((t, idx) => (
            <div
              key={t.id}
              data-ocid={`msg_template.item.${idx + 1}`}
              style={{
                ...cardStyle,
                background: SCENARIO_COLORS[t.scenario],
                border: `1px solid ${SCENARIO_BORDER[t.scenario]}`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: SCENARIO_COLORS[t.scenario],
                        border: `1px solid ${SCENARIO_BORDER[t.scenario]}`,
                        color: "#e2e8f0",
                      }}
                    >
                      {SCENARIO_LABELS[t.scenario]}
                    </span>
                    {t.visitorCategory !== "all" && (
                      <span className="text-xs text-slate-400">
                        {t.visitorCategory}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-white truncate">{t.title}</p>
                  <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap line-clamp-3">
                    {t.body}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    data-ocid="msg_template.edit_button"
                    onClick={() => startEdit(t)}
                    className={btnBase}
                    style={{
                      background: "rgba(245,158,11,0.1)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: "#fbbf24",
                    }}
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    data-ocid="msg_template.delete_button"
                    onClick={() => remove(t.id)}
                    className={btnBase}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171",
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
  );
}
