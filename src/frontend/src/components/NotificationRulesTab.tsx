import React, { useState } from "react";
import { toast } from "sonner";
import type { NotificationRule } from "../types";
import { generateId } from "../utils";

const TRIGGER_TYPES: {
  value: NotificationRule["trigger"];
  label: string;
  hasValue?: string;
}[] = [
  { value: "vip_entry", label: "VIP Ziyaretçi Girişi" },
  {
    value: "ungreeted_N_min",
    label: "Karşılanmayan Ziyaretçi",
    hasValue: "dakika",
  },
  { value: "permit_expiry_soon", label: "Süresi Dolacak İzin" },
  { value: "blacklist_hit", label: "Kara Liste Eşleşmesi" },
  { value: "capacity_threshold", label: "Kapasite Eşiği", hasValue: "%" },
];

const TARGET_OPTIONS: { value: NotificationRule["target"]; label: string }[] = [
  { value: "admin", label: "Yönetici" },
  { value: "security", label: "Güvenlik" },
  { value: "all", label: "Tümü" },
];

interface Props {
  companyId: string;
  rules: NotificationRule[];
  onSave: (r: NotificationRule) => void;
  onDelete: (id: string) => void;
  onReload: () => void;
  onTestRule: (r: NotificationRule) => void;
}

export default function NotificationRulesTab({
  companyId,
  rules,
  onSave,
  onDelete,
  onReload,
  onTestRule,
}: Props) {
  const [editing, setEditing] = useState<NotificationRule | null>(null);

  const startNew = () =>
    setEditing({
      id: generateId(),
      companyId,
      trigger: "vip_entry",
      triggerValue: undefined,
      target: "all",
      message: "",
      enabled: true,
    });

  const save = () => {
    if (!editing) return;
    if (!editing.message.trim()) {
      toast.error("Bildirim mesajı boş olamaz");
      return;
    }
    onSave(editing);
    setEditing(null);
    onReload();
    toast.success("Kural kaydedildi");
  };

  const selectedTrigger = TRIGGER_TYPES.find(
    (t) => t.value === editing?.trigger,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-white font-bold text-lg">
            🔔 Gelişmiş Bildirim Kuralları
          </h2>
          <p className="text-slate-400 text-sm">
            Koşul bazlı otomatik bildirim kuralları tanımlayın
          </p>
        </div>
        <button
          type="button"
          data-ocid="notif_rules.open_modal_button"
          onClick={startNew}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Yeni Kural
        </button>
      </div>

      {/* Trigger type legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {TRIGGER_TYPES.map((t) => (
          <div
            key={t.value}
            className="p-3 rounded-xl text-sm"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <p className="text-slate-300 font-medium">{t.label}</p>
            {t.hasValue && (
              <p className="text-slate-500 text-xs mt-0.5">
                Eşik değeri: {t.hasValue}
              </p>
            )}
          </div>
        ))}
      </div>

      {rules.length === 0 ? (
        <div
          data-ocid="notif_rules.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-5xl mb-3">🔔</div>
          <p className="text-sm">Henüz bildirim kuralı tanımlanmadı</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {rules.map((rule, idx) => {
            const triggerInfo = TRIGGER_TYPES.find(
              (t) => t.value === rule.trigger,
            );
            return (
              <div
                key={rule.id}
                data-ocid={`notif_rules.item.${idx + 1}`}
                className="p-4 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    rule.enabled
                      ? "rgba(14,165,233,0.25)"
                      : "rgba(255,255,255,0.08)"
                  }`,
                  opacity: rule.enabled ? 1 : 0.6,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: "rgba(14,165,233,0.15)",
                          color: "#38bdf8",
                        }}
                      >
                        {triggerInfo?.label ?? rule.trigger}
                        {rule.triggerValue != null &&
                          ` > ${rule.triggerValue}${triggerInfo?.hasValue ?? ""}`}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          background: "rgba(168,85,247,0.15)",
                          color: "#c084fc",
                        }}
                      >
                        ➔{" "}
                        {TARGET_OPTIONS.find((t) => t.value === rule.target)
                          ?.label ?? rule.target}
                      </span>
                    </div>
                    <p className="text-white text-sm">{rule.message}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      data-ocid={`notif_rules.toggle.${idx + 1}`}
                      onClick={() => {
                        onSave({ ...rule, enabled: !rule.enabled });
                        onReload();
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{
                        background: rule.enabled
                          ? "rgba(34,197,94,0.15)"
                          : "rgba(255,255,255,0.07)",
                        color: rule.enabled ? "#4ade80" : "#64748b",
                        border: `1px solid ${
                          rule.enabled
                            ? "rgba(34,197,94,0.3)"
                            : "rgba(255,255,255,0.1)"
                        }`,
                      }}
                    >
                      {rule.enabled ? "Aktif" : "Pasif"}
                    </button>
                    <button
                      type="button"
                      data-ocid={`notif_rules.secondary_button.${idx + 1}`}
                      onClick={() => onTestRule(rule)}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
                      style={{
                        background: "rgba(245,158,11,0.15)",
                        color: "#fbbf24",
                        border: "1px solid rgba(245,158,11,0.3)",
                      }}
                    >
                      🧪 Test
                    </button>
                    <button
                      type="button"
                      data-ocid={`notif_rules.edit_button.${idx + 1}`}
                      onClick={() => setEditing(rule)}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
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
                      data-ocid={`notif_rules.delete_button.${idx + 1}`}
                      onClick={() => {
                        onDelete(rule.id);
                        onReload();
                        toast.success("Kural silindi");
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs"
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
            );
          })}
        </div>
      )}

      {/* Editor modal */}
      {editing && (
        <div
          data-ocid="notif_rules.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Bildirim Kuralı</h3>
              <button
                type="button"
                data-ocid="notif_rules.close_button"
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-xs mb-1">Tetikleyici</p>
                <select
                  data-ocid="notif_rules.select"
                  value={editing.trigger}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      trigger: e.target.value as NotificationRule["trigger"],
                      triggerValue: undefined,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    outline: "none",
                  }}
                >
                  {TRIGGER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTrigger?.hasValue && (
                <div>
                  <p className="text-slate-400 text-xs mb-1">
                    Eşik Değeri ({selectedTrigger.hasValue})
                  </p>
                  <input
                    data-ocid="notif_rules.input"
                    type="number"
                    value={editing.triggerValue ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        triggerValue: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder={selectedTrigger.hasValue === "%" ? "85" : "5"}
                    className="w-full px-4 py-2.5 rounded-xl text-white text-sm"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              <div>
                <p className="text-slate-400 text-xs mb-1">Bildirim Hedefi</p>
                <select
                  value={editing.target}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      target: e.target.value as NotificationRule["target"],
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl text-white text-sm"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    outline: "none",
                  }}
                >
                  {TARGET_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1">Bildirim Mesajı</p>
                <textarea
                  data-ocid="notif_rules.textarea"
                  value={editing.message}
                  onChange={(e) =>
                    setEditing({ ...editing, message: e.target.value })
                  }
                  placeholder="Örn: VIP ziyaretçi giriş yaptı, lütfen karşılayın"
                  rows={3}
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
                  checked={editing.enabled}
                  onChange={(e) =>
                    setEditing({ ...editing, enabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded accent-sky-500"
                />
                <span className="text-slate-300 text-sm">
                  Kuralı Etkinleştir
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                data-ocid="notif_rules.cancel_button"
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
                data-ocid="notif_rules.save_button"
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
