import { useState } from "react";
import { toast } from "sonner";

export interface ChecklistEntry {
  id: string;
  companyId: string;
  staffId: string;
  staffName: string;
  type: "start" | "end";
  items: { label: string; checked: boolean }[];
  completedAt: number;
  notes: string;
}

const DEFAULT_ITEMS = [
  "Kapı kilitleri kontrol edildi",
  "Kameralar çalışıyor",
  "Alarm sistemi aktif",
  "Misafir defteri güncellendi",
  "Rozet sayımı yapıldı",
  "Otopark kontrol edildi",
];

function getItems(companyId: string): string[] {
  try {
    const stored = localStorage.getItem(
      `safentry_checklist_items_${companyId}`,
    );
    if (stored) return JSON.parse(stored);
  } catch {
    /**/
  }
  return DEFAULT_ITEMS;
}

function saveItems(companyId: string, items: string[]) {
  localStorage.setItem(
    `safentry_checklist_items_${companyId}`,
    JSON.stringify(items),
  );
}

export function getChecklistHistory(companyId: string): ChecklistEntry[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_checklists_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

export function saveChecklistEntry(entry: ChecklistEntry) {
  const list = getChecklistHistory(entry.companyId);
  localStorage.setItem(
    `safentry_checklists_${entry.companyId}`,
    JSON.stringify([entry, ...list].slice(0, 200)),
  );
}

interface ChecklistModalProps {
  companyId: string;
  staffId: string;
  staffName: string;
  type: "start" | "end";
  onClose: () => void;
}

export function ChecklistModal({
  companyId,
  staffId,
  staffName,
  type,
  onClose,
}: ChecklistModalProps) {
  const itemLabels = getItems(companyId);
  const [items, setItems] = useState(
    itemLabels.map((label) => ({ label, checked: false })),
  );
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const allChecked = items.every((i) => i.checked);
  const unchecked = items.filter((i) => !i.checked);

  const handleSubmit = () => {
    const entry: ChecklistEntry = {
      id: Math.random().toString(36).substring(2, 9),
      companyId,
      staffId,
      staffName,
      type,
      items,
      completedAt: Date.now(),
      notes,
    };
    saveChecklistEntry(entry);
    setSubmitted(true);
    toast.success("Denetim çeklistesi kaydedildi");
    setTimeout(onClose, 1500);
  };

  if (submitted) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.7)" }}
      >
        <div
          className="w-96 rounded-2xl p-8 text-center"
          style={{
            background: "#111827",
            border: "1.5px solid rgba(34,197,94,0.4)",
          }}
        >
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-white font-bold text-lg">
            Checklist Kaydedildi!
          </h3>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{
          background: "#111827",
          border: "1.5px solid rgba(14,165,233,0.3)",
        }}
        data-ocid="checklist.modal"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-bold text-lg">
              {type === "start"
                ? "🟢 Vardiya Başlangıç Kontrolü"
                : "🔴 Vardiya Bitiş Kontrolü"}
            </h3>
            <p className="text-slate-400 text-sm mt-1">{staffName}</p>
          </div>
          <button
            type="button"
            data-ocid="checklist.close_button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl px-2"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {items.map((item, idx) => (
            <label
              key={item.label}
              className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
              style={{
                background: item.checked
                  ? "rgba(34,197,94,0.08)"
                  : "rgba(255,255,255,0.04)",
                border: `1px solid ${item.checked ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}`,
              }}
            >
              <input
                type="checkbox"
                data-ocid={`checklist.checkbox.${idx + 1}`}
                checked={item.checked}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((it, i) =>
                      i === idx ? { ...it, checked: e.target.checked } : it,
                    ),
                  )
                }
                className="w-4 h-4 accent-teal-400"
              />
              <span
                className={`text-sm ${item.checked ? "text-teal-300 line-through opacity-70" : "text-slate-200"}`}
              >
                {item.label}
              </span>
            </label>
          ))}
        </div>

        {!allChecked && unchecked.length > 0 && (
          <div
            className="px-4 py-3 rounded-xl mb-4 text-sm"
            style={{
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.3)",
              color: "#fbbf24",
            }}
            data-ocid="checklist.warning_state"
          >
            ⚠️ {unchecked.length} madde tamamlanmadı:{" "}
            {unchecked.map((i) => i.label).join(", ")}
          </div>
        )}

        <textarea
          data-ocid="checklist.notes.textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ek notlar (opsiyonel)..."
          rows={2}
          className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9] mb-4 resize-none"
        />

        <div className="flex gap-3">
          <button
            type="button"
            data-ocid="checklist.cancel_button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-slate-400 hover:text-white transition-colors text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            İptal
          </button>
          <button
            type="button"
            data-ocid="checklist.submit_button"
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{
              background: allChecked
                ? "rgba(34,197,94,0.25)"
                : "rgba(245,158,11,0.25)",
              border: `1px solid ${allChecked ? "rgba(34,197,94,0.5)" : "rgba(245,158,11,0.5)"}`,
            }}
          >
            {allChecked ? "✅ Tamamlandı, Kaydet" : "⚠️ Eksiklerle Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Admin panel checklist history view
export function ChecklistHistoryPanel({ companyId }: { companyId: string }) {
  const [history, setHistory] = useState(() => getChecklistHistory(companyId));
  const [newItem, setNewItem] = useState("");
  const [customItems, setCustomItems] = useState(() => getItems(companyId));

  const addItem = () => {
    if (!newItem.trim()) return;
    const next = [...customItems, newItem.trim()];
    setCustomItems(next);
    saveItems(companyId, next);
    setNewItem("");
    toast.success("Madde eklendi");
  };

  const removeItem = (idx: number) => {
    const next = customItems.filter((_, i) => i !== idx);
    setCustomItems(next);
    saveItems(companyId, next);
  };

  const refreshHistory = () => setHistory(getChecklistHistory(companyId));

  return (
    <div className="space-y-6" data-ocid="checklists.panel">
      <div>
        <h4 className="text-white font-semibold mb-3">
          📝 Checklist Maddeleri
        </h4>
        <div className="space-y-2 mb-3">
          {customItems.map((item, idx) => (
            <div
              key={item}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className="text-slate-200 text-sm">{item}</span>
              <button
                type="button"
                data-ocid={`checklists.remove.button.${idx + 1}`}
                onClick={() => removeItem(idx)}
                className="text-red-400 hover:text-red-300 text-xs px-2"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            data-ocid="checklists.add.input"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            placeholder="Yeni madde ekle..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]"
          />
          <button
            type="button"
            data-ocid="checklists.add.button"
            onClick={addItem}
            className="px-4 py-2.5 rounded-xl font-medium text-white text-sm transition-opacity hover:opacity-80"
            style={{
              background: "rgba(14,165,233,0.25)",
              border: "1px solid rgba(14,165,233,0.4)",
            }}
          >
            Ekle
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold">📋 Geçmiş Kontroller</h4>
          <button
            type="button"
            onClick={refreshHistory}
            className="text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-lg"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Yenile
          </button>
        </div>
        {history.length === 0 ? (
          <div
            className="text-slate-500 text-sm text-center py-8"
            data-ocid="checklists.empty_state"
          >
            Henüz checklist kaydı yok
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="px-4 py-3 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{entry.type === "start" ? "🟢" : "🔴"}</span>
                    <span className="text-white text-sm font-medium">
                      {entry.staffName}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background:
                          entry.type === "start"
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(239,68,68,0.15)",
                        color: entry.type === "start" ? "#4ade80" : "#f87171",
                      }}
                    >
                      {entry.type === "start" ? "Başlangıç" : "Bitiş"}
                    </span>
                  </div>
                  <span className="text-slate-500 text-xs">
                    {new Date(entry.completedAt).toLocaleString("tr-TR")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {entry.items.map((item) => (
                    <span
                      key={item.label}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: item.checked
                          ? "rgba(34,197,94,0.1)"
                          : "rgba(239,68,68,0.1)",
                        color: item.checked ? "#4ade80" : "#f87171",
                      }}
                    >
                      {item.checked ? "✓" : "✗"} {item.label}
                    </span>
                  ))}
                </div>
                {entry.notes && (
                  <p className="text-slate-400 text-xs mt-2">
                    📝 {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
