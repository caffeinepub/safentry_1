import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type React from "react";
import type { Visitor } from "../types";
import VisitTimeline from "./VisitTimeline";

interface VisitorProfileModalProps {
  visitor: Visitor;
  allVisitors: Visitor[];
  onClose: () => void;
}

function formatDT(ts: number) {
  return new Date(ts).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label =
    score >= 80 ? "Düşük Risk" : score >= 50 ? "Orta Risk" : "Yüksek Risk";
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-bold text-white"
      style={{ background: color }}
    >
      {label} ({score})
    </span>
  );
}

export default function VisitorProfileModal({
  visitor,
  allVisitors,
  onClose,
}: VisitorProfileModalProps) {
  const samePersonVisits = allVisitors
    .filter((v) => v.idNumber && v.idNumber === visitor.idNumber)
    .sort((a, b) => b.arrivalTime - a.arrivalTime);

  const trustScore = (() => {
    const key = `safentry_trust_${visitor.companyId}_${visitor.idNumber}`;
    try {
      const data = JSON.parse(localStorage.getItem(key) ?? "{}");
      return typeof data.score === "number" ? data.score : 75;
    } catch {
      return 75;
    }
  })();

  const escorts = (() => {
    try {
      const list = JSON.parse(
        localStorage.getItem(`safentry_escorts_${visitor.companyId}`) ?? "[]",
      ) as {
        visitorId: string;
        assignedAt: number;
        staffName: string;
        deliveredAt?: number;
      }[];
      return list.filter((e) => e.visitorId === visitor.visitorId);
    } catch {
      return [];
    }
  })();

  const accessCards = (() => {
    try {
      const list = JSON.parse(
        localStorage.getItem(`safentry_access_cards_${visitor.companyId}`) ??
          "[]",
      ) as {
        visitorId: string;
        cardNo: string;
        issuedAt: number;
        returnedAt?: number;
      }[];
      return list.filter((c) => c.visitorId === visitor.visitorId);
    } catch {
      return [];
    }
  })();

  return (
    <div
      data-ocid="visitor_profile.modal"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      tabIndex={-1}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl flex flex-col max-h-[90vh]"
        style={{
          background: "linear-gradient(135deg,#0f172a,#0f1e36)",
          border: "1px solid rgba(14,165,233,0.25)",
          boxShadow: "0 0 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              {visitor.name[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-white font-bold text-base">
                {visitor.name}
              </div>
              <div className="text-slate-400 text-xs">
                {visitor.idNumber ?? "TC yok"}
              </div>
            </div>
          </div>
          <button
            type="button"
            data-ocid="visitor_profile.close_button"
            onClick={onClose}
            className="text-slate-400 hover:text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <ScrollArea className="flex-1 px-6 py-5">
          <div className="space-y-6">
            {/* Ziyaret Zaman Çizelgesi */}
            <VisitTimeline visitor={visitor} />
            {/* Kişisel Bilgiler */}
            <Section title="👤 Kişisel Bilgiler">
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Kategori" value={visitor.category ?? "—"} />
                <InfoItem
                  label="Güven Skoru"
                  value={<ScoreBadge score={trustScore} />}
                />
                <InfoItem label="Telefon" value={visitor.phone ?? "—"} />
                <InfoItem label="Şirket" value={visitor.companyId} />
                <InfoItem
                  label="Ziyaret Amacı"
                  value={visitor.visitReason ?? "—"}
                />
                <InfoItem
                  label="Araç Plakası"
                  value={visitor.vehiclePlate ?? "—"}
                />
              </div>
            </Section>

            {/* Ziyaret Geçmişi */}
            <Section
              title={`📅 Ziyaret Geçmişi (${samePersonVisits.length} ziyaret)`}
            >
              {samePersonVisits.length === 0 ? (
                <div className="text-slate-500 text-sm">
                  Ziyaret geçmişi bulunamadı.
                </div>
              ) : (
                <div className="space-y-2">
                  {samePersonVisits.map((v, i) => (
                    <div
                      key={v.visitorId}
                      data-ocid={`visitor_profile.item.${i + 1}`}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div>
                        <div className="text-white text-sm font-medium">
                          {formatDT(v.arrivalTime)}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {v.category ?? "—"} &bull; {v.visitReason ?? "—"}
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          background:
                            v.status === "active"
                              ? "rgba(34,197,94,0.2)"
                              : "rgba(148,163,184,0.1)",
                          color: v.status === "active" ? "#22c55e" : "#94a3b8",
                        }}
                      >
                        {v.status === "active" ? "İçeride" : "Çıkış Yaptı"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Belgeler */}
            <Section title="📄 Belgeler">
              <div className="space-y-2">
                {visitor.ndaAccepted ? (
                  <DocItem
                    label="NDA İmzalandı"
                    date={formatDT(visitor.arrivalTime ?? visitor.arrivalTime)}
                  />
                ) : (
                  <div className="text-slate-500 text-sm">NDA imzalanmadı.</div>
                )}
                {(visitor as any).policyAccepted && (
                  <DocItem
                    label="Ziyaretçi Politikası Onaylandı"
                    date={formatDT(visitor.arrivalTime)}
                  />
                )}
                {visitor.ishgAccepted && (
                  <DocItem
                    label="İSG Beyannamesi İmzalandı"
                    date={formatDT(visitor.arrivalTime)}
                  />
                )}
              </div>
            </Section>

            {/* Eskort Kayıtları */}
            <Section title={`🛡️ Eskort Kayıtları (${escorts.length})`}>
              {escorts.length === 0 ? (
                <div className="text-slate-500 text-sm">Eskort kaydı yok.</div>
              ) : (
                <div className="space-y-2">
                  {escorts.map((e) => (
                    <div
                      key={String(e.assignedAt)}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div>
                        <div className="text-white text-sm">{e.staffName}</div>
                        <div className="text-slate-400 text-xs">
                          Atama: {formatDT(e.assignedAt)}
                        </div>
                      </div>
                      {e.deliveredAt && (
                        <span className="text-green-400 text-xs">
                          ✅ Teslim edildi
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Erişim Kartları */}
            <Section title={`💳 Erişim Kartları (${accessCards.length})`}>
              {accessCards.length === 0 ? (
                <div className="text-slate-500 text-sm">
                  Erişim kartı kaydı yok.
                </div>
              ) : (
                <div className="space-y-2">
                  {accessCards.map((c) => (
                    <div
                      key={`${c.cardNo}-${c.issuedAt}`}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div>
                        <div className="text-white text-sm font-medium">
                          Kart: {c.cardNo}
                        </div>
                        <div className="text-slate-400 text-xs">
                          Verildi: {formatDT(c.issuedAt)}
                        </div>
                      </div>
                      {c.returnedAt ? (
                        <span className="text-green-400 text-xs">
                          ✅ İade edildi
                        </span>
                      ) : (
                        <span className="text-amber-400 text-xs">
                          ⏳ İadede
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: "#0ea5e9" }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      className="p-3 rounded-xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div className="text-slate-500 text-xs mb-1">{label}</div>
      <div className="text-white text-sm">{value}</div>
    </div>
  );
}

function DocItem({ label, date }: { label: string; date: string }) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-xl"
      style={{
        background: "rgba(34,197,94,0.05)",
        border: "1px solid rgba(34,197,94,0.15)",
      }}
    >
      <span className="text-green-300 text-sm">✅ {label}</span>
      <span className="text-slate-400 text-xs">{date}</span>
    </div>
  );
}
