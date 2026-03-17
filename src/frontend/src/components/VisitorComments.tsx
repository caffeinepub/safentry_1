import { useState } from "react";
import type { Visitor } from "../types";

type Tag = "important" | "complaint" | "suggestion" | "positive";

const TAG_CONFIG: Record<Tag, { label: string; color: string; bg: string }> = {
  important: {
    label: "⭐ Önemli",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
  },
  complaint: {
    label: "🚨 Şikayet",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
  },
  suggestion: {
    label: "💡 Öneri",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.15)",
  },
  positive: {
    label: "👍 Olumlu",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
  },
};

function getCommentTags(companyId: string): Record<string, Tag> {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_comment_tags_${companyId}`) || "{}",
    );
  } catch {
    return {};
  }
}

function saveCommentTag(companyId: string, visitorId: string, tag: Tag | null) {
  const tags = getCommentTags(companyId);
  if (tag === null) {
    delete tags[visitorId];
  } else {
    tags[visitorId] = tag;
  }
  localStorage.setItem(
    `safentry_comment_tags_${companyId}`,
    JSON.stringify(tags),
  );
}

interface Props {
  companyId: string;
  visitors: Visitor[];
}

export default function VisitorComments({ companyId, visitors }: Props) {
  const [tags, setTags] = useState(() => getCommentTags(companyId));
  const [filterTag, setFilterTag] = useState<Tag | "all">("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const withComments = visitors.filter(
    (v) => v.notes?.trim() || (v.rating && v.rating > 0),
  );

  const categories = [
    ...new Set(visitors.map((v) => v.category).filter(Boolean)),
  ];

  const filtered = withComments.filter((v) => {
    if (filterTag !== "all" && tags[v.visitorId] !== filterTag) return false;
    if (filterCategory && v.category !== filterCategory) return false;
    if (filterDateFrom) {
      if (v.arrivalTime < new Date(filterDateFrom).getTime()) return false;
    }
    if (filterDateTo) {
      if (v.arrivalTime > new Date(filterDateTo).getTime() + 86400000)
        return false;
    }
    return true;
  });

  const setTag = (visitorId: string, tag: Tag | null) => {
    saveCommentTag(companyId, visitorId, tag);
    setTags(getCommentTags(companyId));
  };

  return (
    <div data-ocid="reviews.panel">
      <div className="flex flex-wrap gap-3 mb-5">
        {(
          ["all", "important", "complaint", "suggestion", "positive"] as const
        ).map((tag) => (
          <button
            key={tag}
            type="button"
            data-ocid={`reviews.${tag}.tab`}
            onClick={() => setFilterTag(tag)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background:
                filterTag === tag
                  ? tag === "all"
                    ? "rgba(14,165,233,0.25)"
                    : TAG_CONFIG[tag]?.bg
                  : "rgba(255,255,255,0.05)",
              border: `1px solid ${
                filterTag === tag
                  ? tag === "all"
                    ? "rgba(14,165,233,0.5)"
                    : TAG_CONFIG[tag]?.color
                  : "rgba(255,255,255,0.1)"
              }`,
              color:
                filterTag === tag
                  ? tag === "all"
                    ? "#38bdf8"
                    : TAG_CONFIG[tag]?.color
                  : "#94a3b8",
            }}
          >
            {tag === "all"
              ? `Tümü (${withComments.length})`
              : `${TAG_CONFIG[tag].label} (${withComments.filter((v) => tags[v.visitorId] === tag).length})`}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <select
          data-ocid="reviews.category.select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          data-ocid="reviews.date_from.input"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
        />
        <input
          type="date"
          data-ocid="reviews.date_to.input"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div
          className="text-slate-500 text-sm text-center py-12"
          data-ocid="reviews.empty_state"
        >
          Yorum bulunamadı
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((v, idx) => (
            <div
              key={v.visitorId}
              data-ocid={`reviews.item.${idx + 1}`}
              className="px-4 py-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">
                      {v.name}
                    </span>
                    {v.category && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(14,165,233,0.15)",
                          color: "#38bdf8",
                        }}
                      >
                        {v.category}
                      </span>
                    )}
                    {v.rating && (
                      <span className="text-xs text-yellow-400">
                        {"⭐".repeat(v.rating)}
                      </span>
                    )}
                  </div>
                  {v.notes && (
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {v.notes}
                    </p>
                  )}
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(v.arrivalTime).toLocaleDateString("tr-TR")}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                  {tags[v.visitorId] ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          background: TAG_CONFIG[tags[v.visitorId]].bg,
                          color: TAG_CONFIG[tags[v.visitorId]].color,
                        }}
                      >
                        {TAG_CONFIG[tags[v.visitorId]].label}
                      </span>
                      <button
                        type="button"
                        data-ocid="reviews.remove_tag.button"
                        onClick={() => setTag(v.visitorId, null)}
                        className="text-slate-500 hover:text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(Object.keys(TAG_CONFIG) as Tag[]).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          data-ocid="reviews.tag.button"
                          onClick={() => setTag(v.visitorId, tag)}
                          className="text-xs px-2 py-1 rounded-full transition-all hover:opacity-80"
                          style={{
                            background: TAG_CONFIG[tag].bg,
                            color: TAG_CONFIG[tag].color,
                            border: `1px solid ${TAG_CONFIG[tag].color}40`,
                          }}
                        >
                          {TAG_CONFIG[tag].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
