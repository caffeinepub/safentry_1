import { useState } from "react";
import { getLang, t } from "../i18n";
import { copyToClipboard } from "../lib/utils";
import { saveCompany } from "../store";
import type { AppScreen, Company } from "../types";
import { generateCompanyId, generateLoginCode } from "../utils";

interface Props {
  onNavigate: (s: AppScreen) => void;
}

const FIELDS: {
  key: keyof Pick<Company, "name" | "sector" | "address" | "authorizedPerson">;
  label: string;
}[] = [
  { key: "name", label: "companyName" },
  { key: "sector", label: "sector" },
  { key: "address", label: "address" },
  { key: "authorizedPerson", label: "authorizedPerson" },
];

export default function CompanyRegister({ onNavigate }: Props) {
  const lang = getLang();
  const [form, setForm] = useState({
    name: "",
    sector: "",
    address: "",
    authorizedPerson: "",
  });
  const [result, setResult] = useState<Company | null>(null);
  const [copied, setCopied] = useState("");

  const handleSubmit = () => {
    if (!form.name || !form.sector || !form.address || !form.authorizedPerson)
      return;
    const company: Company = {
      companyId: generateCompanyId(),
      loginCode: generateLoginCode(),
      name: form.name,
      sector: form.sector,
      address: form.address,
      authorizedPerson: form.authorizedPerson,
      maxConcurrentVisitors: 50,
      dataRetentionDays: 365,
      createdAt: Date.now(),
    };
    saveCompany(company);
    setResult(company);
  };

  const copy = (text: string, key: string) => {
    copyToClipboard(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  if (result)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0f1e" }}
      >
        <div
          className="w-full max-w-md p-8 rounded-2xl border border-[#00d4aa]/30"
          style={{
            background: "rgba(0,212,170,0.05)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-2xl font-bold text-white">{result.name}</h2>
            <p className="text-slate-400 text-sm mt-1">Kayıt başarılı</p>
          </div>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/10">
              <div className="text-slate-400 text-xs mb-1">
                {t(lang, "yourCompanyId")}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-white text-lg tracking-widest">
                  {result.companyId}
                </span>
                <button
                  type="button"
                  data-ocid="company_register.copy_companyid.button"
                  onClick={() => copy(result.companyId, "cid")}
                  className="text-[#00d4aa] text-sm"
                >
                  {copied === "cid" ? t(lang, "copied") : t(lang, "copy")}
                </button>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-white/10">
              <div className="text-slate-400 text-xs mb-1">
                {t(lang, "yourLoginCode")}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-white text-lg tracking-widest">
                  {result.loginCode}
                </span>
                <button
                  type="button"
                  data-ocid="company_register.copy_logincode.button"
                  onClick={() => copy(result.loginCode, "lc")}
                  className="text-[#00d4aa] text-sm"
                >
                  {copied === "lc" ? t(lang, "copied") : t(lang, "copy")}
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            data-ocid="company_register.goto_login.button"
            onClick={() => onNavigate("company-login")}
            className="w-full mt-6 py-3 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #00d4aa, #0088ff)" }}
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
          data-ocid="company_register.back.button"
          className="text-slate-400 hover:text-white text-sm mb-6"
        >
          ← {t(lang, "backToHome")}
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">
          {t(lang, "newCompany")}
        </h2>
        <div className="space-y-4">
          {FIELDS.map(({ key, label }) => (
            <div key={key}>
              <p className="text-slate-300 text-sm mb-1">
                {t(lang, label as Parameters<typeof t>[1])}
              </p>
              <input
                data-ocid={`company_register.${key}.input`}
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:border-[#00d4aa]"
              />
            </div>
          ))}
          <button
            type="button"
            data-ocid="company_register.submit_button"
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #00d4aa, #0088ff)" }}
          >
            {t(lang, "register")}
          </button>
        </div>
      </div>
    </div>
  );
}
