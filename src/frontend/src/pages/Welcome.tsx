import { useState } from "react";
import LangSwitcher from "../components/LangSwitcher";
import { getLang, t } from "../i18n";
import type { AppScreen } from "../types";

interface Props {
  onNavigate: (s: AppScreen) => void;
  onRefresh: () => void;
}

export default function Welcome({ onNavigate, onRefresh }: Props) {
  const lang = getLang();
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [platformCode, setPlatformCode] = useState("");
  const [platformError, setPlatformError] = useState(false);

  const handlePlatformLogin = () => {
    if (platformCode === "SAFENTRY2024") {
      setShowPlatformModal(false);
      setPlatformCode("");
      setPlatformError(false);
      onNavigate("super-admin");
    } else {
      setPlatformError(true);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#0a0f1e" }}
    >
      <div className="flex justify-between items-center px-6 py-4">
        <div className="text-2xl font-bold text-white">
          <span style={{ color: "#00d4aa" }}>Safe</span>ntry
        </div>
        <LangSwitcher onChange={onRefresh} />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">
            <span style={{ color: "#00d4aa" }}>Safe</span>ntry
          </h1>
          <p className="text-slate-400">{t(lang, "tagline")}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 w-full max-w-lg">
          <button
            type="button"
            data-ocid="welcome.company_login.button"
            onClick={() => onNavigate("company-login")}
            className="group p-8 rounded-2xl border border-white/10 text-left transition-all hover:border-[#00d4aa]/50"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="text-4xl mb-3">🏢</div>
            <div className="text-white font-semibold text-lg mb-1">
              {t(lang, "companyLogin")}
            </div>
            <div className="text-slate-400 text-sm">
              12 karakterli giriş kodu ile
            </div>
          </button>
          <button
            type="button"
            data-ocid="welcome.staff_login.button"
            onClick={() => onNavigate("staff-login")}
            className="group p-8 rounded-2xl border border-white/10 text-left transition-all hover:border-[#f59e0b]/50"
            style={{
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="text-4xl mb-3">👤</div>
            <div className="text-white font-semibold text-lg mb-1">
              {t(lang, "staffLogin")}
            </div>
            <div className="text-slate-400 text-sm">
              8 haneli personel kodu ile
            </div>
          </button>
        </div>
        <div className="flex gap-4 mt-6">
          <button
            type="button"
            data-ocid="welcome.company_register.button"
            onClick={() => onNavigate("company-register")}
            className="text-[#00d4aa] hover:underline text-sm"
          >
            {t(lang, "newCompany")}
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            data-ocid="welcome.staff_register.button"
            onClick={() => onNavigate("staff-register")}
            className="text-[#f59e0b] hover:underline text-sm"
          >
            {t(lang, "newStaff")}
          </button>
          <span className="text-slate-600">|</span>
          <button
            type="button"
            data-ocid="welcome.verify.button"
            onClick={() => onNavigate("verify")}
            className="text-slate-400 hover:underline text-sm"
          >
            {t(lang, "verifyVisitor")}
          </button>
        </div>
      </div>

      {/* Hidden platform management link */}
      <div className="flex justify-center pb-4">
        <button
          type="button"
          data-ocid="welcome.platform_admin.button"
          onClick={() => setShowPlatformModal(true)}
          className="text-slate-800 hover:text-slate-600 text-[10px] transition-colors"
        >
          Platform Yönetimi
        </button>
      </div>

      {/* Platform admin code modal */}
      {showPlatformModal && (
        <div
          data-ocid="welcome.platform_admin.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold">⚡ Platform Yönetimi</h3>
              <button
                type="button"
                data-ocid="welcome.platform_admin.close_button"
                onClick={() => {
                  setShowPlatformModal(false);
                  setPlatformCode("");
                  setPlatformError(false);
                }}
                className="text-slate-400 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              Platform yönetim kodunu girin
            </p>
            <input
              data-ocid="welcome.platform_admin.input"
              type="password"
              value={platformCode}
              onChange={(e) => {
                setPlatformCode(e.target.value);
                setPlatformError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handlePlatformLogin()}
              placeholder="Platform kodu"
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm mb-3"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: `1px solid ${
                  platformError
                    ? "rgba(239,68,68,0.5)"
                    : "rgba(255,255,255,0.15)"
                }`,
                outline: "none",
              }}
            />
            {platformError && (
              <p
                data-ocid="welcome.platform_admin.error_state"
                className="text-red-400 text-xs mb-3"
              >
                Hatalı platform kodu
              </p>
            )}
            <button
              type="button"
              data-ocid="welcome.platform_admin.submit_button"
              onClick={handlePlatformLogin}
              className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
              style={{
                background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
              }}
            >
              Giriş
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
