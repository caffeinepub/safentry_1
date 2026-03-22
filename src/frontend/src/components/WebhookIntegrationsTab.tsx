import { useState } from "react";

interface Props {
  companyId: string;
}

type WebhookEvent =
  | "visitor_arrive"
  | "visitor_depart"
  | "visitor_register"
  | "blacklist_hit";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  enabled: boolean;
}

interface WebhookLog {
  id: string;
  timestamp: number;
  event: WebhookEvent;
  webhookName: string;
  status: "success";
}

const EVENT_LABELS: Record<WebhookEvent, string> = {
  visitor_arrive: "Ziyaretçi Gelişi",
  visitor_depart: "Ziyaretçi Çıkışı",
  visitor_register: "Kayıt Oluşturma",
  blacklist_hit: "Kara Liste Uyarısı",
};

const EVENT_COLORS: Record<WebhookEvent, string> = {
  visitor_arrive: "#22c55e",
  visitor_depart: "#f59e0b",
  visitor_register: "#0ea5e9",
  blacklist_hit: "#ef4444",
};

const PRESET_INTEGRATIONS = [
  { name: "SAP HR", icon: "🏢", desc: "İK sistemiyle entegrasyon" },
  { name: "Microsoft Teams", icon: "💬", desc: "Teams kanalına bildirim" },
  { name: "Slack", icon: "⚡", desc: "Slack workspace bildirimi" },
  { name: "HR365", icon: "👥", desc: "İK ve bordro entegrasyonu" },
  { name: "Jira", icon: "🔧", desc: "Görev ve ticket yönetimi" },
];

function getWebhooks(companyId: string): Webhook[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_webhooks_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveWebhooks(companyId: string, hooks: Webhook[]) {
  localStorage.setItem(`safentry_webhooks_${companyId}`, JSON.stringify(hooks));
}

function getLogs(companyId: string): WebhookLog[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_webhook_logs_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

export function triggerWebhookLog(companyId: string, event: WebhookEvent) {
  const hooks = getWebhooks(companyId).filter(
    (h) => h.enabled && h.events.includes(event),
  );
  if (hooks.length === 0) return;
  const logs = getLogs(companyId);
  for (const h of hooks) {
    logs.unshift({
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      event,
      webhookName: h.name,
      status: "success",
    });
  }
  localStorage.setItem(
    `safentry_webhook_logs_${companyId}`,
    JSON.stringify(logs.slice(0, 50)),
  );
}

export default function WebhookIntegrationsTab({ companyId }: Props) {
  const [webhooks, setWebhooks] = useState<Webhook[]>(() =>
    getWebhooks(companyId),
  );
  const [logs] = useState<WebhookLog[]>(() => getLogs(companyId));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    events: [] as WebhookEvent[],
  });

  function addWebhook() {
    if (!form.name || !form.url || form.events.length === 0) return;
    const w: Webhook = {
      id: Math.random().toString(36).slice(2),
      name: form.name,
      url: form.url,
      events: form.events,
      enabled: true,
    };
    const updated = [...webhooks, w];
    saveWebhooks(companyId, updated);
    setWebhooks(updated);
    setForm({ name: "", url: "", events: [] });
    setShowForm(false);
  }

  function toggleWebhook(id: string) {
    const updated = webhooks.map((h) =>
      h.id === id ? { ...h, enabled: !h.enabled } : h,
    );
    saveWebhooks(companyId, updated);
    setWebhooks(updated);
  }

  function deleteWebhook(id: string) {
    const updated = webhooks.filter((h) => h.id !== id);
    saveWebhooks(companyId, updated);
    setWebhooks(updated);
  }

  function toggleEvent(ev: WebhookEvent) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev)
        ? f.events.filter((e) => e !== ev)
        : [...f.events, ev],
    }));
  }

  return (
    <div className="space-y-6" data-ocid="integrations.section">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-bold text-lg">
          🔗 Entegrasyonlar & Webhook'lar
        </h2>
        <button
          type="button"
          data-ocid="integrations.add_webhook.button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
        >
          + Webhook Ekle
        </button>
      </div>

      {/* Add Webhook Form */}
      {showForm && (
        <div
          data-ocid="integrations.add_webhook.dialog"
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(20,184,166,0.06)",
            border: "1px solid rgba(20,184,166,0.3)",
          }}
        >
          <p className="text-white font-semibold">Yeni Webhook</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-400 text-xs mb-1">Ad</p>
              <input
                data-ocid="integrations.webhook_name.input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Webhook adı"
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#14b8a6] text-sm"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">URL</p>
              <input
                data-ocid="integrations.webhook_url.input"
                value={form.url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, url: e.target.value }))
                }
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#14b8a6] text-sm"
              />
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-2">Olaylar</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(EVENT_LABELS) as [WebhookEvent, string][]).map(
                ([ev, label]) => (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => toggleEvent(ev)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: form.events.includes(ev)
                        ? `${EVENT_COLORS[ev]}25`
                        : "rgba(255,255,255,0.07)",
                      border: form.events.includes(ev)
                        ? `1px solid ${EVENT_COLORS[ev]}60`
                        : "1px solid rgba(255,255,255,0.15)",
                      color: form.events.includes(ev)
                        ? EVENT_COLORS[ev]
                        : "#94a3b8",
                    }}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              data-ocid="integrations.save_webhook.button"
              onClick={addWebhook}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
            >
              Kaydet
            </button>
            <button
              type="button"
              data-ocid="integrations.cancel_webhook.cancel_button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length > 0 && (
        <div className="space-y-3">
          <p className="text-slate-400 text-sm font-medium">
            Aktif Webhook'lar
          </p>
          {webhooks.map((h, i) => (
            <div
              key={h.id}
              data-ocid={`integrations.webhook.item.${i + 1}`}
              className="p-4 rounded-2xl flex items-center justify-between gap-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">
                    {h.name}
                  </span>
                  {h.events.map((ev) => (
                    <span
                      key={ev}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: `${EVENT_COLORS[ev]}20`,
                        color: EVENT_COLORS[ev],
                      }}
                    >
                      {EVENT_LABELS[ev]}
                    </span>
                  ))}
                </div>
                <p className="text-slate-500 text-xs font-mono truncate mt-0.5">
                  {h.url}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleWebhook(h.id)}
                  className="px-3 py-1 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: h.enabled
                      ? "rgba(34,197,94,0.15)"
                      : "rgba(255,255,255,0.07)",
                    border: h.enabled
                      ? "1px solid rgba(34,197,94,0.4)"
                      : "1px solid rgba(255,255,255,0.15)",
                    color: h.enabled ? "#4ade80" : "#94a3b8",
                  }}
                >
                  {h.enabled ? "Aktif" : "Pasif"}
                </button>
                <button
                  type="button"
                  data-ocid={`integrations.delete_webhook.delete_button.${i + 1}`}
                  onClick={() => deleteWebhook(h.id)}
                  className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded"
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {webhooks.length === 0 && !showForm && (
        <div
          data-ocid="integrations.webhooks.empty_state"
          className="p-8 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-slate-400">Henüz webhook eklenmemiş.</p>
          <p className="text-slate-500 text-sm mt-1">
            Ziyaretçi olaylarında harici sistemleri tetikleyin.
          </p>
        </div>
      )}

      {/* Preset Integrations */}
      <div>
        <p className="text-slate-400 text-sm font-medium mb-3">
          Hazır Entegrasyonlar
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PRESET_INTEGRATIONS.map((p) => (
            <div
              key={p.name}
              className="p-4 rounded-2xl flex items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-2xl">{p.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-white text-sm font-semibold">
                    {p.name}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-semibold"
                    style={{
                      background: "rgba(245,158,11,0.2)",
                      color: "#f59e0b",
                    }}
                  >
                    Yakında
                  </span>
                </div>
                <p className="text-slate-500 text-xs">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Log */}
      <div>
        <p className="text-slate-400 text-sm font-medium mb-3">
          📋 Olay Logu (Son 20)
        </p>
        {logs.length === 0 ? (
          <div
            className="p-6 rounded-2xl text-center"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p className="text-slate-500 text-sm">Henüz tetiklenen olay yok.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 20).map((log, i) => (
              <div
                key={log.id}
                data-ocid={`integrations.log.item.${i + 1}`}
                className="px-4 py-3 rounded-xl flex items-center justify-between gap-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-sm">✅</span>
                  <span className="text-white text-sm font-medium">
                    {log.webhookName}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-xs"
                    style={{
                      background: `${EVENT_COLORS[log.event]}20`,
                      color: EVENT_COLORS[log.event],
                    }}
                  >
                    {EVENT_LABELS[log.event]}
                  </span>
                </div>
                <span className="text-slate-500 text-xs whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString("tr-TR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
