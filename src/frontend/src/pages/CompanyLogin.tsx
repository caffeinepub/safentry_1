import { useState } from "react";
import { syncFromBackend } from "../backendSync";
import LangSwitcher from "../components/LangSwitcher";
import { useActor } from "../hooks/useActor";
import { getLang, t } from "../i18n";
import {
  findCompanyByLoginCode,
  purgeExpiredVisitors,
  saveCompany,
  saveSession,
} from "../store";
import type { AppScreen } from "../types";

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh?: () => void;
}

export default function CompanyLogin({ onNavigate, onRefresh }: Props) {
  const lang = getLang();
  const { actor } = useActor();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    let companyId: string | null = null;

    if (actor) {
      try {
        const backendCompany = await actor.loginCompany(code.toUpperCase());
        if (backendCompany) {
          saveCompany({
            ...backendCompany,
            createdAt: Number(backendCompany.createdAt),
            maxConcurrentVisitors: 50,
            dataRetentionDays: 365,
          });
          companyId = backendCompany.companyId;
        }
      } catch (_e) {
        // fall through to localStorage
      }
    }

    if (!companyId) {
      const localCompany = findCompanyByLoginCode(code.toUpperCase());
      if (localCompany) {
        companyId = localCompany.companyId;
      }
    }

    setLoading(false);

    if (!companyId) {
      setError("Geçersiz giriş kodu.");
      return;
    }

    purgeExpiredVisitors(companyId);
    if (actor) {
      syncFromBackend(actor, companyId).catch(() => {});
    }
    saveSession({
      type: "company",
      companyId,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });
    onNavigate("company-dashboard");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0f1e" }}
    >
      <div className="flex justify-between items-center px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate("welcome")}
          data-ocid="company_login.back.button"
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
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 pulse-glow"
              style={{
                background: "rgba(14,165,233,0.15)",
                border: "1px solid rgba(14,165,233,0.3)",
              }}
            >
              <span className="text-3xl">🏢</span>
            </div>
            <h2 className="text-2xl font-bold text-white">
              {t(lang, "companyLogin")}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              12 karakterli giriş kodunuzu girin
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-slate-300 text-sm mb-2 block">
                {t(lang, "loginCode")}
              </p>
              <input
                data-ocid="company.login.input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={12}
                placeholder="XXXXXXXXXXXX"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none font-mono tracking-widest text-center text-lg transition-all"
                style={{
                  background: "rgba(14,165,233,0.08)",
                  border: focused
                    ? "1px solid rgba(14,165,233,0.7)"
                    : "1px solid rgba(14,165,233,0.3)",
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
            </div>
            {error && (
              <p
                data-ocid="company_login.error_state"
                className="text-red-400 text-sm text-center"
              >
                {error}
              </p>
            )}
            <button
              type="button"
              data-ocid="company.login.submit_button"
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-70"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
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
