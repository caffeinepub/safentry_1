import { useState } from "react";
import { toast } from "sonner";

export interface VisitorTag {
  id: string;
  name: string;
  color: string;
}

const TAG_COLORS = [
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
  "#10b981",
  "#f97316",
  "#06b6d4",
  "#84cc16",
];

export function getVisitorTags(companyId: string): VisitorTag[] {
  const raw = localStorage.getItem(`safentry_visitor_tags_${companyId}`);
  return raw ? JSON.parse(raw) : [];
}

export function saveVisitorTags(companyId: string, tags: VisitorTag[]) {
  localStorage.setItem(
    `safentry_visitor_tags_${companyId}`,
    JSON.stringify(tags),
  );
}

export default function VisitorTagsTab({
  companyId,
}: {
  companyId: string;
}) {
  const [tags, setTags] = useState<VisitorTag[]>(() =>
    getVisitorTags(companyId),
  );
  const [form, setForm] = useState({ name: "", color: TAG_COLORS[0] });
  const [editId, setEditId] = useState<string | null>(null);

  const save = () => {
    if (!form.name.trim()) {
      toast.error("Etiket adı gereklidir");
      return;
    }
    let updated: VisitorTag[];
    if (editId) {
      updated = tags.map((t) =>
        t.id === editId ? { ...t, name: form.name, color: form.color } : t,
      );
      setEditId(null);
    } else {
      updated = [
        ...tags,
        {
          id: `tag_${Date.now()}`,
          name: form.name.trim(),
          color: form.color,
        },
      ];
    }
    setTags(updated);
    saveVisitorTags(companyId, updated);
    setForm({ name: "", color: TAG_COLORS[0] });
    toast.success(editId ? "Etiket güncellendi" : "Etiket eklendi");
  };

  const remove = (id: string) => {
    const updated = tags.filter((t) => t.id !== id);
    setTags(updated);
    saveVisitorTags(companyId, updated);
    toast.success("Etiket silindi");
  };

  const edit = (tag: VisitorTag) => {
    setEditId(tag.id);
    setForm({ name: tag.name, color: tag.color });
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-xl font-bold text-white mb-1">
        🏷️ Ziyaretçi Etiketleri
      </h2>
      <p className="text-slate-400 text-sm mb-6">
        Ziyaretçilere özel etiketler oluşturun. Bu etiketler kayıt formunda
        seçilebilir ve ziyaretçi listesinde filtre olarak kullanılabilir.
      </p>

      {/* Create / Edit Form */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <h3 className="text-white font-semibold mb-4">
          {editId ? "Etiketi Düzenle" : "Yeni Etiket"}
        </h3>
        <div className="flex gap-3 mb-4">
          <input
            data-ocid="visitor_tags.name.input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Etiket adı (ör: Basın, Denetçi, Stratejik Ortak)"
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="mb-4">
          <p className="text-slate-400 text-sm mb-2">Renk Seç</p>
          <div className="flex gap-2 flex-wrap">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color }))}
                className="w-8 h-8 rounded-full transition-all"
                style={{
                  background: color,
                  outline:
                    form.color === color
                      ? "3px solid white"
                      : "3px solid transparent",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>
        {/* Preview */}
        {form.name && (
          <div className="mb-4">
            <p className="text-slate-400 text-xs mb-1">Önizleme:</p>
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
              style={{ background: form.color }}
            >
              {form.name}
            </span>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid="visitor_tags.save.button"
            onClick={save}
            className="px-5 py-2 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
          >
            {editId ? "Güncelle" : "Ekle"}
          </button>
          {editId && (
            <button
              type="button"
              data-ocid="visitor_tags.cancel.button"
              onClick={() => {
                setEditId(null);
                setForm({ name: "", color: TAG_COLORS[0] });
              }}
              className="px-5 py-2 rounded-xl text-slate-400 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              İptal
            </button>
          )}
        </div>
      </div>

      {/* Tags List */}
      {tags.length === 0 ? (
        <div
          data-ocid="visitor_tags.empty_state"
          className="text-center py-12 text-slate-500"
        >
          <div className="text-4xl mb-3">🏷️</div>
          <p>Henüz etiket oluşturulmadı.</p>
          <p className="text-xs mt-1">Yukarıdan ilk etiketi oluşturun.</p>
        </div>
      ) : (
        <div data-ocid="visitor_tags.list" className="space-y-2">
          {tags.map((tag, i) => (
            <div
              key={tag.id}
              data-ocid={`visitor_tags.item.${i + 1}`}
              className="flex items-center justify-between p-4 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ background: tag.color }}
                />
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ background: tag.color }}
                >
                  {tag.name}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-ocid={`visitor_tags.edit_button.${i + 1}`}
                  onClick={() => edit(tag)}
                  className="text-slate-400 hover:text-white text-sm px-3 py-1 rounded-lg transition-all"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  ✏️ Düzenle
                </button>
                <button
                  type="button"
                  data-ocid={`visitor_tags.delete_button.${i + 1}`}
                  onClick={() => remove(tag.id)}
                  className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded-lg transition-all"
                  style={{ background: "rgba(239,68,68,0.1)" }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
