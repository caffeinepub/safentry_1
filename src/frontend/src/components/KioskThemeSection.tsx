import { useState } from "react";
import { toast } from "sonner";

export interface KioskTheme {
  bgColor: string;
  accentColor: string;
  welcomeTitle: string;
  buttonStyle: "rounded" | "square";
  logoPosition: "left" | "center" | "right";
}

function getDefaultTheme(companyName: string): KioskTheme {
  return {
    bgColor: "#020817",
    accentColor: "#14b8a6",
    welcomeTitle: companyName,
    buttonStyle: "rounded",
    logoPosition: "center",
  };
}

export function getKioskTheme(companyId: string, companyName = ""): KioskTheme {
  const raw = localStorage.getItem(`safentry_kiosk_theme_${companyId}`);
  return raw ? JSON.parse(raw) : getDefaultTheme(companyName);
}

interface Props {
  companyId: string;
  initialTheme: KioskTheme;
}

export default function KioskThemeSection({ companyId, initialTheme }: Props) {
  const [theme, setTheme] = useState<KioskTheme>(initialTheme);

  const save = () => {
    localStorage.setItem(
      `safentry_kiosk_theme_${companyId}`,
      JSON.stringify(theme),
    );
    toast.success("Kiosk teması kaydedildi");
  };

  const field = (label: string, children: React.ReactNode) => (
    <div>
      <p className="text-slate-300 text-sm mb-1">{label}</p>
      {children}
    </div>
  );

  return (
    <div
      data-ocid="kiosk_theme.section"
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <h3 className="text-white font-semibold mb-1">
        🎨 Kiosk Tema Özelleştirme
      </h3>
      <p className="text-slate-500 text-xs mb-5">
        Ziyaretçi kiosk ekranının görünümünü şirketinize özgü hâle getirin.
      </p>

      <div className="space-y-4">
        {field(
          "Arka Plan Rengi",
          <div className="flex items-center gap-3">
            <input
              data-ocid="kiosk_theme.bgColor.input"
              type="color"
              value={theme.bgColor}
              onChange={(e) =>
                setTheme((t) => ({ ...t, bgColor: e.target.value }))
              }
              className="w-12 h-10 rounded-lg cursor-pointer border-0"
            />
            <span className="text-slate-400 text-sm font-mono">
              {theme.bgColor}
            </span>
          </div>,
        )}

        {field(
          "Vurgu Rengi (buton, başlık)",
          <div className="flex items-center gap-3">
            <input
              data-ocid="kiosk_theme.accentColor.input"
              type="color"
              value={theme.accentColor}
              onChange={(e) =>
                setTheme((t) => ({ ...t, accentColor: e.target.value }))
              }
              className="w-12 h-10 rounded-lg cursor-pointer border-0"
            />
            <span className="text-slate-400 text-sm font-mono">
              {theme.accentColor}
            </span>
          </div>,
        )}

        {field(
          "Karşılama Başlığı",
          <input
            data-ocid="kiosk_theme.welcomeTitle.input"
            value={theme.welcomeTitle}
            onChange={(e) =>
              setTheme((t) => ({ ...t, welcomeTitle: e.target.value }))
            }
            placeholder="Hoş geldiniz!"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-teal-500"
          />,
        )}

        {field(
          "Buton Stili",
          <div className="flex gap-3">
            {(["rounded", "square"] as const).map((style) => (
              <button
                key={style}
                type="button"
                data-ocid={`kiosk_theme.button_style.${style}`}
                onClick={() => setTheme((t) => ({ ...t, buttonStyle: style }))}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  borderRadius: style === "rounded" ? "12px" : "4px",
                  background:
                    theme.buttonStyle === style
                      ? "rgba(20,184,166,0.2)"
                      : "rgba(255,255,255,0.07)",
                  border:
                    theme.buttonStyle === style
                      ? "1px solid rgba(20,184,166,0.5)"
                      : "1px solid rgba(255,255,255,0.15)",
                  color: theme.buttonStyle === style ? "#5eead4" : "#94a3b8",
                }}
              >
                {style === "rounded" ? "🔴 Yuvarlak" : "■ Köşeli"}
              </button>
            ))}
          </div>,
        )}

        {field(
          "Logo Konumu",
          <div className="flex gap-3">
            {(["left", "center", "right"] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                data-ocid={`kiosk_theme.logo_pos.${pos}`}
                onClick={() => setTheme((t) => ({ ...t, logoPosition: pos }))}
                className="px-4 py-2 text-sm font-medium rounded-xl transition-all"
                style={{
                  background:
                    theme.logoPosition === pos
                      ? "rgba(20,184,166,0.2)"
                      : "rgba(255,255,255,0.07)",
                  border:
                    theme.logoPosition === pos
                      ? "1px solid rgba(20,184,166,0.5)"
                      : "1px solid rgba(255,255,255,0.15)",
                  color: theme.logoPosition === pos ? "#5eead4" : "#94a3b8",
                }}
              >
                {pos === "left"
                  ? "← Sol"
                  : pos === "center"
                    ? "● Orta"
                    : "Sağ →"}
              </button>
            ))}
          </div>,
        )}

        {/* Preview Strip */}
        <div
          className="rounded-xl p-4 mt-2 text-center"
          style={{
            background: theme.bgColor,
            border: `1px solid ${theme.accentColor}40`,
          }}
        >
          <p className="text-lg font-bold" style={{ color: theme.accentColor }}>
            {theme.welcomeTitle || "Hoş Geldiniz"}
          </p>
          <button
            type="button"
            className="mt-2 px-4 py-2 text-white text-xs font-semibold"
            style={{
              background: theme.accentColor,
              borderRadius: theme.buttonStyle === "rounded" ? "12px" : "4px",
            }}
          >
            Ziyaretçi Kaydı
          </button>
        </div>

        <button
          type="button"
          data-ocid="kiosk_theme.save.button"
          onClick={save}
          className="w-full py-3 rounded-xl font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#14b8a6,#0d9488)" }}
        >
          Temayı Kaydet
        </button>
      </div>
    </div>
  );
}
