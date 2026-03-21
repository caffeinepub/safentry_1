import { useState } from "react";
import { toast } from "sonner";
import { getVisitorPasses, revokeVisitorPass, saveVisitorPass } from "../store";
import type { VisitorPass } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
}

export default function VisitorPassTab({ companyId }: Props) {
  const [passes, setPasses] = useState<VisitorPass[]>(() =>
    getVisitorPasses(companyId),
  );
  const [form, setForm] = useState({
    visitorName: "",
    visitorTC: "",
    validDays: 30 as 30 | 90,
  });

  const reload = () => setPasses(getVisitorPasses(companyId));

  const handleIssue = () => {
    if (!form.visitorName.trim() || !form.visitorTC.trim()) {
      toast.error("Ad Soyad ve TC alanları zorunludur.");
      return;
    }
    const now = Date.now();
    const pass: VisitorPass = {
      passId: generateId(),
      companyId,
      visitorName: form.visitorName.trim(),
      visitorTC: form.visitorTC.trim(),
      validDays: form.validDays,
      issuedAt: now,
      expiresAt: now + form.validDays * 24 * 3600000,
      qrCode: `PASS-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      isActive: true,
    };
    saveVisitorPass(companyId, pass);
    setForm({ visitorName: "", visitorTC: "", validDays: 30 });
    reload();
    toast.success(`Pass oluşturuldu: ${pass.qrCode}`);
  };

  const handleRevoke = (passId: string) => {
    revokeVisitorPass(companyId, passId);
    reload();
    toast.success("Pass iptal edildi.");
  };

  const activePasses = passes.filter(
    (p) => p.isActive && p.expiresAt > Date.now(),
  );
  const expiredPasses = passes.filter(
    (p) => !p.isActive || p.expiresAt <= Date.now(),
  );

  const dayRemaining = (expiresAt: number) => {
    const d = Math.ceil((expiresAt - Date.now()) / (24 * 3600000));
    return d > 0 ? `${d} gün kaldı` : "Süresi doldu";
  };

  return (
    <div className="space-y-6">
      <h3 className="text-white font-semibold text-base">
        🎫 Geçici Ziyaretçi Passları
      </h3>

      {/* Issue Pass Form */}
      <div
        className="p-4 rounded-2xl space-y-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p className="text-slate-300 text-sm font-semibold">
          + Yeni Pass Düzenle
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="text-slate-400 text-xs mb-1">Ad Soyad *</p>
            <input
              value={form.visitorName}
              onChange={(e) =>
                setForm((f) => ({ ...f, visitorName: e.target.value }))
              }
              placeholder="Ziyaretçi adı..."
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">TC Kimlik *</p>
            <input
              value={form.visitorTC}
              onChange={(e) =>
                setForm((f) => ({ ...f, visitorTC: e.target.value }))
              }
              placeholder="TC numarası..."
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Geçerlilik</p>
            <select
              value={form.validDays}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  validDays: Number(e.target.value) as 30 | 90,
                }))
              }
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            >
              <option value={30} className="bg-[#0f1729]">
                30 Gün
              </option>
              <option value={90} className="bg-[#0f1729]">
                90 Gün
              </option>
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleIssue}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(90deg,#0ea5e9,#0284c7)" }}
        >
          🎫 Pass Oluştur
        </button>
      </div>

      {/* Active Passes */}
      <div>
        <p className="text-slate-300 text-sm font-semibold mb-3">
          Aktif Passlar ({activePasses.length})
        </p>
        {activePasses.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">
            Aktif pass bulunmuyor.
          </p>
        ) : (
          <div className="space-y-2">
            {activePasses.map((p) => (
              <div
                key={p.passId}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: "rgba(14,165,233,0.07)",
                  border: "1px solid rgba(14,165,233,0.25)",
                }}
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {p.visitorName}
                  </p>
                  <p className="text-slate-400 text-xs">
                    TC: {p.visitorTC} &bull; Kod:{" "}
                    <span className="font-mono text-sky-400">{p.qrCode}</span>
                  </p>
                  <p className="text-slate-500 text-xs">
                    {new Date(p.expiresAt).toLocaleDateString("tr-TR")} •{" "}
                    <span className="text-amber-400">
                      {dayRemaining(p.expiresAt)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(p.passId)}
                  className="px-3 py-1 rounded-lg text-xs text-red-400"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  İptal
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired/Revoked */}
      {expiredPasses.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs font-semibold mb-2">
            Geçmiş Passlar ({expiredPasses.length})
          </p>
          <div className="space-y-1">
            {expiredPasses.slice(0, 5).map((p) => (
              <div
                key={p.passId}
                className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span className="text-slate-500 text-xs">
                  {p.visitorName} — {p.qrCode}
                </span>
                <span className="text-red-500 text-xs">
                  {p.isActive ? "Süresi doldu" : "İptal edildi"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
