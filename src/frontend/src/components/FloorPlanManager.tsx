import { useState } from "react";
import { toast } from "sonner";
import { deleteFloorRoom, getFloorRooms, saveFloorRoom } from "../store";
import type { Branch, FloorRoom } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
  branch: Branch;
}

const ROOM_TYPES: { value: FloorRoom["type"]; label: string; color: string }[] =
  [
    { value: "office", label: "Ofis", color: "#0ea5e9" },
    { value: "meeting", label: "Toplantı", color: "#a855f7" },
    { value: "entrance", label: "Giriş", color: "#22c55e" },
    { value: "exit", label: "Çıkış", color: "#ef4444" },
    { value: "wc", label: "WC", color: "#64748b" },
    { value: "other", label: "Diğer", color: "#f59e0b" },
  ];

const TYPE_COLOR = Object.fromEntries(
  ROOM_TYPES.map((r) => [r.value, r.color]),
);

const EMPTY_ROOM = {
  name: "",
  floor: 1,
  type: "office" as FloorRoom["type"],
  x: 50,
  y: 50,
};

export default function FloorPlanManager({ companyId, branch }: Props) {
  const [rooms, setRooms] = useState<FloorRoom[]>(() =>
    getFloorRooms(companyId, branch.id),
  );
  const [selectedFloor, setSelectedFloor] = useState(1);
  const [form, setForm] = useState(EMPTY_ROOM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const reload = () => setRooms(getFloorRooms(companyId, branch.id));

  const floorRooms = rooms.filter((r) => r.floor === selectedFloor);

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Oda/alan adı zorunludur.");
      return;
    }
    const room: FloorRoom = {
      id: editingId ?? generateId(),
      companyId,
      branchId: branch.id,
      name: form.name.trim(),
      floor: form.floor,
      type: form.type,
      x: form.x,
      y: form.y,
    };
    saveFloorRoom(room);
    reload();
    setForm(EMPTY_ROOM);
    setEditingId(null);
    setShowForm(false);
    setSelectedFloor(form.floor);
    toast.success(editingId ? "Alan güncellendi." : "Alan eklendi.");
  };

  const handleEdit = (r: FloorRoom) => {
    setForm({ name: r.name, floor: r.floor, type: r.type, x: r.x, y: r.y });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleDelete = (r: FloorRoom) => {
    deleteFloorRoom(companyId, branch.id, r.id);
    reload();
    toast.success("Alan silindi.");
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setForm((f) => ({ ...f, x, y }));
    setShowForm(true);
  };

  const floors = Array.from({ length: branch.floors }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-white font-bold text-lg">
            🗺️ {branch.name} — Kat Planı
          </h3>
          <p className="text-slate-400 text-sm">
            Katlara oda/alan eklemek için haritaya tıklayın
          </p>
        </div>
        <button
          type="button"
          data-ocid="floorplan.open_modal_button"
          onClick={() => {
            setForm({ ...EMPTY_ROOM, floor: selectedFloor });
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#a855f7,#7c3aed)" }}
        >
          + Alan Ekle
        </button>
      </div>

      {branch.floors > 1 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {floors.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFloor(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background:
                  selectedFloor === f
                    ? "rgba(168,85,247,0.3)"
                    : "rgba(255,255,255,0.06)",
                border:
                  selectedFloor === f
                    ? "1px solid rgba(168,85,247,0.6)"
                    : "1px solid rgba(255,255,255,0.1)",
                color: selectedFloor === f ? "#d8b4fe" : "#94a3b8",
              }}
            >
              {f}. Kat
            </button>
          ))}
        </div>
      )}

      {/* Map grid */}
      <div
        data-ocid="floorplan.canvas_target"
        className="relative w-full rounded-2xl overflow-hidden mb-4"
        style={{
          height: "400px",
          background: "rgba(255,255,255,0.03)",
          border: "1.5px solid rgba(168,85,247,0.25)",
          cursor: "crosshair",
        }}
        onClick={handleMapClick}
        onKeyDown={(e) => e.key === "Enter" && setShowForm(true)}
        aria-label="Kat planı - tıklayarak alan ekleyin"
      >
        {/* Grid lines */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ opacity: 0.08 }}
          aria-hidden="true"
        >
          <title>Izgara</title>
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
            <g key={pct}>
              <line
                x1={`${pct}%`}
                y1="0"
                x2={`${pct}%`}
                y2="100%"
                stroke="white"
              />
              <line
                x1="0"
                y1={`${pct}%`}
                x2="100%"
                y2={`${pct}%`}
                stroke="white"
              />
            </g>
          ))}
        </svg>

        {floorRooms.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-600 text-sm">
              Bu katta alan yok. Eklemek için tıklayın.
            </p>
          </div>
        )}

        {floorRooms.map((r) => (
          <button
            key={r.id}
            type="button"
            title={r.name}
            className="absolute flex items-center justify-center text-[10px] font-bold rounded-lg cursor-pointer select-none shadow-md"
            style={{
              left: `calc(${r.x}% - 36px)`,
              top: `calc(${r.y}% - 16px)`,
              width: "72px",
              height: "32px",
              background: `${TYPE_COLOR[r.type]}33`,
              border: `1.5px solid ${TYPE_COLOR[r.type]}88`,
              color: TYPE_COLOR[r.type],
              zIndex: 2,
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleEdit(r);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate px-1">{r.name}</span>
          </button>
        ))}
      </div>

      {floorRooms.length > 0 && (
        <div className="space-y-2">
          <p className="text-slate-500 text-xs mb-2">
            {selectedFloor}. kattaki alanlar — düzenlemek için ✏️ tuşuna basin
          </p>
          {floorRooms.map((r, i) => (
            <div
              key={r.id}
              data-ocid={`floorplan.item.${i + 1}`}
              className="flex items-center justify-between p-3 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: TYPE_COLOR[r.type] }}
                />
                <span className="text-white text-sm">{r.name}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px]"
                  style={{
                    background: `${TYPE_COLOR[r.type]}22`,
                    color: TYPE_COLOR[r.type],
                  }}
                >
                  {ROOM_TYPES.find((t) => t.value === r.type)?.label}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  data-ocid={`floorplan.edit_button.${i + 1}`}
                  onClick={() => handleEdit(r)}
                  className="px-2.5 py-1 rounded-lg text-xs"
                  style={{
                    background: "rgba(245,158,11,0.15)",
                    color: "#f59e0b",
                  }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  data-ocid={`floorplan.delete_button.${i + 1}`}
                  onClick={() => handleDelete(r)}
                  className="px-2.5 py-1 rounded-lg text-xs"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div
          data-ocid="floorplan.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowForm(false)}
        >
          <div
            className="w-full max-w-sm p-6 rounded-2xl"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(168,85,247,0.4)",
            }}
          >
            <h3 className="text-white font-bold text-lg mb-4">
              {editingId ? "Alanı Düzenle" : "Alan Ekle"}
            </h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-slate-300 text-xs block mb-1">
                  Alan Adı *
                </span>
                <input
                  data-ocid="floorplan.input"
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Toplantı Odası A"
                  className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 text-xs block mb-1">Kat</span>
                  <select
                    value={form.floor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, floor: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {floors.map((f) => (
                      <option key={f} value={f}>
                        {f}. Kat
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300 text-xs block mb-1">Tür</span>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        type: e.target.value as FloorRoom["type"],
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 text-xs block mb-1">
                    X Konumu (0-100)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.x}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, x: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 text-xs block mb-1">
                    Y Konumu (0-100)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.y}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, y: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                data-ocid="floorplan.cancel_button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-slate-300 text-sm"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                İptal
              </button>
              <button
                type="button"
                data-ocid="floorplan.save_button"
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg,#a855f7,#7c3aed)",
                }}
              >
                {editingId ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
