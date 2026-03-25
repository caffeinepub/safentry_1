import React, { useState } from "react";

interface PolicyVersion {
  id: string;
  version: string;
  title: string;
  content: string;
  effectiveDate: string;
  createdAt: string;
  isActive: boolean;
  approvalCount: number;
  requiresReApproval: boolean;
}

const STORAGE_KEY = (cid: string) => `safentry_policyversions_${cid}`;
const _APPROVAL_KEY = (cid: string) => `safentry_policyapprovals_${cid}`;

function load(cid: string): PolicyVersion[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY(cid)) || "[]");
    if (saved.length === 0) {
      return [
        {
          id: "v1",
          version: "1.0",
          title: "Ziyaretçi Ziyaret Politikası",
          content:
            "Bu tesise giriş yapan tüm ziyaretçiler aşağıdaki kurallara uymak zorundadır:\n\n1. Geçerli kimlik belgesi ibraz edilmesi zorunludur.\n2. Ziyaret süresi en fazla 4 saattir.\n3. Kısıtlı alanlara yetkisiz giriş yasaktır.\n4. Tüm ziyaretçiler güvenlik görevlisine eşlik etmelidir.\n5. Fotoğraf ve video çekimi için önceden izin alınmalıdır.",
          effectiveDate: new Date(
            Date.now() - 90 * 86400000,
          ).toLocaleDateString("tr-TR"),
          createdAt: new Date(Date.now() - 90 * 86400000).toLocaleDateString(
            "tr-TR",
          ),
          isActive: false,
          approvalCount: 47,
          requiresReApproval: false,
        },
        {
          id: "v2",
          version: "2.0",
          title: "Ziyaretçi Ziyaret Politikası",
          content:
            "Bu tesise giriş yapan tüm ziyaretçiler aşağıdaki güncellenmiş kurallara uymak zorundadır:\n\n1. Geçerli kimlik belgesi ibraz edilmesi zorunludur.\n2. Ziyaret süresi en fazla 4 saattir.\n3. Kısıtlı alanlara yetkisiz giriş yasaktır.\n4. Tüm ziyaretçiler güvenlik görevlisine eşlik etmelidir.\n5. Fotoğraf ve video çekimi için önceden izin alınmalıdır.\n6. Kişisel veriler KVKK kapsamında işlenmektedir.\n7. Sağlık beyanı formu doldurulması zorunludur.",
          effectiveDate: new Date().toLocaleDateString("tr-TR"),
          createdAt: new Date().toLocaleDateString("tr-TR"),
          isActive: true,
          approvalCount: 12,
          requiresReApproval: true,
        },
      ];
    }
    return saved;
  } catch {
    return [];
  }
}

function save(cid: string, data: PolicyVersion[]) {
  localStorage.setItem(STORAGE_KEY(cid), JSON.stringify(data));
}

export default function PolicyVersionTab({ companyId }: { companyId: string }) {
  const [versions, setVersions] = useState<PolicyVersion[]>(() =>
    load(companyId),
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    version: "",
    title: "",
    content: "",
    effectiveDate: "",
    requiresReApproval: true,
  });
  const [selected, setSelected] = useState<PolicyVersion | null>(null);
  const [saved, setSaved] = useState(false);

  function addVersion() {
    if (!form.version || !form.title || !form.content) return;
    const newV: PolicyVersion = {
      id: Date.now().toString(),
      ...form,
      createdAt: new Date().toLocaleDateString("tr-TR"),
      isActive: false,
      approvalCount: 0,
    };
    const updated = [newV, ...versions];
    setVersions(updated);
    save(companyId, updated);
    setForm({
      version: "",
      title: "",
      content: "",
      effectiveDate: "",
      requiresReApproval: true,
    });
    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function activate(id: string) {
    const updated = versions.map((v) => ({
      ...v,
      isActive: v.id === id,
    }));
    setVersions(updated);
    save(companyId, updated);
  }

  const active = versions.find((v) => v.isActive);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            📜 Ziyaret Politikası Versiyonlama
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Politika güncellenince eski onaylar geçersiz sayılır;
            ziyaretçilerden yeni onay istenir.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl font-semibold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}
        >
          + Yeni Versiyon
        </button>
      </div>

      {saved && (
        <div
          className="p-3 rounded-xl text-sm text-green-300"
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          ✅ Yeni politika versiyonu oluşturuldu.
        </div>
      )}

      {active && (
        <div
          className="p-4 rounded-2xl"
          style={{
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.3)",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sky-400 font-bold">
                  Aktif Versiyon: v{active.version}
                </span>
                {active.requiresReApproval && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Yeniden onay gerektirir
                  </span>
                )}
              </div>
              <div className="text-white font-semibold">{active.title}</div>
              <div className="text-slate-400 text-sm mt-1">
                Yürürlük: {active.effectiveDate} · {active.approvalCount} onay
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(active)}
              className="text-sky-400 text-sm underline"
            >
              Görüntüle
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div
          className="p-5 rounded-2xl space-y-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h3 className="text-white font-semibold">Yeni Politika Versiyonu</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-slate-400 text-xs block mb-1">
                Versiyon No *
              </span>
              <input
                className="w-full px-3 py-2 rounded-lg text-white text-sm"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                value={form.version}
                onChange={(e) =>
                  setForm((f) => ({ ...f, version: e.target.value }))
                }
                placeholder="3.0"
              />
            </div>
            <div>
              <span className="text-slate-400 text-xs block mb-1">
                Yürürlük Tarihi
              </span>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg text-white text-sm"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                value={form.effectiveDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, effectiveDate: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-1">Başlık *</span>
            <input
              className="w-full px-3 py-2 rounded-lg text-white text-sm"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div>
            <span className="text-slate-400 text-xs block mb-1">
              Politika İçeriği *
            </span>
            <textarea
              rows={6}
              className="w-full px-3 py-2 rounded-lg text-white text-sm"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reapproval"
              checked={form.requiresReApproval}
              onChange={(e) =>
                setForm((f) => ({ ...f, requiresReApproval: e.target.checked }))
              }
              className="accent-sky-500"
            />
            <label htmlFor="reapproval" className="text-slate-300 text-sm">
              Eski onaylı ziyaretçilerden yeniden onay iste
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addVersion}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              }}
            >
              Oluştur
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-slate-300 text-sm"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-white font-semibold">Tüm Versiyonlar</h3>
        {versions.map((v) => (
          <div
            key={v.id}
            className="p-4 rounded-2xl flex items-center gap-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${v.isActive ? "rgba(14,165,233,0.4)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">v{v.version}</span>
                {v.isActive && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30">
                    Aktif
                  </span>
                )}
                {v.requiresReApproval && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Yeniden Onay
                  </span>
                )}
              </div>
              <div className="text-slate-400 text-sm">
                {v.title} · {v.createdAt} · {v.approvalCount} onay
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(v)}
                className="px-3 py-1.5 rounded-lg text-sky-400 text-xs"
                style={{ background: "rgba(14,165,233,0.1)" }}
              >
                Görüntüle
              </button>
              {!v.isActive && (
                <button
                  type="button"
                  onClick={() => activate(v.id)}
                  className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  }}
                >
                  Aktif Yap
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelected(null)}
          onKeyDown={(e) => e.key === "Escape" && setSelected(null)}
          role="presentation"
        >
          <div
            className="rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            style={{
              background: "#1e293b",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {selected.title}
                </h3>
                <p className="text-slate-400 text-sm">
                  Versiyon {selected.version} · {selected.effectiveDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
              {selected.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
