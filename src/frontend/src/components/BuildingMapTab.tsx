import React, { useState } from "react";
import { toast } from "sonner";

interface Room {
  id: string;
  floor: number;
  roomName: string;
  roomType: string;
  capacity: number;
  description: string;
}

const ROOM_TYPES = [
  "Ofis",
  "Toplantı Odası",
  "Lobi",
  "Depo",
  "Teknik",
  "Diğer",
];

const ROOM_TYPE_COLORS: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  Ofis: {
    bg: "rgba(14,165,233,0.15)",
    border: "rgba(14,165,233,0.4)",
    text: "#7dd3fc",
  },
  "Toplantı Odası": {
    bg: "rgba(168,85,247,0.15)",
    border: "rgba(168,85,247,0.4)",
    text: "#d8b4fe",
  },
  Lobi: {
    bg: "rgba(34,197,94,0.15)",
    border: "rgba(34,197,94,0.4)",
    text: "#86efac",
  },
  Depo: {
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.4)",
    text: "#fcd34d",
  },
  Teknik: {
    bg: "rgba(239,68,68,0.15)",
    border: "rgba(239,68,68,0.4)",
    text: "#fca5a5",
  },
  Diğer: {
    bg: "rgba(148,163,184,0.1)",
    border: "rgba(148,163,184,0.3)",
    text: "#94a3b8",
  },
};

const DIRECTIONS: Record<string, string[]> = {
  Lobi: ["Ana girişten içeri girin", "Sizi güvenlik masasında karşılayacaktır"],
  "Toplantı Odası": [
    "Asansörü kullanarak ilgili kata çıkın",
    "Koridorda yön levhalarını takip edin",
  ],
  Ofis: [
    "Ana koridordan ilerliyerek sağa dönün",
    "Ofis numarasını kapıda kontrol edin",
  ],
  Depo: ["Bina arka girişinden giriniz", "Güvenlik görevlisine bildiriniz"],
  Teknik: ["Yalnızca yetkili personel girebilir", "Güvenlik eşliğinde giriniz"],
  Diğer: ["Resepsiyon masasından yönlendirme alın"],
};

function getBuildingMap(companyId: string): Room[] {
  try {
    return JSON.parse(
      localStorage.getItem(`safentry_building_map_${companyId}`) || "[]",
    );
  } catch {
    return [];
  }
}

function saveBuildingMap(companyId: string, rooms: Room[]) {
  localStorage.setItem(
    `safentry_building_map_${companyId}`,
    JSON.stringify(rooms),
  );
}

interface Props {
  companyId: string;
  activeVisitorMeetingRooms?: string[];
}

export default function BuildingMapTab({
  companyId,
  activeVisitorMeetingRooms = [],
}: Props) {
  const [rooms, setRooms] = useState<Room[]>(() => getBuildingMap(companyId));
  const [showForm, setShowForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [wayfindingTarget, setWayfindingTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    floor: "1",
    roomName: "",
    roomType: "Ofis",
    capacity: "10",
    description: "",
  });

  const floors = Array.from(new Set(rooms.map((r) => r.floor))).sort(
    (a, b) => a - b,
  );

  const handleAdd = () => {
    if (!form.roomName.trim()) {
      toast.error("Oda adı zorunludur");
      return;
    }
    const room: Room = {
      id: `room_${Date.now()}`,
      floor: Number(form.floor),
      roomName: form.roomName.trim(),
      roomType: form.roomType,
      capacity: Number(form.capacity) || 10,
      description: form.description.trim(),
    };
    const updated = [...rooms, room];
    saveBuildingMap(companyId, updated);
    setRooms(updated);
    setForm({
      floor: "1",
      roomName: "",
      roomType: "Ofis",
      capacity: "10",
      description: "",
    });
    setShowForm(false);
    toast.success(`🗺️ ${room.roomName} eklendi`);
  };

  const handleDelete = (id: string) => {
    const updated = rooms.filter((r) => r.id !== id);
    saveBuildingMap(companyId, updated);
    setRooms(updated);
    setSelectedRoom(null);
    toast.success("Oda silindi");
  };

  const getDirections = (room: Room): string[] => {
    const ordinal = [
      "birinci",
      "ikinci",
      "üçüncü",
      "dördüncü",
      "beşinci",
      "altıncı",
    ];
    const floorName =
      room.floor === 0
        ? "zemin kata"
        : `${ordinal[room.floor - 1] ?? `${room.floor}.`} kata`;
    const roomsOnFloor = rooms.filter((r) => r.floor === room.floor);
    const pos = roomsOnFloor.findIndex((r) => r.id === room.id) + 1;
    const dir =
      DIRECTIONS[room.roomType as keyof typeof DIRECTIONS] || DIRECTIONS.Diğer;
    const steps = [
      `Asansör veya merdivenlerle ${floorName} çıkın`,
      ...dir,
      `Koridordan ${pos}. oda — ${room.roomName}`,
    ];
    return steps;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">
            🗺️ İnteraktif Bina Haritası
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            {rooms.length} oda tanımlı
          </p>
        </div>
        <button
          type="button"
          data-ocid="building_map.open_modal_button"
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Oda Ekle
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div
          data-ocid="building_map.modal"
          className="p-5 rounded-2xl space-y-4"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(14,165,233,0.2)",
          }}
        >
          <h3 className="text-white font-semibold">Yeni Oda / Alan Ekle</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <p className="text-slate-300 text-xs mb-1">Kat Numarası</p>
              <input
                type="number"
                min="0"
                max="50"
                data-ocid="building_map.floor.input"
                value={form.floor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, floor: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div>
              <p className="text-slate-300 text-xs mb-1">Oda Adı *</p>
              <input
                data-ocid="building_map.room_name.input"
                value={form.roomName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, roomName: e.target.value }))
                }
                placeholder="Ör: Toplantı Odası A"
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div>
              <p className="text-slate-300 text-xs mb-1">Oda Tipi</p>
              <select
                data-ocid="building_map.room_type.select"
                value={form.roomType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, roomType: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: "#1e293b" }}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-slate-300 text-xs mb-1">Kapasite</p>
              <input
                type="number"
                min="1"
                data-ocid="building_map.capacity.input"
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: e.target.value }))
                }
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
            <div className="sm:col-span-2">
              <p className="text-slate-300 text-xs mb-1">Açıklama</p>
              <input
                data-ocid="building_map.description.input"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="İsteğe bağlı açıklama..."
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-[#0ea5e9]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              data-ocid="building_map.submit_button"
              onClick={handleAdd}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
            >
              Ekle
            </button>
            <button
              type="button"
              data-ocid="building_map.cancel_button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {rooms.length === 0 ? (
        <div
          data-ocid="building_map.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-5xl mb-3">🗺️</div>
          <p className="text-sm">Henüz oda tanımlanmamış</p>
          <p className="text-xs mt-1">
            Bina haritanızı oluşturmak için oda ekleyin
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {ROOM_TYPES.map((t) => {
              const c = ROOM_TYPE_COLORS[t];
              return (
                <div
                  key={t}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                  style={{
                    background: c.bg,
                    border: `1px solid ${c.border}`,
                    color: c.text,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ background: c.text }}
                  />
                  {t}
                </div>
              );
            })}
          </div>

          {/* SVG Floor plan by floor */}
          {floors.map((floor) => {
            const floorRooms = rooms.filter((r) => r.floor === floor);
            const cols = 3;
            const rows = Math.ceil(floorRooms.length / cols);
            const W = 160;
            const H = 90;
            const GAP = 12;
            const PAD = 16;
            const svgW = cols * W + (cols - 1) * GAP + PAD * 2;
            const svgH = rows * H + (rows - 1) * GAP + PAD * 2;

            return (
              <div
                key={floor}
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">
                    {floor === 0 ? "Zemin Kat" : `${floor}. Kat`}
                  </h3>
                  <span className="text-slate-500 text-xs">
                    {floorRooms.length} oda
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <svg
                    width={svgW}
                    height={svgH}
                    style={{ minWidth: svgW }}
                    data-ocid="building_map.canvas_target"
                    aria-label="Kat planı"
                    role="img"
                  >
                    {floorRooms.map((room, i) => {
                      const col = i % cols;
                      const row = Math.floor(i / cols);
                      const x = PAD + col * (W + GAP);
                      const y = PAD + row * (H + GAP);
                      const isActive = activeVisitorMeetingRooms.includes(
                        room.roomName,
                      );
                      const c =
                        ROOM_TYPE_COLORS[
                          room.roomType as keyof typeof ROOM_TYPE_COLORS
                        ] || ROOM_TYPE_COLORS.Diğer;
                      const isSelected = selectedRoom?.id === room.id;
                      return (
                        <g
                          key={room.id}
                          onClick={() => {
                            setSelectedRoom(room);
                            setWayfindingTarget(null);
                          }}
                          style={{ cursor: "pointer" }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSelectedRoom(room);
                              setWayfindingTarget(null);
                            }
                          }}
                          tabIndex={0}
                        >
                          <rect
                            x={x}
                            y={y}
                            width={W}
                            height={H}
                            rx={10}
                            fill={isActive ? "rgba(34,197,94,0.18)" : c.bg}
                            stroke={
                              isSelected
                                ? "#f59e0b"
                                : isActive
                                  ? "rgba(34,197,94,0.6)"
                                  : c.border
                            }
                            strokeWidth={isSelected ? 2 : 1.5}
                          />
                          <text
                            x={x + W / 2}
                            y={y + 22}
                            textAnchor="middle"
                            fill={c.text}
                            fontSize={11}
                            fontWeight="bold"
                          >
                            {room.roomName.length > 18
                              ? `${room.roomName.slice(0, 17)}…`
                              : room.roomName}
                          </text>
                          <text
                            x={x + W / 2}
                            y={y + 38}
                            textAnchor="middle"
                            fill="rgba(148,163,184,0.8)"
                            fontSize={9}
                          >
                            {room.roomType}
                          </text>
                          <text
                            x={x + W / 2}
                            y={y + 53}
                            textAnchor="middle"
                            fill="rgba(148,163,184,0.6)"
                            fontSize={9}
                          >
                            👤 Kapasite: {room.capacity}
                          </text>
                          {isActive && (
                            <text
                              x={x + W / 2}
                              y={y + 69}
                              textAnchor="middle"
                              fill="#86efac"
                              fontSize={9}
                            >
                              ✓ Aktif Ziyaretçi
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            );
          })}

          {/* Selected room details */}
          {selectedRoom && (
            <div
              data-ocid="building_map.panel"
              className="p-5 rounded-2xl"
              style={{
                background: "rgba(14,165,233,0.06)",
                border: "1px solid rgba(14,165,233,0.25)",
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-bold">
                    {selectedRoom.roomName}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {selectedRoom.roomType} •{" "}
                    {selectedRoom.floor === 0
                      ? "Zemin Kat"
                      : `${selectedRoom.floor}. Kat`}{" "}
                    • Kapasite: {selectedRoom.capacity}
                  </p>
                  {selectedRoom.description && (
                    <p className="text-slate-300 text-sm mt-1">
                      {selectedRoom.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  data-ocid="building_map.close_button"
                  onClick={() => setSelectedRoom(null)}
                  className="text-slate-400 hover:text-white text-xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  type="button"
                  onClick={() =>
                    setWayfindingTarget(
                      wayfindingTarget === selectedRoom.id
                        ? null
                        : selectedRoom.id,
                    )
                  }
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5"
                  style={{
                    background: "rgba(245,158,11,0.2)",
                    border: "1px solid rgba(245,158,11,0.4)",
                    color: "#fbbf24",
                  }}
                >
                  🧭 Yol Tarifi
                </button>
                <button
                  type="button"
                  data-ocid="building_map.delete_button"
                  onClick={() => handleDelete(selectedRoom.id)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  🗑️ Sil
                </button>
              </div>

              {wayfindingTarget === selectedRoom.id && (
                <div
                  className="mt-4 p-4 rounded-xl"
                  style={{
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}
                >
                  <p className="text-amber-300 font-semibold text-xs mb-2 uppercase tracking-wide">
                    🧭 Yol Tarifi
                  </p>
                  <ol className="space-y-2">
                    {getDirections(selectedRoom).map((step, i) => (
                      <li key={step} className="flex items-start gap-2">
                        <span
                          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                          style={{
                            background: "rgba(245,158,11,0.2)",
                            color: "#fbbf24",
                            border: "1px solid rgba(245,158,11,0.4)",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-slate-200 text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
