import React, { useState } from "react";
import {
  deleteCompanyEvent,
  deleteEventAttendee,
  getCompanyEvents,
  getEventAttendees,
  saveCompanyEvent,
  saveEventAttendee,
} from "../store";
import type { CompanyEvent, EventAttendee } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
  staffId?: string;
  staffName: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  seminar: "Seminer",
  audit: "Denetim",
  conference: "Konferans",
  other: "Diğer",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "#0ea5e9",
  active: "#22c55e",
  completed: "#64748b",
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: "Yaklaşan",
  active: "Aktif",
  completed: "Tamamlandı",
};

export default function CompanyEventsTab({
  companyId,
  staffId: _staffId,
  staffName,
}: Props) {
  const [events, setEvents] = useState<CompanyEvent[]>(() =>
    getCompanyEvents(companyId),
  );
  const [attendees, setAttendees] = useState<EventAttendee[]>(() =>
    getEventAttendees(companyId),
  );
  const [selectedEvent, setSelectedEvent] = useState<CompanyEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAttendeeModal, setShowAttendeeModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    date: "",
    location: "",
    capacity: "50",
    description: "",
    category: "seminar" as CompanyEvent["category"],
  });
  const [attendeeForm, setAttendeeForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  const reload = () => {
    setEvents(getCompanyEvents(companyId));
    setAttendees(getEventAttendees(companyId));
  };

  const autoStatus = (ev: CompanyEvent): CompanyEvent["status"] => {
    const d = new Date(ev.date).getTime();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    if (d < now - dayMs) return "completed";
    if (Math.abs(d - now) < dayMs) return "active";
    return "upcoming";
  };

  const handleCreate = () => {
    if (!form.name.trim() || !form.date) return;
    const ev: CompanyEvent = {
      id: generateId(),
      companyId,
      name: form.name.trim(),
      date: form.date,
      location: form.location.trim(),
      capacity: Number.parseInt(form.capacity) || 50,
      description: form.description.trim(),
      category: form.category,
      status: "upcoming",
      createdAt: Date.now(),
      createdBy: staffName,
    };
    saveCompanyEvent(ev);
    reload();
    setShowCreateModal(false);
    setForm({
      name: "",
      date: "",
      location: "",
      capacity: "50",
      description: "",
      category: "seminar",
    });
  };

  const handleAddAttendee = () => {
    if (!attendeeForm.name.trim() || !selectedEvent) return;
    const a: EventAttendee = {
      id: generateId(),
      eventId: selectedEvent.id,
      companyId,
      name: attendeeForm.name.trim(),
      email: attendeeForm.email.trim() || undefined,
      phone: attendeeForm.phone.trim() || undefined,
      company: attendeeForm.company.trim() || undefined,
      registeredAt: Date.now(),
      checkedIn: false,
    };
    saveEventAttendee(a);
    reload();
    setAttendeeForm({ name: "", email: "", phone: "", company: "" });
    setShowAttendeeModal(false);
  };

  const handleCheckIn = (aId: string) => {
    const a = attendees.find((x) => x.id === aId);
    if (!a) return;
    saveEventAttendee({
      ...a,
      checkedIn: !a.checkedIn,
      checkedInAt: !a.checkedIn ? Date.now() : undefined,
    });
    reload();
  };

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
  };
  const inputCls =
    "w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]";

  const eventAttendees = selectedEvent
    ? attendees.filter((a) => a.eventId === selectedEvent.id)
    : [];
  const checkedInCount = eventAttendees.filter((a) => a.checkedIn).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">
            🎪 Etkinlik ve Konferans Yönetimi
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Şirket etkinliklerini ve katılımcıları yönetin
          </p>
        </div>
        <button
          type="button"
          data-ocid="etkinlikler.open_modal_button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Yeni Etkinlik
        </button>
      </div>

      {selectedEvent ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedEvent(null)}
            className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            ← Tüm Etkinlikler
          </button>
          <div className="p-4 rounded-xl" style={cardStyle}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">
                  {selectedEvent.name}
                </h3>
                <p className="text-slate-400 text-sm">
                  {selectedEvent.location} ·{" "}
                  {new Date(selectedEvent.date).toLocaleDateString("tr-TR")}
                </p>
                {selectedEvent.description && (
                  <p className="text-slate-300 text-sm mt-1">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  color: STATUS_COLORS[autoStatus(selectedEvent)],
                  background: `${STATUS_COLORS[autoStatus(selectedEvent)]}1a`,
                  border: `1px solid ${STATUS_COLORS[autoStatus(selectedEvent)]}44`,
                }}
              >
                {STATUS_LABELS[autoStatus(selectedEvent)]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center">
                <div className="text-xl font-bold text-teal-400">
                  {eventAttendees.length}
                </div>
                <div className="text-xs text-slate-400">Kayıtlı</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">
                  {checkedInCount}
                </div>
                <div className="text-xs text-slate-400">Giriş Yaptı</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-amber-400">
                  {selectedEvent.capacity - eventAttendees.length}
                </div>
                <div className="text-xs text-slate-400">Kalan Kapasite</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold">
              Katılımcılar ({eventAttendees.length})
            </h3>
            <button
              type="button"
              data-ocid="etkinlikler.open_modal_button"
              onClick={() => setShowAttendeeModal(true)}
              className="text-sm px-3 py-1.5 rounded-lg bg-teal-600 text-white"
            >
              + Katılımcı Ekle
            </button>
          </div>

          {eventAttendees.length === 0 ? (
            <div
              data-ocid="etkinlikler.empty_state"
              className="text-center py-10 text-slate-500"
            >
              <p>Henüz katılımcı yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventAttendees.map((a, i) => (
                <div
                  key={a.id}
                  data-ocid={`etkinlikler.item.${i + 1}`}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={cardStyle}
                >
                  <div>
                    <span className="text-white text-sm font-medium">
                      {a.name}
                    </span>
                    {a.company && (
                      <span className="text-xs text-slate-400 ml-2">
                        {a.company}
                      </span>
                    )}
                    {a.checkedIn && (
                      <span className="text-xs text-green-400 ml-2">
                        ✓ Giriş:{" "}
                        {a.checkedInAt
                          ? new Date(a.checkedInAt).toLocaleTimeString(
                              "tr-TR",
                              { hour: "2-digit", minute: "2-digit" },
                            )
                          : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      data-ocid={`etkinlikler.toggle.${i + 1}`}
                      onClick={() => handleCheckIn(a.id)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={
                        a.checkedIn
                          ? {
                              background: "rgba(34,197,94,0.15)",
                              border: "1px solid rgba(34,197,94,0.4)",
                              color: "#4ade80",
                            }
                          : {
                              background: "rgba(14,165,233,0.1)",
                              border: "1px solid rgba(14,165,233,0.3)",
                              color: "#38bdf8",
                            }
                      }
                    >
                      {a.checkedIn ? "✓ Giriş Yapıldı" : "Check In"}
                    </button>
                    <button
                      type="button"
                      data-ocid={`etkinlikler.delete_button.${i + 1}`}
                      onClick={() => {
                        deleteEventAttendee(companyId, a.id);
                        reload();
                      }}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {events.length === 0 ? (
            <div
              data-ocid="etkinlikler.empty_state"
              className="text-center py-16 text-slate-500"
            >
              <div className="text-4xl mb-2">🎪</div>
              <p>Henüz etkinlik yok</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {events.map((ev, i) => {
                const status = autoStatus(ev);
                const evAttendees = attendees.filter(
                  (a) => a.eventId === ev.id,
                );
                return (
                  <button
                    type="button"
                    key={ev.id}
                    data-ocid={`etkinlikler.card.${i + 1}`}
                    className="w-full text-left p-4 rounded-xl cursor-pointer hover:bg-white/5 transition-colors"
                    style={cardStyle}
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full mr-2"
                          style={{
                            background: `${STATUS_COLORS[status]}1a`,
                            color: STATUS_COLORS[status],
                            border: `1px solid ${STATUS_COLORS[status]}44`,
                          }}
                        >
                          {STATUS_LABELS[status]}
                        </span>
                        <span className="text-xs text-slate-500">
                          {CATEGORY_LABELS[ev.category]}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-ocid={`etkinlikler.delete_button.${i + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCompanyEvent(companyId, ev.id);
                          reload();
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Sil
                      </button>
                    </div>
                    <h3 className="text-white font-semibold">{ev.name}</h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {ev.location}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {new Date(ev.date).toLocaleDateString("tr-TR")}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-400">
                        {evAttendees.length} / {ev.capacity} kayıtlı
                      </span>
                      <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((evAttendees.length / ev.capacity) * 100, 100)}%`,
                            background:
                              evAttendees.length >= ev.capacity
                                ? "#ef4444"
                                : "#0ea5e9",
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div
          data-ocid="etkinlikler.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: "#0f1729",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 className="text-white font-bold text-lg">Yeni Etkinlik</h3>
            <input
              data-ocid="etkinlikler.input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className={inputCls}
              placeholder="Etkinlik adı *"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
                className={inputCls}
              />
              <input
                value={form.location}
                onChange={(e) =>
                  setForm((p) => ({ ...p, location: e.target.value }))
                }
                className={inputCls}
                placeholder="Yer / Salon"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                value={form.capacity}
                onChange={(e) =>
                  setForm((p) => ({ ...p, capacity: e.target.value }))
                }
                className={inputCls}
                placeholder="Kapasite"
              />
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    category: e.target.value as CompanyEvent["category"],
                  }))
                }
                className={`${inputCls} bg-[#0f1729]`}
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Açıklama (opsiyonel)"
            />
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="etkinlikler.submit_button"
                onClick={handleCreate}
                disabled={!form.name.trim() || !form.date}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Oluştur
              </button>
              <button
                type="button"
                data-ocid="etkinlikler.cancel_button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-300"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Attendee Modal */}
      {showAttendeeModal && (
        <div
          data-ocid="etkinlikler.dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{
              background: "#0f1729",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 className="text-white font-bold text-lg">Katılımcı Ekle</h3>
            <input
              value={attendeeForm.name}
              onChange={(e) =>
                setAttendeeForm((p) => ({ ...p, name: e.target.value }))
              }
              className={inputCls}
              placeholder="Ad Soyad *"
            />
            <input
              value={attendeeForm.company}
              onChange={(e) =>
                setAttendeeForm((p) => ({ ...p, company: e.target.value }))
              }
              className={inputCls}
              placeholder="Şirket"
            />
            <input
              value={attendeeForm.phone}
              onChange={(e) =>
                setAttendeeForm((p) => ({ ...p, phone: e.target.value }))
              }
              className={inputCls}
              placeholder="Telefon"
            />
            <div className="flex gap-3">
              <button
                type="button"
                data-ocid="etkinlikler.confirm_button"
                onClick={handleAddAttendee}
                disabled={!attendeeForm.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Ekle
              </button>
              <button
                type="button"
                data-ocid="etkinlikler.close_button"
                onClick={() => setShowAttendeeModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-slate-300"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
