import React, { useState } from "react";
import {
  deleteEquipmentItem,
  getEquipmentItems,
  getEquipmentLoans,
  saveEquipmentItem,
  saveEquipmentLoan,
} from "../store";
import type {
  EquipmentItem,
  EquipmentLoan,
  SentryNotification,
  Visitor,
} from "../types";
import { generateId } from "../utils";

const CATEGORY_LABELS: Record<string, string> = {
  electronics: "💻 Elektronik",
  badge: "🎟️ Kart/Rozet",
  safety: "⚠️ Güvenlik",
  key: "🔑 Anahtar",
  other: "📦 Diğer",
};

interface Props {
  companyId: string;
  visitors: Visitor[];
  addNotificationFn: (n: SentryNotification) => void;
}

type SubTab = "inventory" | "active_loans";

interface ItemForm {
  name: string;
  category: EquipmentItem["category"];
  totalQuantity: number;
  notes: string;
}

const EMPTY_ITEM_FORM: ItemForm = {
  name: "",
  category: "other",
  totalQuantity: 1,
  notes: "",
};

interface LoanForm {
  visitorId: string;
  equipmentId: string;
  expectedReturnAt: string;
  notes: string;
}

const EMPTY_LOAN_FORM: LoanForm = {
  visitorId: "",
  equipmentId: "",
  expectedReturnAt: "",
  notes: "",
};

export default function EquipmentLoanTab({
  companyId,
  visitors,
  addNotificationFn,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("inventory");
  const [_tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);

  const items = getEquipmentItems(companyId);
  const loans = getEquipmentLoans(companyId);
  const activeLoans = loans.filter(
    (l) => l.status === "active" || l.status === "overdue",
  );

  // Overdue check
  const now = Date.now();
  for (const loan of activeLoans) {
    if (
      loan.status === "active" &&
      loan.expectedReturnAt &&
      now > loan.expectedReturnAt
    ) {
      saveEquipmentLoan({ ...loan, status: "overdue" });
      addNotificationFn({
        id: generateId(),
        companyId,
        type: "warning",
        message: `⏰ Gecikmiş ekipman iade: ${loan.equipmentName} — ${loan.visitorName}`,
        createdAt: Date.now(),
        read: false,
        relatedId: loan.id,
      });
    }
  }

  // Item form
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItem, setEditItem] = useState<EquipmentItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(EMPTY_ITEM_FORM);

  const openAddItem = () => {
    setEditItem(null);
    setItemForm(EMPTY_ITEM_FORM);
    setShowItemForm(true);
  };
  const openEditItem = (item: EquipmentItem) => {
    setEditItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      totalQuantity: item.totalQuantity,
      notes: item.notes ?? "",
    });
    setShowItemForm(true);
  };
  const saveItem = () => {
    if (!itemForm.name.trim()) return;
    const existing = editItem;
    const item: EquipmentItem = {
      id: existing?.id ?? generateId(),
      companyId,
      name: itemForm.name.trim(),
      category: itemForm.category,
      totalQuantity: itemForm.totalQuantity,
      availableQuantity: existing
        ? existing.availableQuantity +
          (itemForm.totalQuantity - existing.totalQuantity)
        : itemForm.totalQuantity,
      notes: itemForm.notes || undefined,
    };
    saveEquipmentItem(item);
    setShowItemForm(false);
    reload();
  };

  // Loan form
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [loanForm, setLoanForm] = useState<LoanForm>(EMPTY_LOAN_FORM);
  const [loanError, setLoanError] = useState("");

  const submitLoan = () => {
    if (!loanForm.visitorId || !loanForm.equipmentId) {
      setLoanError("Ziyaretçi ve ekipman seçiniz");
      return;
    }
    const item = items.find((i) => i.id === loanForm.equipmentId);
    if (!item) return;
    if (item.availableQuantity <= 0) {
      setLoanError("Bu ekipman şu an mevcut değil");
      return;
    }
    const visitor = visitors.find((v) => v.visitorId === loanForm.visitorId);
    if (!visitor) return;
    const loan: EquipmentLoan = {
      id: generateId(),
      companyId,
      equipmentId: item.id,
      equipmentName: item.name,
      visitorId: visitor.visitorId,
      visitorName: visitor.name,
      loanedAt: Date.now(),
      expectedReturnAt: loanForm.expectedReturnAt
        ? new Date(loanForm.expectedReturnAt).getTime()
        : undefined,
      status: "active",
      notes: loanForm.notes || undefined,
    };
    saveEquipmentLoan(loan);
    saveEquipmentItem({
      ...item,
      availableQuantity: item.availableQuantity - 1,
    });
    setShowLoanForm(false);
    setLoanForm(EMPTY_LOAN_FORM);
    setLoanError("");
    reload();
  };

  const returnLoan = (loan: EquipmentLoan) => {
    saveEquipmentLoan({ ...loan, status: "returned", returnedAt: Date.now() });
    const item = items.find((i) => i.id === loan.equipmentId);
    if (item)
      saveEquipmentItem({
        ...item,
        availableQuantity: item.availableQuantity + 1,
      });
    reload();
  };

  const refreshedLoans = getEquipmentLoans(companyId);
  const refreshedItems = getEquipmentItems(companyId);
  const refreshedActive = refreshedLoans.filter(
    (l) => l.status === "active" || l.status === "overdue",
  );

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">
          🔧 Ekipman Ödünç Takibi
        </h2>
        <button
          type="button"
          data-ocid="equipment_loan.open_modal_button"
          onClick={() => {
            setLoanForm(EMPTY_LOAN_FORM);
            setLoanError("");
            setShowLoanForm(true);
          }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
        >
          + Yeni Ödünç
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-6">
        {(["inventory", "active_loans"] as const).map((st) => (
          <button
            key={st}
            type="button"
            data-ocid={`equipment_loan.${st}.tab`}
            onClick={() => setSubTab(st)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={
              subTab === st
                ? {
                    background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                    color: "#fff",
                  }
                : { background: "rgba(255,255,255,0.05)", color: "#94a3b8" }
            }
          >
            {st === "inventory"
              ? `📦 Envanter (${refreshedItems.length})`
              : `🔗 Aktif Ödünçler (${refreshedActive.length})`}
          </button>
        ))}
      </div>

      {subTab === "inventory" && (
        <div>
          <div className="flex justify-end mb-3">
            <button
              type="button"
              data-ocid="equipment_loan.add_button"
              onClick={openAddItem}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{
                background: "rgba(34,197,94,0.2)",
                border: "1px solid rgba(34,197,94,0.4)",
              }}
            >
              + Ekipman Ekle
            </button>
          </div>
          {refreshedItems.length === 0 ? (
            <div
              data-ocid="equipment_loan.empty_state"
              className="text-center py-12 text-slate-500"
            >
              Henüz ekipman tanımlanmadı. Yukarıdan ekipman ekleyin.
            </div>
          ) : (
            <div className="space-y-2">
              {refreshedItems.map((item, i) => (
                <div
                  key={item.id}
                  data-ocid={`equipment_loan.item.${i + 1}`}
                  className="flex items-center justify-between p-4 rounded-2xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div>
                    <span className="text-white font-semibold">
                      {item.name}
                    </span>
                    <span className="text-slate-400 text-xs ml-2">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    {item.notes && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-teal-400 font-bold text-sm">
                        {item.availableQuantity}/{item.totalQuantity}
                      </div>
                      <div className="text-slate-500 text-xs">
                        mevcut / toplam
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid={`equipment_loan.edit_button.${i + 1}`}
                      onClick={() => openEditItem(item)}
                      className="px-2 py-1 rounded text-xs text-slate-400 hover:text-white"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      data-ocid={`equipment_loan.delete_button.${i + 1}`}
                      onClick={() => {
                        deleteEquipmentItem(companyId, item.id);
                        reload();
                      }}
                      className="px-2 py-1 rounded text-xs text-red-400 hover:text-red-300"
                      style={{ background: "rgba(239,68,68,0.1)" }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "active_loans" && (
        <div>
          {refreshedActive.length === 0 ? (
            <div
              data-ocid="equipment_loan.empty_state"
              className="text-center py-12 text-slate-500"
            >
              Aktif ödünç bulunmuyor.
            </div>
          ) : (
            <div className="space-y-2">
              {refreshedActive.map((loan, i) => {
                const isOverdue =
                  loan.status === "overdue" ||
                  (loan.expectedReturnAt !== undefined &&
                    now > loan.expectedReturnAt);
                return (
                  <div
                    key={loan.id}
                    data-ocid={`equipment_loan.item.${i + 1}`}
                    className="flex items-center justify-between p-4 rounded-2xl flex-wrap gap-3"
                    style={{
                      background: isOverdue
                        ? "rgba(239,68,68,0.07)"
                        : "rgba(14,165,233,0.06)",
                      border: `1.5px solid ${isOverdue ? "rgba(239,68,68,0.3)" : "rgba(14,165,233,0.2)"}`,
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-semibold">
                          {loan.equipmentName}
                        </span>
                        <span className="text-slate-400 text-sm">
                          → {loan.visitorName}
                        </span>
                        {isOverdue && (
                          <span
                            data-ocid={`equipment_loan.error_state.${i + 1}`}
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                              background: "rgba(239,68,68,0.25)",
                              color: "#f87171",
                            }}
                          >
                            ⏰ Gecikmiş
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        Ödünç: {new Date(loan.loanedAt).toLocaleString("tr-TR")}
                        {loan.expectedReturnAt && (
                          <span className="ml-2">
                            | İade:{" "}
                            {new Date(loan.expectedReturnAt).toLocaleString(
                              "tr-TR",
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid={`equipment_loan.confirm_button.${i + 1}`}
                      onClick={() => returnLoan(loan)}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
                      style={{
                        background: "rgba(34,197,94,0.2)",
                        border: "1px solid rgba(34,197,94,0.4)",
                      }}
                    >
                      ✅ Teslim Alındı
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* New Loan Modal */}
      {showLoanForm && (
        <div
          data-ocid="equipment_loan.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowLoanForm(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowLoanForm(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: "#0f172a",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Yeni Ödünç</h3>
              <button
                type="button"
                data-ocid="equipment_loan.close_button"
                onClick={() => setShowLoanForm(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-xs mb-1">Aktif Ziyaretçi *</p>
                <select
                  data-ocid="equipment_loan.select"
                  value={loanForm.visitorId}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, visitorId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                >
                  <option value="">Seçiniz...</option>
                  {visitors.map((v) => (
                    <option key={v.visitorId} value={v.visitorId}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Ekipman *</p>
                <select
                  data-ocid="equipment_loan.select"
                  value={loanForm.equipmentId}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, equipmentId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                >
                  <option value="">Seçiniz...</option>
                  {refreshedItems
                    .filter((i) => i.availableQuantity > 0)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.availableQuantity} mevcut)
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">
                  Beklenen İade Zamanı
                </p>
                <input
                  data-ocid="equipment_loan.input"
                  type="datetime-local"
                  value={loanForm.expectedReturnAt}
                  onChange={(e) =>
                    setLoanForm({
                      ...loanForm,
                      expectedReturnAt: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Not</p>
                <input
                  data-ocid="equipment_loan.input"
                  type="text"
                  value={loanForm.notes}
                  onChange={(e) =>
                    setLoanForm({ ...loanForm, notes: e.target.value })
                  }
                  placeholder="İsteğe bağlı..."
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                />
              </div>
              {loanError && (
                <p
                  data-ocid="equipment_loan.error_state"
                  className="text-red-400 text-xs"
                >
                  {loanError}
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                data-ocid="equipment_loan.submit_button"
                onClick={submitLoan}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                ✅ Ödünç Ver
              </button>
              <button
                type="button"
                data-ocid="equipment_loan.cancel_button"
                onClick={() => setShowLoanForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Add/Edit Modal */}
      {showItemForm && (
        <div
          data-ocid="equipment_loan.modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowItemForm(false)}
          onKeyDown={(e) => e.key === "Escape" && setShowItemForm(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{
              background: "#0f172a",
              border: "1.5px solid rgba(14,165,233,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">
                {editItem ? "Ekipman Düzenle" : "Yeni Ekipman"}
              </h3>
              <button
                type="button"
                data-ocid="equipment_loan.close_button"
                onClick={() => setShowItemForm(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-slate-400 text-xs mb-1">Ad *</p>
                <input
                  data-ocid="equipment_loan.input"
                  type="text"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  placeholder="örn. Laptop, Baret, Güvenlik Yeleği"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Kategori</p>
                <select
                  data-ocid="equipment_loan.select"
                  value={itemForm.category}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      category: e.target.value as EquipmentItem["category"],
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Toplam Adet</p>
                <input
                  data-ocid="equipment_loan.input"
                  type="number"
                  min={1}
                  value={itemForm.totalQuantity}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      totalQuantity: Number.parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">Not</p>
                <input
                  data-ocid="equipment_loan.input"
                  type="text"
                  value={itemForm.notes}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, notes: e.target.value })
                  }
                  placeholder="İsteğe bağlı..."
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/10 border border-white/20 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                data-ocid="equipment_loan.save_button"
                onClick={saveItem}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg,#0ea5e9,#0284c7)",
                }}
              >
                Kaydet
              </button>
              <button
                type="button"
                data-ocid="equipment_loan.cancel_button"
                onClick={() => setShowItemForm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400"
                style={{ background: "rgba(255,255,255,0.06)" }}
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
