import React, { useState } from "react";

interface BriefingTemplate {
  id: string;
  title: string;
  items: string[];
  active: boolean;
  createdAt: string;
}

interface BriefingRecord {
  id: string;
  visitorName: string;
  visitorId: string;
  templateId: string;
  templateTitle: string;
  signedAt: string;
  date: string;
}

interface Props {
  companyId: string;
}

const TMPL_KEY = (cid: string) => `contractorBriefingTemplates_${cid}`;
const REC_KEY = (cid: string) => `contractorBriefingRecords_${cid}`;

function loadTemplates(cid: string): BriefingTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(TMPL_KEY(cid)) || "[]");
  } catch {
    return [];
  }
}
function saveTemplates(cid: string, d: BriefingTemplate[]) {
  localStorage.setItem(TMPL_KEY(cid), JSON.stringify(d));
}

function loadRecords(cid: string): BriefingRecord[] {
  try {
    return JSON.parse(localStorage.getItem(REC_KEY(cid)) || "[]");
  } catch {
    return [];
  }
}
function saveRecords(cid: string, d: BriefingRecord[]) {
  localStorage.setItem(REC_KEY(cid), JSON.stringify(d));
}

export function hasTodaysBriefing(
  companyId: string,
  visitorId: string,
): boolean {
  const records = loadRecords(companyId);
  const today = new Date().toISOString().split("T")[0];
  return records.some((r) => r.visitorId === visitorId && r.date === today);
}

const DEFAULT_ITEMS = [
  "Kişisel koruyucu ekipman (KKE) kullanımı zorunludur",
  "İzinsiz alanlara girilmez",
  "Acil durum toplanma noktası A Kapısı önüdür",
  "İş kazası ve tehlikeli durumu derhal bildirin",
  "Sigara içmek yasaktır",
];

export default function ContractorDailyBriefingTab({ companyId }: Props) {
  const [templates, setTemplates] = useState<BriefingTemplate[]>(() =>
    loadTemplates(companyId),
  );
  const [records, setRecords] = useState<BriefingRecord[]>(() =>
    loadRecords(companyId),
  );
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [tmplTitle, setTmplTitle] = useState("");
  const [tmplItems, setTmplItems] = useState(DEFAULT_ITEMS.join("\n"));

  // Simulate sign flow
  const [showSign, setShowSign] = useState(false);
  const [signName, setSignName] = useState("");
  const [signId, setSignId] = useState("");
  const [signTemplateId, setSignTemplateId] = useState("");
  const [signConfirmed, setSignConfirmed] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const todayRecords = records.filter((r) => r.date === today);

  function addTemplate() {
    if (!tmplTitle.trim()) return;
    const items = tmplItems
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const t: BriefingTemplate = {
      id: Date.now().toString(),
      title: tmplTitle.trim(),
      items,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [t, ...templates];
    setTemplates(updated);
    saveTemplates(companyId, updated);
    setTmplTitle("");
    setTmplItems(DEFAULT_ITEMS.join("\n"));
    setShowAddTemplate(false);
  }

  function sign() {
    if (!signName.trim() || !signTemplateId || !signConfirmed) return;
    const tmpl = templates.find((t) => t.id === signTemplateId);
    if (!tmpl) return;
    const rec: BriefingRecord = {
      id: Date.now().toString(),
      visitorName: signName.trim(),
      visitorId: signId.trim() || signName.trim(),
      templateId: signTemplateId,
      templateTitle: tmpl.title,
      signedAt: new Date().toISOString(),
      date: today,
    };
    const updated = [rec, ...records];
    setRecords(updated);
    saveRecords(companyId, updated);
    setShowSign(false);
    setSignName("");
    setSignId("");
    setSignConfirmed(false);
    setSignTemplateId("");
  }

  function toggleTemplate(id: string) {
    const updated = templates.map((t) =>
      t.id === id ? { ...t, active: !t.active } : t,
    );
    setTemplates(updated);
    saveTemplates(companyId, updated);
  }

  function deleteTemplate(id: string) {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(companyId, updated);
  }

  const activeTemplate = templates.find(
    (t) => t.active && t.id === signTemplateId,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            ⛑️ Müteahhit Günlük Güvenlik Brifing
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Her giren müteahhit günlük İSG brifingini onaylayarak kaydedilir
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowSign(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              color: "#fff",
            }}
          >
            ✍️ Brifing Onayla
          </button>
          <button
            type="button"
            onClick={() => setShowAddTemplate(!showAddTemplate)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white"
          >
            + Şablon Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
          }}
        >
          <p className="text-3xl font-bold text-amber-400">
            {todayRecords.length}
          </p>
          <p className="text-slate-400 text-xs mt-1">Bugün Onaylayan</p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(14,165,233,0.25)",
          }}
        >
          <p className="text-3xl font-bold text-sky-400">{records.length}</p>
          <p className="text-slate-400 text-xs mt-1">Toplam Kayıt</p>
        </div>
        <div
          className="rounded-xl p-4 text-center"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.25)",
          }}
        >
          <p className="text-3xl font-bold text-indigo-400">
            {templates.filter((t) => t.active).length}
          </p>
          <p className="text-slate-400 text-xs mt-1">Aktif Şablon</p>
        </div>
      </div>

      {showAddTemplate && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(99,102,241,0.08)",
            border: "1px solid rgba(99,102,241,0.3)",
          }}
        >
          <p className="text-white font-medium">Yeni Brifing Şablonu</p>
          <input
            value={tmplTitle}
            onChange={(e) => setTmplTitle(e.target.value)}
            placeholder="Şablon adı *"
            className="w-full px-3 py-2 rounded-lg text-sm text-white"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          />
          <div>
            <p className="text-slate-400 text-xs mb-1">
              Brifing maddeleri (her satıra bir madde)
            </p>
            <textarea
              value={tmplItems}
              onChange={(e) => setTmplItems(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg text-sm text-white resize-none font-mono"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addTemplate}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setShowAddTemplate(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-400"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Sign modal */}
      {showSign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-lg space-y-4"
            style={{
              background: "#0f172a",
              border: "1px solid rgba(245,158,11,0.4)",
            }}
          >
            <h3 className="text-lg font-bold text-white">
              ⛑️ Günlük Güvenlik Brifing Onayı
            </h3>
            <input
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
              placeholder="Ad Soyad *"
              className="w-full px-3 py-2 rounded-lg text-sm text-white"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
            <input
              value={signId}
              onChange={(e) => setSignId(e.target.value)}
              placeholder="TC / Sicil No (opsiyonel)"
              className="w-full px-3 py-2 rounded-lg text-sm text-white"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
            <select
              value={signTemplateId}
              onChange={(e) => setSignTemplateId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white"
              style={{
                background: "#1e293b",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <option value="">-- Brifing şablonu seçin --</option>
              {templates
                .filter((t) => t.active)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
            {activeTemplate && (
              <div
                className="rounded-lg p-3 space-y-2"
                style={{
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                {activeTemplate.items.map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">⚠️</span>
                    <p className="text-slate-300 text-sm">{item}</p>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={signConfirmed}
                onChange={(e) => setSignConfirmed(e.target.checked)}
                className="accent-amber-500 mt-1"
              />
              <span className="text-slate-300 text-sm">
                Yukarıdaki güvenlik talimatlarını okudum, anladım ve uyacağımı
                taahhüt ediyorum.
              </span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sign}
                disabled={!signName.trim() || !signTemplateId || !signConfirmed}
                className="flex-1 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg,#f59e0b,#ef4444)",
                }}
              >
                Onayladım ve İmzaladım
              </button>
              <button
                type="button"
                onClick={() => setShowSign(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-400"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates */}
      <div>
        <p className="text-slate-300 text-sm font-medium mb-3">
          Brifing Şablonları ({templates.length})
        </p>
        {templates.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Henüz şablon eklenmemiş. Varsayılan şablonu oluşturmak için
            &quot;Şablon Ekle&quot; butonuna tıklayın.
          </p>
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="rounded-xl p-4"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{t.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs border ${t.active ? "text-emerald-400 bg-emerald-900/30 border-emerald-700" : "text-slate-500 bg-slate-800 border-slate-600"}`}
                    >
                      {t.active ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTemplate(t.id)}
                      className="px-2 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300"
                    >
                      {t.active ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="px-2 py-1 rounded text-xs bg-red-900/40 text-red-400"
                    >
                      Sil
                    </button>
                  </div>
                </div>
                <ul className="space-y-1">
                  {t.items.map((item) => (
                    <li
                      key={item}
                      className="text-slate-400 text-xs flex items-start gap-2"
                    >
                      <span className="text-amber-500">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's Records */}
      <div>
        <p className="text-slate-300 text-sm font-medium mb-3">
          Bugünün Onayları ({todayRecords.length})
        </p>
        {todayRecords.length === 0 ? (
          <p className="text-slate-500 text-sm">Bugün henüz onay alınmadı</p>
        ) : (
          <div className="space-y-2">
            {todayRecords.map((r) => (
              <div
                key={r.id}
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {r.visitorName}
                  </p>
                  {r.visitorId !== r.visitorName && (
                    <p className="text-slate-400 text-xs">{r.visitorId}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 text-xs">✅ Onaylandı</p>
                  <p className="text-slate-500 text-xs">
                    {new Date(r.signedAt).toLocaleTimeString("tr-TR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-slate-600 text-xs">{r.templateTitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
