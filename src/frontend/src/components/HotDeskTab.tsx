import { useState } from "react";
import { toast } from "sonner";

interface Desk {
  id: string;
  name: string;
  floor: string;
}

interface DeskBooking {
  id: string;
  deskId: string;
  deskName: string;
  date: string;
  startTime: string;
  endTime: string;
  assignedTo: string;
  createdAt: number;
}

interface Props {
  companyId: string;
}

function loadDesks(companyId: string): Desk[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_hotdesks_${companyId}`) ?? "[]",
    );
  } catch {
    return [];
  }
}

function saveDesks(companyId: string, desks: Desk[]) {
  localStorage.setItem(`safentry_hotdesks_${companyId}`, JSON.stringify(desks));
}

function loadBookings(companyId: string): DeskBooking[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_hotdesk_bookings_${companyId}`) ?? "[]",
    );
  } catch {
    return [];
  }
}

function saveBookings(companyId: string, bookings: DeskBooking[]) {
  localStorage.setItem(
    `safentry_hotdesk_bookings_${companyId}`,
    JSON.stringify(bookings),
  );
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function HotDeskTab({ companyId }: Props) {
  const [desks, setDesks] = useState<Desk[]>(() => loadDesks(companyId));
  const [bookings, setBookings] = useState<DeskBooking[]>(() =>
    loadBookings(companyId),
  );
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [view, setView] = useState<"availability" | "bookings" | "manage">(
    "availability",
  );

  // Add desk form
  const [deskName, setDeskName] = useState("");
  const [deskFloor, setDeskFloor] = useState("");

  // Booking form
  const [bookDeskId, setBookDeskId] = useState("");
  const [bookDate, setBookDate] = useState(todayStr());
  const [bookStart, setBookStart] = useState("09:00");
  const [bookEnd, setBookEnd] = useState("17:00");
  const [bookPerson, setBookPerson] = useState("");

  const persistDesks = (next: Desk[]) => {
    setDesks(next);
    saveDesks(companyId, next);
  };

  const persistBookings = (next: DeskBooking[]) => {
    setBookings(next);
    saveBookings(companyId, next);
  };

  const addDesk = () => {
    if (!deskName.trim()) {
      toast.error("Masa adı boş olamaz");
      return;
    }
    const desk: Desk = {
      id: `desk_${Date.now()}`,
      name: deskName.trim(),
      floor: deskFloor.trim() || "Genel",
    };
    persistDesks([...desks, desk]);
    setDeskName("");
    setDeskFloor("");
    toast.success("Masa eklendi");
  };

  const removeDesk = (id: string) => {
    persistDesks(desks.filter((d) => d.id !== id));
    persistBookings(bookings.filter((b) => b.deskId !== id));
    toast.success("Masa silindi");
  };

  const addBooking = () => {
    if (!bookDeskId) {
      toast.error("Masa seçin");
      return;
    }
    if (!bookPerson.trim()) {
      toast.error("Kişi adı boş olamaz");
      return;
    }
    if (bookStart >= bookEnd) {
      toast.error("Başlangıç saati bitiş saatinden önce olmalı");
      return;
    }
    // Check conflict
    const conflict = bookings.find(
      (b) =>
        b.deskId === bookDeskId &&
        b.date === bookDate &&
        b.startTime < bookEnd &&
        b.endTime > bookStart,
    );
    if (conflict) {
      toast.error(
        `Bu masa ${conflict.startTime}–${conflict.endTime} arası dolu (${conflict.assignedTo})`,
      );
      return;
    }
    const desk = desks.find((d) => d.id === bookDeskId);
    const booking: DeskBooking = {
      id: `bk_${Date.now()}`,
      deskId: bookDeskId,
      deskName: desk?.name ?? bookDeskId,
      date: bookDate,
      startTime: bookStart,
      endTime: bookEnd,
      assignedTo: bookPerson.trim(),
      createdAt: Date.now(),
    };
    persistBookings([...bookings, booking]);
    setBookPerson("");
    toast.success("Rezervasyon oluşturuldu");
  };

  const cancelBooking = (id: string) => {
    persistBookings(bookings.filter((b) => b.id !== id));
    toast.success("Rezervasyon iptal edildi");
  };

  const dayBookings = bookings.filter((b) => b.date === selectedDate);

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(14,165,233,0.15)",
    borderRadius: 12,
    padding: 16,
  };

  const btnBase =
    "px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer";
  const btnPrimary = `${btnBase} text-white`;
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(14,165,233,0.2)",
    borderRadius: 8,
    color: "#e2e8f0",
    padding: "8px 12px",
    fontSize: 14,
    width: "100%",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          🖥️ Hot Desk Rezervasyonu
        </h2>
        <div className="flex gap-2">
          {(["availability", "bookings", "manage"] as const).map((v) => (
            <button
              key={v}
              type="button"
              data-ocid={`hotdesk.${v}.tab`}
              onClick={() => setView(v)}
              className={btnBase}
              style={{
                background:
                  view === v
                    ? "rgba(14,165,233,0.2)"
                    : "rgba(255,255,255,0.05)",
                border: `1px solid ${view === v ? "rgba(14,165,233,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: view === v ? "#38bdf8" : "#94a3b8",
              }}
            >
              {v === "availability"
                ? "Müsaitlik"
                : v === "bookings"
                  ? "Rezervasyonlar"
                  : "Masaları Yönet"}
            </button>
          ))}
        </div>
      </div>

      {view === "availability" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label htmlFor="hd-sel-date" className="text-slate-300 text-sm">
              Tarih:
            </label>
            <input
              id="hd-sel-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ ...inputStyle, width: "auto" }}
              data-ocid="hotdesk.date.input"
            />
          </div>
          {desks.length === 0 ? (
            <div style={cardStyle} className="text-center py-8">
              <p className="text-slate-400">
                Henüz masa tanımlanmamış. "Masaları Yönet" sekmesinden ekleyin.
              </p>
            </div>
          ) : (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              }}
            >
              {desks.map((desk) => {
                const booked = dayBookings.filter((b) => b.deskId === desk.id);
                const isOccupied = booked.some((b) => {
                  const now = new Date();
                  const nowStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
                  return selectedDate === todayStr()
                    ? b.startTime <= nowStr && b.endTime > nowStr
                    : true;
                });
                return (
                  <div
                    key={desk.id}
                    data-ocid="hotdesk.desk.item.1"
                    style={{
                      ...cardStyle,
                      border: `1px solid ${isOccupied ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                      background: isOccupied
                        ? "rgba(239,68,68,0.06)"
                        : "rgba(34,197,94,0.06)",
                    }}
                  >
                    <p className="font-semibold text-white">{desk.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {desk.floor}
                    </p>
                    <p
                      className={`text-xs font-medium mt-2 ${isOccupied ? "text-red-400" : "text-green-400"}`}
                    >
                      {isOccupied ? "⛔ Dolu" : "✅ Müsait"}
                    </p>
                    {booked.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {booked.map((b) => (
                          <p key={b.id} className="text-xs text-slate-400">
                            {b.startTime}–{b.endTime} · {b.assignedTo}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick book form */}
          {desks.length > 0 && (
            <div style={cardStyle}>
              <p className="text-sm font-semibold text-teal-400 mb-3">
                Hızlı Rezervasyon
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label
                    htmlFor="hd-desk"
                    className="text-xs text-slate-400 mb-1 block"
                  >
                    Masa
                  </label>
                  <select
                    id="hd-desk"
                    value={bookDeskId}
                    onChange={(e) => setBookDeskId(e.target.value)}
                    style={inputStyle}
                    data-ocid="hotdesk.desk.select"
                  >
                    <option value="">Seçin</option>
                    {desks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.floor})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="hd-date"
                    className="text-xs text-slate-400 mb-1 block"
                  >
                    Tarih
                  </label>
                  <input
                    id="hd-date"
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    style={inputStyle}
                    data-ocid="hotdesk.booking_date.input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="hd-start"
                    className="text-xs text-slate-400 mb-1 block"
                  >
                    Başlangıç
                  </label>
                  <input
                    id="hd-start"
                    type="time"
                    value={bookStart}
                    onChange={(e) => setBookStart(e.target.value)}
                    style={inputStyle}
                    data-ocid="hotdesk.start_time.input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="hd-end"
                    className="text-xs text-slate-400 mb-1 block"
                  >
                    Bitiş
                  </label>
                  <input
                    id="hd-end"
                    type="time"
                    value={bookEnd}
                    onChange={(e) => setBookEnd(e.target.value)}
                    style={inputStyle}
                    data-ocid="hotdesk.end_time.input"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Kişi adı / ziyaretçi"
                  value={bookPerson}
                  onChange={(e) => setBookPerson(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                  data-ocid="hotdesk.person.input"
                  onKeyDown={(e) => e.key === "Enter" && addBooking()}
                />
                <button
                  type="button"
                  data-ocid="hotdesk.add_booking.button"
                  onClick={addBooking}
                  className={btnPrimary}
                  style={{
                    background: "rgba(14,165,233,0.2)",
                    border: "1px solid rgba(14,165,233,0.4)",
                    color: "#38bdf8",
                  }}
                >
                  Rezerve Et
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "bookings" && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div style={cardStyle} className="text-center py-8">
              <p className="text-slate-400">Rezervasyon bulunmuyor.</p>
            </div>
          ) : (
            [...bookings]
              .sort((a, b) =>
                a.date + a.startTime < b.date + b.startTime ? -1 : 1,
              )
              .map((b) => (
                <div
                  key={b.id}
                  data-ocid="hotdesk.bookings.item.1"
                  style={{
                    ...cardStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <p className="font-semibold text-white">{b.deskName}</p>
                    <p className="text-sm text-slate-300">{b.assignedTo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {b.date} · {b.startTime}–{b.endTime}
                    </p>
                  </div>
                  <button
                    type="button"
                    data-ocid="hotdesk.cancel_booking.button"
                    onClick={() => cancelBooking(b.id)}
                    className={btnBase}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171",
                    }}
                  >
                    İptal
                  </button>
                </div>
              ))
          )}
        </div>
      )}

      {view === "manage" && (
        <div className="space-y-4">
          <div style={cardStyle}>
            <p className="text-sm font-semibold text-teal-400 mb-3">
              Yeni Masa Ekle
            </p>
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                placeholder="Masa adı (ör. A-01)"
                value={deskName}
                onChange={(e) => setDeskName(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 140 }}
                data-ocid="hotdesk.desk_name.input"
                onKeyDown={(e) => e.key === "Enter" && addDesk()}
              />
              <input
                type="text"
                placeholder="Kat / Konum"
                value={deskFloor}
                onChange={(e) => setDeskFloor(e.target.value)}
                style={{ ...inputStyle, flex: 1, minWidth: 120 }}
                data-ocid="hotdesk.desk_floor.input"
                onKeyDown={(e) => e.key === "Enter" && addDesk()}
              />
              <button
                type="button"
                data-ocid="hotdesk.add_desk.button"
                onClick={addDesk}
                className={btnPrimary}
                style={{
                  background: "rgba(14,165,233,0.2)",
                  border: "1px solid rgba(14,165,233,0.4)",
                  color: "#38bdf8",
                }}
              >
                + Ekle
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {desks.length === 0 ? (
              <p className="text-slate-400 text-sm">Henüz masa eklenmedi.</p>
            ) : (
              desks.map((d) => (
                <div
                  key={d.id}
                  data-ocid="hotdesk.desk_list.item.1"
                  style={{
                    ...cardStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span className="font-medium text-white">{d.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {d.floor}
                    </span>
                  </div>
                  <button
                    type="button"
                    data-ocid="hotdesk.delete_desk.button"
                    onClick={() => removeDesk(d.id)}
                    className={btnBase}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171",
                    }}
                  >
                    Sil
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
