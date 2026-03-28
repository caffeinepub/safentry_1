import { useLanguage } from "../LanguageContext";
import { LANGUAGES, type Lang } from "../i18n";

interface Props {
  onChange?: () => void;
}

export default function LangSwitcher({ onChange }: Props) {
  const { lang: current, setLang: ctxSetLang } = useLanguage();
  return (
    <select
      data-ocid="lang.select"
      value={current}
      onChange={(e) => {
        ctxSetLang(e.target.value as Lang);
        onChange?.();
      }}
      className="bg-white/10 border border-white/20 text-white text-sm rounded-lg px-2 py-1 cursor-pointer"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code} className="bg-[#0f1729]">
          {l.flag} {l.label}
        </option>
      ))}
    </select>
  );
}
