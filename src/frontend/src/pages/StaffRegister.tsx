import { useState } from "react";
import { useLanguage } from "../LanguageContext";
import { StaffRole } from "../backend";
import { useActor } from "../hooks/useActor";
import { t } from "../i18n";
import { lookupInviteCode, saveStaff } from "../store";
import type { AppScreen, Staff } from "../types";
import { copyToClipboard, generateStaffId } from "../utils";

interface Props {
  onNavigate: (s: AppScreen) => void;
}

export default function StaffRegister({ onNavigate }: Props) {
  const { lang } = useLanguage();
  const { actor } = useActor();
  const [form, setForm] = useState({
    name: "",
    companyId: "",
    role: "staff" as Staff["role"],
    inviteCode: "",
  });
  const [result, setResult] = useState<Staff | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name) return;
    let companyId = form.companyId;
    if (form.inviteCode) {
      const cid = lookupInviteCode(form.inviteCode);
      if (!cid) {
        setError("Geçersiz davet kodu.");
        return;
      }
      companyId = cid;
    }
    const staff: Staff = {
      staffId: generateStaffId(),
      companyId,
      name: form.name,
      role: form.role,
      availabilityStatus: "available",
      createdAt: Date.now(),
    };
    setLoading(true);
    saveStaff(staff);
    if (actor) {
      try {
        const backendRole =
          form.role === "admin" ? StaffRole.admin : StaffRole.security;
        await actor.registerStaff(
          staff.staffId,
          companyId,
          staff.name,
          backendRole,
        );
      } catch (_e) {
        // silent failure — localStorage already saved
      }
    }
    setLoading(false);
    setResult(staff);
  };

  const copy = () => {
    copyToClipboard(result!.staffId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (result)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0f1e" }}
      >
        <div
          className="w-full max-w-md p-8 rounded-2xl border border-[#f59e0b]/30"
          style={{
            background: "rgba(245,158,11,0.05)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-2xl font-bold text-white">{result.name}</h2>
          </div>
          <div className="p-4 rounded-xl bg-white/10 mb-6">
            <div className="text-slate-400 text-xs mb-1">
              {t(lang, "yourStaffId")}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-white text-2xl tracking-widest">
                {result.staffId}
              </span>
              <button
                type="button"
                data-ocid="staff_register.copy_staffid.button"
                onClick={copy}
                className="text-[#f59e0b] text-sm"
              >
                {copied ? t(lang, "copied") : t(lang, "copy")}
              </button>
            </div>
          </div>
          {result.companyId && (
            <div className="text-slate-400 text-sm mb-6 text-center">
              Şirket Kodu:{" "}
              <span className="text-white font-mono">{result.companyId}</span>
            </div>
          )}
          <button
            type="button"
            data-ocid="staff_register.goto_login.button"
            onClick={() => onNavigate("staff-login")}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
          >
            Giriş Yap
          </button>
        </div>
      </div>
    );

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0a0f1e" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl border border-white/10"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={() => onNavigate("welcome")}
          data-ocid="staff_register.back.button"
          className="text-slate-400 hover:text-white text-sm mb-6"
        >
          ← {t(lang, "backToHome")}
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">
          {t(lang, "newStaff")}
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-slate-300 text-sm mb-1 block">
              {t(lang, "name")}
            </p>
            <input
              id="sr-name"
              data-ocid="staff_register.name.input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#f59e0b]"
            />
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-1 block">
              {t(lang, "role")}
            </p>
            <select
              id="sr-role"
              data-ocid="staff_register.role.select"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value as Staff["role"],
                }))
              }
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none"
            >
              <option value="admin" className="bg-[#0f1729]">
                {t(lang, "admin")}
              </option>
              <option value="receptionist" className="bg-[#0f1729]">
                {t(lang, "receptionist")}
              </option>
              <option value="staff" className="bg-[#0f1729]">
                {t(lang, "staff")}
              </option>
            </select>
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-1 block">
              {t(lang, "companyId")} (opsiyonel)
            </p>
            <input
              id="sr-companyid"
              data-ocid="staff_register.companyid.input"
              value={form.companyId}
              onChange={(e) =>
                setForm((f) => ({ ...f, companyId: e.target.value }))
              }
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none font-mono"
              placeholder="11 haneli şirket kodu"
            />
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-1 block">
              {t(lang, "inviteCode")} (opsiyonel)
            </p>
            <input
              id="sr-invitecode"
              data-ocid="staff_register.invitecode.input"
              value={form.inviteCode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  inviteCode: e.target.value.toUpperCase(),
                }))
              }
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none font-mono"
              placeholder="XXXXXX"
            />
          </div>
          {error && (
            <p
              data-ocid="staff_register.error_state"
              className="text-red-400 text-sm"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            data-ocid="staff_register.submit_button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
          >
            {loading && (
              <svg
                aria-hidden="true"
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            )}
            {loading ? "Kaydediliyor..." : t(lang, "register")}
          </button>
        </div>
      </div>
    </div>
  );
}
