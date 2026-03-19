import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getAppointments,
  getBlacklist,
  getIncidents,
  getLostFound,
  getStaffByCompany,
  getVisitors,
} from "../store";

interface SearchResult {
  id: string;
  category: string;
  label: string;
  sub: string;
  targetTab: string;
}

interface Props {
  companyId: string;
  onNavigate?: (tab: string) => void;
}

export default function GlobalSearch({ companyId, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults([]);
      return;
    }

    const items: SearchResult[] = [];

    for (const v of getVisitors(companyId)
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.idNumber.includes(q) ||
          (v.notes ?? "").toLowerCase().includes(q),
      )
      .slice(0, 4)) {
      items.push({
        id: `v_${v.visitorId}`,
        category: "Ziyaretçiler",
        label: v.name,
        sub: `TC: ${v.idNumber} • ${v.status === "active" ? "İçeride" : "Çıktı"}`,
        targetTab: "visitors",
      });
    }

    for (const s of getStaffByCompany(companyId)
      .filter((s) => s.name.toLowerCase().includes(q) || s.staffId.includes(q))
      .slice(0, 3)) {
      items.push({
        id: `s_${s.staffId}`,
        category: "Personel",
        label: s.name,
        sub: `Kod: ${s.staffId} • ${s.role}`,
        targetTab: "staff",
      });
    }

    for (const a of getAppointments(companyId)
      .filter(
        (a) =>
          a.visitorName.toLowerCase().includes(q) ||
          (a.purpose ?? "").toLowerCase().includes(q),
      )
      .slice(0, 3)) {
      items.push({
        id: `a_${a.id}`,
        category: "Randevular",
        label: a.visitorName,
        sub: `Amaç: ${a.purpose ?? "—"} • ${a.status}`,
        targetTab: "appointments",
      });
    }

    for (const b of getBlacklist(companyId)
      .filter(
        (b) => b.idNumber.includes(q) || b.reason.toLowerCase().includes(q),
      )
      .slice(0, 2)) {
      items.push({
        id: `bl_${b.idNumber}`,
        category: "Kara Liste",
        label: b.idNumber,
        sub: b.reason,
        targetTab: "blacklist",
      });
    }

    for (const i of getIncidents(companyId)
      .filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      )
      .slice(0, 2)) {
      items.push({
        id: `inc_${i.id}`,
        category: "Olaylar",
        label: i.title,
        sub: i.description.slice(0, 60),
        targetTab: "incidents",
      });
    }

    for (const l of getLostFound(companyId)
      .filter(
        (l) =>
          l.description.toLowerCase().includes(q) ||
          l.foundLocation.toLowerCase().includes(q),
      )
      .slice(0, 2)) {
      items.push({
        id: `lf_${l.id}`,
        category: "Kayıp & Bulunan",
        label: l.description.slice(0, 40),
        sub: l.foundLocation,
        targetTab: "lostfound",
      });
    }

    setResults(items);
  }, [query, companyId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  const handleSelect = (item: SearchResult) => {
    onNavigate?.(item.targetTab);
    setOpen(false);
    setQuery("");
  };

  const handleClose = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      data-ocid="global_search.panel"
    >
      {!open ? (
        <button
          type="button"
          data-ocid="global_search.button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-slate-400 hover:text-white border border-white/10 hover:border-white/25 transition-all text-sm"
          style={{ background: "rgba(255,255,255,0.04)" }}
          title="Global Arama"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Ara...</span>
        </button>
      ) : (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm"
          style={{
            background: "rgba(14,165,233,0.07)",
            border: "1px solid rgba(14,165,233,0.35)",
            minWidth: 240,
          }}
        >
          <Search size={14} className="text-[#0ea5e9] shrink-0" />
          <input
            ref={inputRef}
            data-ocid="global_search.input"
            type="text"
            placeholder="Ziyaretçi, personel, randevu ara..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Escape") handleClose();
            }}
          />
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {open && query.trim() && (
        <div
          className="absolute top-full right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50"
          style={{
            background: "#0f1729",
            border: "1px solid rgba(14,165,233,0.25)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
          }}
        >
          {results.length === 0 ? (
            <div
              data-ocid="global_search.empty_state"
              className="px-4 py-6 text-center text-slate-500 text-sm"
            >
              Sonuç bulunamadı
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {Object.entries(grouped).map(([cat, catItems]) => (
                <div key={cat}>
                  <div
                    className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider"
                    style={{
                      color: "#0ea5e9",
                      background: "rgba(14,165,233,0.05)",
                    }}
                  >
                    {cat}
                  </div>
                  {catItems.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      data-ocid="global_search.item.1"
                      onClick={() => handleSelect(item)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                    >
                      <div className="text-white text-sm font-medium truncate">
                        {item.label}
                      </div>
                      <div className="text-slate-500 text-xs truncate">
                        {item.sub}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
