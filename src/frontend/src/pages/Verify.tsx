import { useState } from "react";
import { useLanguage } from "../LanguageContext";
import QRCode from "../components/QRCode";
import { t } from "../i18n";
import {
  findCompanyById,
  findStaffById,
  findVisitorByCodeGlobal,
} from "../store";
import type { AppScreen, Visitor } from "../types";
import { durationLabel, formatDateTime } from "../utils";

const LABEL_COLORS: Record<string, string> = {
  normal: "#3b82f6",
  vip: "#f59e0b",
  attention: "#f97316",
  restricted: "#ef4444",
};

interface Props {
  onNavigate: (s: AppScreen) => void;
}

export default function Verify({ onNavigate }: Props) {
  const { lang } = useLanguage();
  const [code, setCode] = useState("");
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [notFound, setNotFound] = useState(false);

  const search = () => {
    const v = findVisitorByCodeGlobal(code.toUpperCase());
    if (v) {
      setVisitor(v);
      setNotFound(false);
    } else {
      setVisitor(null);
      setNotFound(true);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "#0a0f1e" }}
    >
      <button
        type="button"
        onClick={() => onNavigate("welcome")}
        data-ocid="verify.back.button"
        className="text-slate-400 hover:text-white text-sm mb-8"
      >
        ← {t(lang, "backToHome")}
      </button>
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {t(lang, "verifyVisitor")}
        </h2>
        <div className="flex gap-2 mb-6">
          <input
            data-ocid="verify.code.input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t(lang, "enterCode")}
            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d4aa] font-mono"
          />
          <button
            type="button"
            data-ocid="verify.search.button"
            onClick={search}
            className="px-6 py-3 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #00d4aa, #0088ff)" }}
          >
            {t(lang, "search")}
          </button>
        </div>
        {notFound && (
          <p
            data-ocid="verify.error_state"
            className="text-red-400 text-center"
          >
            {t(lang, "noVisitors")}
          </p>
        )}
        {visitor && (
          <div
            className="p-6 rounded-2xl border border-white/10"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-white font-bold text-xl">
                  {visitor.name}
                </div>
                <div className="text-slate-400 text-sm">{visitor.phone}</div>
              </div>
              <span
                className="px-3 py-1 rounded-full text-white text-xs font-semibold"
                style={{ background: LABEL_COLORS[visitor.label] }}
              >
                {visitor.label.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-center mb-4">
              <QRCode value={visitor.visitorId} size={140} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">{t(lang, "status")}</span>
                <span className="text-white font-medium">
                  {visitor.status === "active"
                    ? `🟢 ${t(lang, "active")}`
                    : `🔴 ${t(lang, "departed")}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t(lang, "arrivalAt")}</span>
                <span className="text-white">
                  {formatDateTime(visitor.arrivalTime)}
                </span>
              </div>
              {visitor.departureTime && (
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {t(lang, "departureAt")}
                  </span>
                  <span className="text-white">
                    {formatDateTime(visitor.departureTime)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">{t(lang, "duration")}</span>
                <span className="text-white">
                  {durationLabel(visitor.arrivalTime, visitor.departureTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t(lang, "visitType")}</span>
                <span className="text-white">{visitor.visitType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{t(lang, "host")}</span>
                <span className="text-white">
                  {findStaffById(visitor.hostStaffId)?.name ??
                    visitor.hostStaffId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Şirket</span>
                <span className="text-white">
                  {findCompanyById(visitor.companyId)?.name ??
                    visitor.companyId}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
