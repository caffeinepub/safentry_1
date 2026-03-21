import { useState } from "react";
import { syncFromBackend } from "../backendSync";
import LangSwitcher from "../components/LangSwitcher";
import { useActor } from "../hooks/useActor";
import { getLang, t } from "../i18n";
import {
  addStaffSession,
  findStaffById,
  purgeExpiredVisitors,
  saveSession,
  saveStaff,
} from "../store";
import type { AppScreen } from "../types";

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh?: () => void;
}

export default function StaffLogin({ onNavigate, onRefresh }: Props) {
  const lang = getLang();
  const { actor } = useActor();
  const [staffId, setStaffId] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<"staff" | "company" | null>(
    null,
  );

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    let foundStaff: { name: string; role: string } | null = null;

    if (actor) {
      try {
        const backendStaff = await actor.loginStaff(staffId, companyId);
        if (backendStaff) {
          const localStaff = {
            staffId: backendStaff.staffId,
            companyId: backendStaff.companyId,
            name: backendStaff.name,
            role: (backendStaff.role === "admin" ? "admin" : "staff") as
              | "admin"
              | "receptionist"
              | "staff",
            availabilityStatus: "available" as const,
            createdAt: Number(backendStaff.createdAt),
          };
          saveStaff(localStaff);
          foundStaff = {
            name: backendStaff.name,
            role: backendStaff.role as string,
          };
        }
      } catch (_e) {
        // fall through to localStorage
      }
    }

    if (!foundStaff) {
      const localStaff = findStaffById(staffId);
      if (localStaff && localStaff.companyId === companyId) {
        foundStaff = { name: localStaff.name, role: localStaff.role };
      }
    }

    setLoading(false);

    if (!foundStaff) {
      setError("Geçersiz personel kodu veya şirket kodu.");
      return;
    }

    // Track multi-company associations
    try {
      const assocKey = "safentry_staff_companies";
      const assocMap: Record<string, string[]> = JSON.parse(
        localStorage.getItem(assocKey) || "{}",
      );
      const existing = assocMap[staffId] ?? [];
      if (!existing.includes(companyId)) {
        assocMap[staffId] = [...existing, companyId];
        localStorage.setItem(assocKey, JSON.stringify(assocMap));
      }
    } catch {}

    purgeExpiredVisitors(companyId);
    if (actor) {
      syncFromBackend(actor, companyId).catch(() => {});
    }
    const sessionId =
      Math.random().toString(36).slice(2) + Date.now().toString(36);
    saveSession({
      type: "staff",
      companyId,
      staffId,
      staffRole: foundStaff.role,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
    addStaffSession({
      id: sessionId,
      companyId,
      staffId,
      staffName: foundStaff.name,
      loginTime: Date.now(),
    });
    localStorage.setItem(`safentry_current_session_id_${staffId}`, sessionId);
    onNavigate("staff-dashboard");
  };

  const amberBorder = (active: boolean) =>
    active
      ? "1px solid rgba(245,158,11,0.7)"
      : "1px solid rgba(245,158,11,0.3)";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0f1e" }}
    >
      <div className="flex justify-between items-center px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate("welcome")}
          data-ocid="staff_login.back.button"
          className="text-slate-400 hover:text-white text-sm"
        >
          ← {t(lang, "backToHome")}
        </button>
        <LangSwitcher onChange={onRefresh} />
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="w-full max-w-md p-8 rounded-2xl border border-white/10 animate-fade-in"
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              <span className="text-3xl">👤</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              {t(lang, "staffLogin")}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Personel ve şirket kodunuzu girin
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="sl-staffid"
                className="text-slate-300 text-sm mb-2 block"
              >
                {t(lang, "staffId")}
              </label>
              <input
                id="sl-staffid"
                data-ocid="staff.login.input"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                maxLength={8}
                placeholder="12345678"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none font-mono tracking-widest text-center text-lg transition-all"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: amberBorder(focusedField === "staff"),
                }}
                onFocus={() => setFocusedField("staff")}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            <div>
              <label
                htmlFor="sl-companyid"
                className="text-slate-300 text-sm mb-2 block"
              >
                {t(lang, "companyId")}
              </label>
              <input
                id="sl-companyid"
                data-ocid="staff_login.companyid.input"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                maxLength={11}
                placeholder="12345678901"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none font-mono tracking-widest text-center text-lg transition-all"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: amberBorder(focusedField === "company"),
                }}
                onFocus={() => setFocusedField("company")}
                onBlur={() => setFocusedField(null)}
              />
            </div>
            {error && (
              <p
                data-ocid="staff_login.error_state"
                className="text-red-400 text-sm text-center"
              >
                {error}
              </p>
            )}
            <button
              type="button"
              data-ocid="staff.login.submit_button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70"
              style={{
                background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              }}
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
              {loading ? "Giriş yapılıyor..." : t(lang, "login")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
