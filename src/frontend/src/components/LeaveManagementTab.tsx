import { useState } from "react";
import { toast } from "sonner";
import {
  deleteStaffLeave,
  getStaffByCompany,
  getStaffLeaves,
  saveStaffLeave,
} from "../store";
import type { Staff, StaffLeave } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
  currentStaff: Staff;
}

export default function LeaveManagementTab({ companyId, currentStaff }: Props) {
  const isAdmin = currentStaff.role === "admin";
  const staffList = getStaffByCompany(companyId);

  const [leaves, setLeaves] = useState<StaffLeave[]>(() => {
    const all = getStaffLeaves(companyId);
    return isAdmin
      ? all
      : all.filter((l) => l.personnelId === currentStaff.staffId);
  });

  const [form, setForm] = useState({
    personnelId: currentStaff.staffId,
    startDate: "",
    endDate: "",
    reason: "Yıllık İzin",
  });

  const reload = () => {
    const all = getStaffLeaves(companyId);
    setLeaves(
      isAdmin ? all : all.filter((l) => l.personnelId === currentStaff.staffId),
    );
  };

  const handleAdd = () => {
    if (!form.startDate || !form.endDate) {
      toast.error("Başlangıç ve bitiş tarihleri zorunludur.");
      return;
    }
    if (form.startDate > form.endDate) {
      toast.error("Başlangıç tarihi bitiş tarihinden önce olmalı.");
      return;
    }
    const leave: StaffLeave = {
      leaveId: generateId(),
      personnelId: form.personnelId,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      createdAt: Date.now(),
    };
    saveStaffLeave(companyId, leave);
    setForm({
      personnelId: currentStaff.staffId,
      startDate: "",
      endDate: "",
      reason: "Yıllık İzin",
    });
    reload();
    toast.success("İzin kaydedildi.");
  };

  const handleDelete = (leaveId: string) => {
    deleteStaffLeave(companyId, leaveId);
    reload();
    toast.success("İzin silindi.");
  };

  const staffName = (id: string) =>
    staffList.find((s) => s.staffId === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <h3 className="text-white font-semibold text-base">📅 İzin Yönetimi</h3>

      {/* Add Leave Form */}
      <div
        className="p-4 rounded-2xl space-y-3"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <p className="text-slate-300 text-sm font-semibold mb-2">
          + Yeni İzin Ekle
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isAdmin && (
            <div>
              <p className="text-slate-400 text-xs mb-1">Personel</p>
              <select
                value={form.personnelId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, personnelId: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
              >
                {staffList.map((s) => (
                  <option
                    key={s.staffId}
                    value={s.staffId}
                    className="bg-[#0f1729]"
                  >
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <p className="text-slate-400 text-xs mb-1">Başlangıç Tarihi</p>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, startDate: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Bitiş Tarihi</p>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, endDate: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            />
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">İzin Türü</p>
            <select
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none"
            >
              {[
                "Yıllık İzin",
                "Hastalık İzni",
                "Mazeret İzni",
                "Ücretsiz İzin",
                "Diğer",
              ].map((r) => (
                <option key={r} value={r} className="bg-[#0f1729]">
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(90deg,#0ea5e9,#0284c7)" }}
        >
          + İzin Kaydet
        </button>
      </div>

      {/* Leave List */}
      <div className="space-y-2">
        {leaves.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">
            Kayıtlı izin bulunmuyor.
          </p>
        ) : (
          leaves.map((l) => {
            const today = new Date().toISOString().split("T")[0];
            const isActive = l.startDate <= today && l.endDate >= today;
            return (
              <div
                key={l.leaveId}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: isActive
                    ? "rgba(245,158,11,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: isActive
                    ? "1px solid rgba(245,158,11,0.3)"
                    : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div>
                  {isAdmin && (
                    <p className="text-white text-sm font-medium">
                      {staffName(l.personnelId)}
                    </p>
                  )}
                  <p className="text-slate-300 text-xs">
                    {l.startDate} → {l.endDate}
                    {isActive && (
                      <span className="ml-2 text-amber-400 font-semibold">
                        ● Aktif
                      </span>
                    )}
                  </p>
                  <p className="text-slate-500 text-xs">{l.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(l.leaveId)}
                  className="px-3 py-1 rounded-lg text-xs text-red-400"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                  }}
                >
                  Sil
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
