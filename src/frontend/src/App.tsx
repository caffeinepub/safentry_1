import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useState } from "react";
import { setBackendActor } from "./backendSync";
import { useActor } from "./hooks/useActor";
import { getLang } from "./i18n";
import InvitePage from "./pages/InvitePage";
import {
  addNotification,
  clearSession,
  getCompanies,
  getSession,
  getVisitors,
  saveVisitor,
} from "./store";
import type { AppScreen } from "./types";

import AppointmentConfirmPage from "./pages/AppointmentConfirmPage";
import BlacklistAppealPage from "./pages/BlacklistAppealPage";
import CompanyDashboard from "./pages/CompanyDashboard";
import CompanyLogin from "./pages/CompanyLogin";
import CompanyRegister from "./pages/CompanyRegister";
import KioskMode from "./pages/KioskMode";
import LanguageSelect from "./pages/LanguageSelect";
import PreRegPage from "./pages/PreRegPage";
import SelfPreRegPage from "./pages/SelfPreRegPage";
import StaffDashboard from "./pages/StaffDashboard";
import StaffLogin from "./pages/StaffLogin";
import StaffRegister from "./pages/StaffRegister";
import SuperAdminPanel from "./pages/SuperAdminPanel";
import Verify from "./pages/Verify";
import VisitorFeedbackPage from "./pages/VisitorFeedbackPage";
import Welcome from "./pages/Welcome";

// Check if current URL is a confirm link
function getConfirmToken(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/confirm\/([a-zA-Z0-9+/=]+)$/);
  return match ? match[1] : null;
}

// Check if current URL is an invite link
function getInviteToken(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/invite\/([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

// Check if current URL is a pre-registration link
function getPreRegToken(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/prereg\/([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

// Check if current URL is a feedback link
function getFeedbackCode(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/feedback\/([a-zA-Z0-9]+)$/);
  return match ? match[1] : null;
}

// Check if current URL is a self pre-reg portal
function getSelfPreRegCode(): string | null {
  const path = window.location.pathname;
  const match = path.match(/^\/self-prereg\/([A-Za-z0-9]+)$/);
  return match ? match[1] : null;
}

// Check if current URL is a blacklist appeal link
function getAppealParams(): { tc: string } | null {
  const path = window.location.pathname;
  const match = path.match(/^\/appeal(?:\/([a-zA-Z0-9]+))?$/);
  if (!match) return null;
  return { tc: match[1] ?? "" };
}

export default function App() {
  const [, forceRender] = useState(0);
  const refresh = () => forceRender((x) => x + 1);
  const { actor } = useActor();
  useEffect(() => {
    setBackendActor(actor);
  }, [actor]);

  const hasLang = !!localStorage.getItem("safentry_lang");
  const session = getSession();
  const confirmToken = getConfirmToken();
  const inviteToken = getInviteToken();
  const preRegToken = getPreRegToken();
  const appealParams = getAppealParams();
  const feedbackCode = getFeedbackCode();
  const selfPreRegCode = getSelfPreRegCode();

  const getInitialScreen = (): AppScreen => {
    if (confirmToken) return "appointment-confirm";
    if (inviteToken) return "invite";
    if (preRegToken) return "prereg";
    if (appealParams) return "blacklist-appeal";
    if (selfPreRegCode) return "self-prereg";
    if (feedbackCode) return "visitor-feedback";
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

  // Badge auto-expiry check (every 60 seconds)
  useEffect(() => {
    const checkBadgeExpiry = () => {
      const companies = getCompanies();
      for (const company of companies) {
        const validHours = company.badgeValidityHours ?? 8;
        const visitors = getVisitors(company.companyId);
        for (const v of visitors) {
          if (v.status === "active" && !v.badgeExpired) {
            const hoursActive = (Date.now() - v.arrivalTime) / (1000 * 60 * 60);
            if (hoursActive >= validHours) {
              saveVisitor({ ...v, badgeExpired: true });
              addNotification({
                id: `badge_exp_${v.visitorId}`,
                companyId: company.companyId,
                type: "badge_expiry",
                message: `Rozet süresi doldu: ${v.name}`,
                createdAt: Date.now(),
                read: false,
              });
            }
          }
        }
      }
    };
    const interval = setInterval(checkBadgeExpiry, 60000);
    checkBadgeExpiry();
    return () => clearInterval(interval);
  }, []);

  // Auto night exit — every 5 minutes, exit visitors whose arrival exceeds closing hour
  useEffect(() => {
    const autoNightExit = () => {
      const companies = getCompanies();
      const now = new Date();
      const nowH = now.getHours();
      const nowM = now.getMinutes();
      const nowMins = nowH * 60 + nowM;

      for (const company of companies) {
        // Determine closing time in minutes from midnight
        let closingMins: number | null = null;
        if (company.workingHoursEnd != null) {
          closingMins = company.workingHoursEnd * 60;
        } else if (company.workingHours) {
          // Parse "HH:MM-HH:MM" or "08:00-18:00" format
          const parts = company.workingHours.split("-");
          if (parts.length === 2) {
            const end = parts[1].trim().split(":");
            if (end.length === 2) {
              closingMins =
                Number.parseInt(end[0]) * 60 + Number.parseInt(end[1]);
            }
          }
        }
        // Default: 20:00 (1200 mins)
        if (closingMins == null) closingMins = 20 * 60;

        // Only run if current time is at or after closing
        if (nowMins < closingMins) continue;

        const visitors = getVisitors(company.companyId);
        for (const v of visitors) {
          if (v.status !== "active") continue;
          const arrivalMins =
            new Date(v.arrivalTime).getHours() * 60 +
            new Date(v.arrivalTime).getMinutes();
          // Auto-exit only if visitor arrived before closing and is still active
          if (arrivalMins < closingMins) {
            const exitTime = Date.now();
            saveVisitor({
              ...v,
              status: "departed",
              departureTime: exitTime,
              notes: v.notes
                ? `${v.notes} | Otomatik gece çıkışı`
                : "Otomatik gece çıkışı",
            });
            addNotification({
              id: `auto_exit_${v.visitorId}_${exitTime}`,
              companyId: company.companyId,
              type: "info",
              message: `Otomatik gece çıkışı: ${v.name}`,
              createdAt: exitTime,
              read: false,
            });
          }
        }
      }
    };
    const interval = setInterval(autoNightExit, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
    return (
      <>
        <InvitePage token={currentInviteToken} onNavigate={navigate} />
        <Toaster richColors position="top-right" />
      </>
    );
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
    return (
      <>
        <a href="#main-content" className="skip-link">
          İçeriğe geç
        </a>
        <CompanyDashboard onNavigate={navigate} onRefresh={refresh} />
        <Toaster richColors position="top-right" />
      </>
    );
  if (screen === "staff-dashboard")
    return (
      <>
        <a href="#main-content" className="skip-link">
          İçeriğe geç
        </a>
        <StaffDashboard onNavigate={navigate} onRefresh={refresh} />
        <Toaster richColors position="top-right" />
      </>
    );
  if (screen === "kiosk")
    return <KioskMode companyId={kioskCompanyId ?? ""} onNavigate={navigate} />;
  if (screen === "verify") return <Verify onNavigate={navigate} />;
  if (screen === "appointment-confirm")
    return (
      <>
        <AppointmentConfirmPage
          token={confirmToken ?? ""}
          onNavigate={navigate}
        />
        <Toaster richColors position="top-right" />
      </>
    );
  if (screen === "prereg")
    return (
      <>
        <PreRegPage token={preRegToken ?? ""} onNavigate={navigate} />
        <Toaster richColors position="top-right" />
      </>
    );
  if (screen === "visitor-feedback")
    return (
      <>
        <VisitorFeedbackPage
          companyCode={feedbackCode ?? ""}
          onNavigate={navigate}
        />
        <Toaster richColors position="top-right" />
      </>
    );
  if (screen === "self-prereg")
    return (
      <>
        <SelfPreRegPage />
        <Toaster richColors position="top-right" />
      </>
    );
  if (screen === "super-admin")
    return (
      <>
        <SuperAdminPanel onNavigate={navigate} />
        <Toaster richColors position="top-right" />
      </>
    );
  if (screen === "blacklist-appeal")
    return (
      <>
        <BlacklistAppealPage
          tcNumber={appealParams?.tc ?? ""}
          onNavigate={navigate}
        />
        <Toaster richColors position="top-right" />
      </>
    );
  return null;
}
