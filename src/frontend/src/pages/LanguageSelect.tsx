import { useState } from "react";
import { LANGUAGES, type Lang, setLang } from "../i18n";

interface Props {
  onSelect: () => void;
}

export default function LanguageSelect({ onSelect }: Props) {
  const [selected, setSelected] = useState<Lang>("tr");

  const confirm = () => {
    setLang(selected);
    onSelect();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#0a0f1e" }}
    >
      <div className="mb-10 text-center">
        <div className="text-5xl font-bold text-white tracking-tight mb-2">
          <span style={{ color: "#00d4aa" }}>Safe</span>ntry
        </div>
        <div className="text-slate-400 text-lg">
          Kurumsal Ziyaretçi Takip Sistemi
        </div>
      </div>
      <div className="mb-8 text-white text-xl font-semibold">
        Dil Seçiniz / Select Language
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8 max-w-2xl">
        {LANGUAGES.map((l) => (
          <button
            type="button"
            key={l.code}
            data-ocid={`lang.item.${LANGUAGES.indexOf(l) + 1}`}
            onClick={() => setSelected(l.code)}
            className={`flex flex-col items-center p-4 rounded-xl border transition-all cursor-pointer ${
              selected === l.code
                ? "border-[#00d4aa] bg-[#00d4aa]/20 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/30"
            }`}
          >
            <span className="text-3xl mb-1">{l.flag}</span>
            <span className="text-sm font-medium">{l.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        data-ocid="lang.primary_button"
        onClick={confirm}
        className="px-10 py-3 rounded-xl font-semibold text-white text-lg transition-all"
        style={{ background: "linear-gradient(135deg, #00d4aa, #0088ff)" }}
      >
        Devam Et
      </button>
    </div>
  );
}
