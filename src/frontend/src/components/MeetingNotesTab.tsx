import React, { useState } from "react";
import { deleteMeetingNote, getMeetingNotes, saveMeetingNote } from "../store";
import type { MeetingNote } from "../types";
import { generateId } from "../utils";

interface Props {
  companyId: string;
  staffName: string;
}

export default function MeetingNotesTab({ companyId, staffName }: Props) {
  const [notes, setNotes] = useState<MeetingNote[]>(() =>
    getMeetingNotes(companyId),
  );
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MeetingNote | null>(null);
  const [form, setForm] = useState({
    visitorName: "",
    hostName: staffName,
    summary: "",
    decisions: "",
    followUpItem: "",
  });
  const [followUps, setFollowUps] = useState<string[]>([]);

  const reload = () => setNotes(getMeetingNotes(companyId));

  const openNew = () => {
    setEditing(null);
    setForm({
      visitorName: "",
      hostName: staffName,
      summary: "",
      decisions: "",
      followUpItem: "",
    });
    setFollowUps([]);
    setShowModal(true);
  };

  const openEdit = (n: MeetingNote) => {
    setEditing(n);
    setForm({
      visitorName: n.visitorName,
      hostName: n.hostName,
      summary: n.summary,
      decisions: n.decisions,
      followUpItem: "",
    });
    setFollowUps([...n.followUpItems]);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.visitorName.trim() || !form.summary.trim()) return;
    const note: MeetingNote = {
      id: editing?.id ?? generateId(),
      companyId,
      visitId: editing?.visitId ?? "",
      visitorName: form.visitorName.trim(),
      hostName: form.hostName.trim(),
      summary: form.summary.trim(),
      decisions: form.decisions.trim(),
      followUpItems: followUps,
      createdAt: editing?.createdAt ?? Date.now(),
      createdBy: staffName,
    };
    saveMeetingNote(note);
    reload();
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteMeetingNote(companyId, id);
    reload();
  };

  const addFollowUp = () => {
    if (form.followUpItem.trim()) {
      setFollowUps((p) => [...p, form.followUpItem.trim()]);
      setForm((p) => ({ ...p, followUpItem: "" }));
    }
  };

  const filtered = notes.filter(
    (n) =>
      n.visitorName.toLowerCase().includes(search.toLowerCase()) ||
      new Date(n.createdAt).toLocaleDateString("tr-TR").includes(search),
  );

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
  };
  const inputCls =
    "w-full px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-[#0ea5e9]";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-xl">
            📝 Ziyaret Tutanakları
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">
            Ziyaret sonrası toplantı notları ve takip maddeleri
          </p>
        </div>
        <button
          type="button"
          data-ocid="tutanaklar.open_modal_button"
          onClick={openNew}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Yeni Tutanak
        </button>
      </div>

      <input
        data-ocid="tutanaklar.search_input"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Ziyaretçi adı veya tarih ara..."
        className={inputCls}
      />

      {filtered.length === 0 ? (
        <div
          data-ocid="tutanaklar.empty_state"
          className="text-center py-16 text-slate-500"
        >
          <div className="text-4xl mb-2">📝</div>
          <p>Henüz tutanak yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((n, i) => (
            <div
              key={n.id}
              data-ocid={`tutanaklar.item.${i + 1}`}
              className="p-4 rounded-xl"
              style={cardStyle}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold">
                      {n.visitorName}
                    </span>
                    <span className="text-xs text-slate-400">
                      — {n.hostName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(n.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-1 line-clamp-2">
                    {n.summary}
                  </p>
                  {n.decisions && (
                    <p className="text-amber-300 text-xs mt-1">
                      📌 {n.decisions}
                    </p>
                  )}
                  {n.followUpItems.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {n.followUpItems.map((fi, j) => (
                        <span
                          key={`fi-${n.id}-${j}`}
                          className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20"
                        >
                          ✓ {fi}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    data-ocid={`tutanaklar.edit_button.${i + 1}`}
                    onClick={() => openEdit(n)}
                    className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    data-ocid={`tutanaklar.delete_button.${i + 1}`}
                    onClick={() => handleDelete(n.id)}
                    className="text-xs px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300"
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          data-ocid="tutanaklar.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{
              background: "#0f1729",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <h3 className="text-white font-bold text-lg">
              {editing ? "Tutanak Düzenle" : "Yeni Tutanak"}
            </h3>

            <div>
              <p className="text-slate-400 text-xs mb-1">Ziyaretçi Adı *</p>
              <input
                data-ocid="tutanaklar.input"
                value={form.visitorName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, visitorName: e.target.value }))
                }
                className={inputCls}
                placeholder="Ziyaretçi adı"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Ev Sahibi</p>
              <input
                value={form.hostName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, hostName: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Toplantı Özeti *</p>
              <textarea
                data-ocid="tutanaklar.textarea"
                value={form.summary}
                onChange={(e) =>
                  setForm((p) => ({ ...p, summary: e.target.value }))
                }
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Toplantıda neler konuşuldu?"
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Alınan Kararlar</p>
              <textarea
                value={form.decisions}
                onChange={(e) =>
                  setForm((p) => ({ ...p, decisions: e.target.value }))
                }
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="Alınan kararlar..."
              />
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Takip Maddeleri</p>
              <div className="flex gap-2">
                <input
                  value={form.followUpItem}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, followUpItem: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addFollowUp()}
                  className={inputCls}
                  placeholder="Takip maddesi ekle..."
                />
                <button
                  type="button"
                  onClick={addFollowUp}
                  className="px-3 py-2 rounded-xl bg-teal-600 text-white text-sm"
                >
                  +
                </button>
              </div>
              {followUps.length > 0 && (
                <div className="mt-2 space-y-1">
                  {followUps.map((fi, j) => (
                    <div
                      key={`followup-${j}-${fi.slice(0, 10)}`}
                      className="flex items-center justify-between p-2 rounded-lg bg-white/5"
                    >
                      <span className="text-sm text-slate-300">✓ {fi}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setFollowUps((p) => p.filter((_, k) => k !== j))
                        }
                        className="text-red-400 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                data-ocid="tutanaklar.save_button"
                onClick={handleSave}
                disabled={!form.visitorName.trim() || !form.summary.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Kaydet
              </button>
              <button
                type="button"
                data-ocid="tutanaklar.cancel_button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-300"
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
