import { useState } from "react";
import { toast } from "sonner";
import { deleteBranch, getBranches, getFloorRooms, saveBranch } from "../store";
import type { Branch } from "../types";
import { generateId } from "../utils";
import FloorPlanManager from "./FloorPlanManager";

interface Props {
  companyId: string;
}

const EMPTY_BRANCH = {
  name: "",
  address: "",
  floors: 1,
  capacity: 50,
};

export default function BranchManager({ companyId }: Props) {
  const [branches, setBranches] = useState<Branch[]>(() =>
    getBranches(companyId),
  );
  const [form, setForm] = useState(EMPTY_BRANCH);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [view, setView] = useState<"list" | "floorplan">("list");

  const reload = () => setBranches(getBranches(companyId));

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast.error("Şube adı zorunludur.");
      return;
    }
    const isMain =
      branches.filter((b) => b.id !== editingId).length === 0 && !editingId
        ? true
        : editingId
          ? (branches.find((b) => b.id === editingId)?.isMain ?? false)
          : false;
    const branch: Branch = {
      id: editingId ?? generateId(),
      companyId,
      name: form.name.trim(),
      address: form.address.trim(),
      floors: form.floors,
      capacity: form.capacity,
      isMain,
      createdAt: editingId
        ? (branches.find((b) => b.id === editingId)?.createdAt ?? Date.now())
        : Date.now(),
    };
    saveBranch(branch);
    reload();
    setForm(EMPTY_BRANCH);
    setEditingId(null);
    setShowForm(false);
    toast.success(editingId ? "Şube güncellendi." : "Şube eklendi.");
  };

  const handleEdit = (b: Branch) => {
    setForm({
      name: b.name,
      address: b.address,
      floors: b.floors,
      capacity: b.capacity,
    });
    setEditingId(b.id);
    setShowForm(true);
  };

  const handleDelete = (b: Branch) => {
    if (b.isMain) {
      toast.error("Ana şube silinemez.");
      return;
    }
    deleteBranch(companyId, b.id);
    reload();
    toast.success("Şube silindi.");
  };

  const setMain = (id: string) => {
    const list = getBranches(companyId).map((b) => ({
      ...b,
      isMain: b.id === id,
    }));
    for (const b of list) saveBranch(b);
    reload();
    toast.success("Ana şube güncellendi.");
  };

  if (view === "floorplan" && selectedBranch) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setView("list")}
          className="mb-4 flex items-center gap-2 text-sky-400 text-sm hover:opacity-80 transition-opacity"
        >
          ← Şube Listesine Dön
        </button>
        <FloorPlanManager companyId={companyId} branch={selectedBranch} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-white font-bold text-xl">🏢 Şube Yönetimi</h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Şirketinizin tüm şube ve lokasyonları
          </p>
        </div>
        <button
          type="button"
          data-ocid="branches.open_modal_button"
          onClick={() => {
            setForm(EMPTY_BRANCH);
            setEditingId(null);
            setShowForm(true);
          }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Şube Ekle
        </button>
      </div>

      {branches.length === 0 ? (
        <div
          className="text-center py-16 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          data-ocid="branches.empty_state"
        >
          <div className="text-5xl mb-3">🏢</div>
          <p className="text-slate-400">
            Henüz şube eklenmemiş. Yeni bir şube ekleyin.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b, i) => {
            const roomCount = getFloorRooms(companyId, b.id).length;
            return (
              <div
                key={b.id}
                data-ocid={`branches.item.${i + 1}`}
                className="p-5 rounded-2xl transition-all"
                style={{
                  background: b.isMain
                    ? "rgba(14,165,233,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: b.isMain
                    ? "1.5px solid rgba(14,165,233,0.35)"
                    : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">{b.name}</span>
                      {b.isMain && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: "rgba(14,165,233,0.25)",
                            color: "#0ea5e9",
                          }}
                        >
                          Ana Şube
                        </span>
                      )}
                    </div>
                    {b.address && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        📍 {b.address}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      data-ocid={`branches.edit_button.${i + 1}`}
                      onClick={() => handleEdit(b)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{
                        background: "rgba(245,158,11,0.15)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: "#f59e0b",
                      }}
                    >
                      ✏️
                    </button>
                    {!b.isMain && (
                      <button
                        type="button"
                        data-ocid={`branches.delete_button.${i + 1}`}
                        onClick={() => handleDelete(b)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium"
                        style={{
                          background: "rgba(239,68,68,0.15)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          color: "#ef4444",
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div
                    className="p-2.5 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="text-slate-400">Kat</div>
                    <div className="text-white font-semibold">{b.floors}</div>
                  </div>
                  <div
                    className="p-2.5 rounded-xl text-center"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <div className="text-slate-400">Kapasite</div>
                    <div className="text-white font-semibold">{b.capacity}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!b.isMain && (
                    <button
                      type="button"
                      data-ocid={`branches.primary_button.${i + 1}`}
                      onClick={() => setMain(b.id)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: "rgba(14,165,233,0.1)",
                        border: "1px solid rgba(14,165,233,0.25)",
                        color: "#0ea5e9",
                      }}
                    >
                      Ana Şube Yap
                    </button>
                  )}
                  <button
                    type="button"
                    data-ocid={`branches.floorplan.button.${i + 1}`}
                    onClick={() => {
                      setSelectedBranch(b);
                      setView("floorplan");
                    }}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: "rgba(168,85,247,0.1)",
                      border: "1px solid rgba(168,85,247,0.25)",
                      color: "#a855f7",
                    }}
                  >
                    🗺️ Kat Planı{roomCount > 0 ? ` (${roomCount})` : ""}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div
          data-ocid="branches.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowForm(false)}
        >
          <div
            className="w-full max-w-md p-6 rounded-2xl"
            style={{
              background: "#0f1729",
              border: "1.5px solid rgba(14,165,233,0.4)",
            }}
          >
            <h3 className="text-white font-bold text-lg mb-5">
              {editingId ? "Şubeyi Düzenle" : "Yeni Şube Ekle"}
            </h3>
            <div className="space-y-4">
              <label className="block">
                <span className="text-slate-300 text-xs block mb-1.5">
                  Şube Adı *
                </span>
                <input
                  data-ocid="branches.input"
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="İstanbul Merkez Ofisi"
                  className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </label>
              <label className="block">
                <span className="text-slate-300 text-xs block mb-1.5">
                  Adres
                </span>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Levent, İstanbul"
                  className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300 text-xs block mb-1.5">
                    Kat Sayısı
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.floors}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, floors: Number(e.target.value) }))
                    }
                    className="w-full px-3 py-2 rounded-xl text-white text-sm outline-none"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300 text-xs block mb-1.5">
                    Max Kapasite
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        capacity: Number(e.target.value),
                      }))
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
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                data-ocid="branches.cancel_button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(EMPTY_BRANCH);
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
                data-ocid="branches.save_button"
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
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
