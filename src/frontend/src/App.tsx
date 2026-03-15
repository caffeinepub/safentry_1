import { useCallback, useEffect, useState } from "react";
import { getLang } from "./i18n";
import InvitePage from "./pages/InvitePage";
import { clearSession, getSession } from "./store";
import type { AppScreen } from "./types";

import CompanyDashboard from "./pages/CompanyDashboard";
import CompanyLogin from "./pages/CompanyLogin";
import CompanyRegister from "./pages/CompanyRegister";
import KioskMode from "./pages/KioskMode";
import LanguageSelect from "./pages/LanguageSelect";
import StaffDashboard from "./pages/StaffDashboard";
import StaffLogin from "./pages/StaffLogin";
import StaffRegister from "./pages/StaffRegister";
import Verify from "./pages/Verify";
import Welcome from "./pages/Welcome";

// Check if current URL is an invite link
function getInviteToken(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/invite\/([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const [, forceRender] = useState(0);
  const refresh = () => forceRender((x) => x + 1);

  const hasLang = !!localStorage.getItem("safentry_lang");
  const session = getSession();
  const inviteToken = getInviteToken();

  const getInitialScreen = (): AppScreen => {
    if (inviteToken) return "invite";
    if (!hasLang) return "language";
    if (!session) return "welcome";
    return session.type === "company" ? "company-dashboard" : "staff-dashboard";
  };

  const [screen, setScreen] = useState<AppScreen>(getInitialScreen);
  const [kioskCompanyId, setKioskCompanyId] = useState<string | null>(null);
  const [currentInviteToken, setCurrentInviteToken] = useState<string | null>(
    inviteToken,
  );

  const navigate = useCallback(
    (s: AppScreen, state?: { companyId?: string; token?: string }) => {
      if (s === "kiosk" && state?.companyId) setKioskCompanyId(state.companyId);
      if (s === "invite" && state?.token) setCurrentInviteToken(state.token);
      setScreen(s);
    },
    [],
  );

  // Session timeout check
  useEffect(() => {
    const check = () => {
      const s = getSession();
      if (
        !s &&
        (screen === "company-dashboard" || screen === "staff-dashboard")
      ) {
        clearSession();
        navigate("welcome");
      }
    };
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, [screen, navigate]);

  void getLang();

  if (screen === "invite" && currentInviteToken)
    return <InvitePage token={currentInviteToken} onNavigate={navigate} />;
  if (screen === "language")
    return (
      <LanguageSelect
        onSelect={() => {
          refresh();
          navigate("welcome");
        }}
      />
    );
  if (screen === "welcome")
    return <Welcome onNavigate={navigate} onRefresh={refresh} />;
  if (screen === "company-login") return <CompanyLogin onNavigate={navigate} />;
  if (screen === "staff-login") return <StaffLogin onNavigate={navigate} />;
  if (screen === "company-register")
    return <CompanyRegister onNavigate={navigate} />;
  if (screen === "staff-register")
    return <StaffRegister onNavigate={navigate} />;
  if (screen === "company-dashboard")
    return <CompanyDashboard onNavigate={navigate} onRefresh={refresh} />;
  if (screen === "staff-dashboard")
    return <StaffDashboard onNavigate={navigate} onRefresh={refresh} />;
  if (screen === "kiosk")
    return <KioskMode companyId={kioskCompanyId ?? ""} onNavigate={navigate} />;
  if (screen === "verify") return <Verify onNavigate={navigate} />;
  return null;
}
