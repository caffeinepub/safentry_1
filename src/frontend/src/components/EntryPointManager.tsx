import { useState } from "react";
import { toast } from "sonner";
import { getCustomCategories, getEntryPoints, saveEntryPoints } from "../store";
import type { EntryPoint } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
}

export default function EntryPointManager({ companyId }: Props) {
  const categories = getCustomCategories(companyId);
  const [points, setPoints] = useState<EntryPoint[]>(() =>
    getEntryPoints(companyId),
  );
  const [form, setForm] = useState<Omit<EntryPoint, "entryId">>({
    name: "",
    categories: [],
    instructions: "",
  });

  const reload = () => setPoints(getEntryPoints(companyId));

  const handleAdd = () => {
    if (!form.name.trim()) {
      toast.error("Giriş noktası adı zorunludur.");
      return;
    }
    const ep: EntryPoint = { entryId: generateId(), ...form };
    saveEntryPoints(companyId, [...points, ep]);
    setForm({ name: "", categories: [], instructions: "" });
    reload();
    toast.success("Giriş noktası eklendi.");
  };

  const handleDelete = (entryId: string) => {
    saveEntryPoints(
      companyId,
      points.filter((p) => p.entryId !== entryId),
    );
    reload();
    toast.success("Giriş noktası silindi.");
  };

  const toggleCat = (cat: string) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  };

  return (
    <div className="space-y-5">
      <h3 className="text-white font-semibold text-base">📍 Giriş Noktaları</h3>
      <p className="text-slate-400 text-xs">
        Kategori bazlı giriş kapılarını tanımlayın. Ziyaretçi kayıt formunda ve
        kiosk onay ekranında otomatik gösterilir.
      </p>

      {/* Add Form */}
      <div
        className="p-4 rounded-2xl space-y-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p className="text-slate-300 text-sm font-semibold">
          + Yeni Giriş Noktası
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-slate-400 text-xs mb-1">Kapı / Nokta Adı *</p>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Örn: Ana Giriş, C Kapısı..."
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Yönlendirme Notu</p>
            <input
              value={form.instructions}
              onChange={(e) =>
                setForm((f) => ({ ...f, instructions: e.target.value }))
              }
              placeholder="Güvenlik masasına bildirin..."
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            />
          </div>
        </div>
        <div>
          <p className="text-slate-400 text-xs mb-2">Geçerli Kategoriler</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCat(cat)}
                className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: form.categories.includes(cat)
                    ? "rgba(14,165,233,0.25)"
                    : "rgba(255,255,255,0.06)",
                  border: form.categories.includes(cat)
                    ? "1px solid rgba(14,165,233,0.5)"
                    : "1px solid rgba(255,255,255,0.12)",
                  color: form.categories.includes(cat) ? "#7dd3fc" : "#94a3b8",
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(90deg,#0ea5e9,#0284c7)" }}
        >
          + Ekle
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {points.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            Henüz giriş noktası tanımlanmadı.
          </p>
        ) : (
          points.map((p) => (
            <div
              key={p.entryId}
              className="flex items-start justify-between p-3 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div>
                <p className="text-white text-sm font-medium">📍 {p.name}</p>
                {p.instructions && (
                  <p className="text-slate-400 text-xs">{p.instructions}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1">
                  {p.categories.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-sky-900/40 text-sky-300"
                    >
                      {c}
                    </span>
                  ))}
                  {p.categories.length === 0 && (
                    <span className="text-slate-600 text-xs">
                      Tüm kategoriler
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(p.entryId)}
                className="px-3 py-1 rounded-lg text-xs text-red-400 shrink-0"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                Sil
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
