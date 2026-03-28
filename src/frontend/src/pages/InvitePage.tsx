import { useEffect, useState } from "react";
import LangSwitcher from "../components/LangSwitcher";
import SignatureCanvas from "../components/SignatureCanvas";
import {
  findCompanyById,
  findInvitationByToken,
  getCompanyDepartments,
  getCompanyFloors,
  saveInvitation,
} from "../store";
import type { AppScreen, Invitation } from "../types";

interface Props {
  token: string;
  onNavigate: (s: AppScreen) => void;
}

export default function InvitePage({ token, onNavigate }: Props) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [form, setForm] = useState({
    name: "",
    idNumber: "",
    phone: "",
    visitReason: "",
    department: "",
    floor: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const inv = findInvitationByToken(token);
    if (!inv) {
      setNotFound(true);
      return;
    }
    setInvitation(inv);
    if (
      inv.status === "submitted" ||
      inv.status === "approved" ||
      inv.status === "rejected"
    ) {
      setSubmitted(true);
    }
    setForm((f) => ({
      ...f,
      name: inv.preData?.name || "",
      idNumber: inv.preData?.idNumber || "",
      phone: inv.preData?.phone || "",
      visitReason: inv.preData?.visitReason || "",
      department: inv.preData?.department || "",
      floor: inv.preData?.floor || "",
    }));
  }, [token]);

  const company = invitation ? findCompanyById(invitation.companyId) : null;
  const departments = invitation
    ? getCompanyDepartments(invitation.companyId)
    : [];
  const floors = invitation ? getCompanyFloors(invitation.companyId) : [];

  const handleSubmit = () => {
    if (!form.name || !form.idNumber || !form.phone) {
      setError("Lütfen zorunlu alanları doldurun.");
      return;
    }
    if (!form.department || !form.floor) {
      setError("Departman ve kat seçiniz.");
      return;
    }
    if (!signatureData) {
      setError("Lütfen dijital imza atın.");
      return;
    }
    if (!invitation) return;
    const updated: Invitation = {
      ...invitation,
      status: "submitted",
      visitorName: form.name,
      preData: {
        name: form.name,
        idNumber: form.idNumber,
        phone: form.phone,
        visitReason: form.visitReason,
        hostName: invitation.hostName || "",
        department: form.department,
        floor: form.floor,
      },
    };
    saveInvitation(updated);
    setSubmitted(true);
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:border-[#0ea5e9] text-sm";
  const inputStyle = {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
  };

  if (notFound) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "#0a0f1e" }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-white text-xl font-bold mb-2">
            Davet Linki Geçersiz
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Bu davet linki bulunamadı veya süresi doldu.
          </p>
          <button
            type="button"
            onClick={() => onNavigate("welcome")}
            className="px-6 py-3 rounded-xl text-white font-semibold"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    const isRejected = invitation?.status === "rejected";
    const isApproved = invitation?.status === "approved";
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "#0a0f1e" }}
      >
        <div
          className="w-full max-w-md p-8 rounded-2xl text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1.5px solid rgba(14,165,233,0.3)",
          }}
        >
          {isRejected ? (
            <>
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-white text-xl font-bold mb-2">
                Başvurunuz Reddedildi
              </h2>
              {invitation?.rejectionReason && (
                <p className="text-red-400 text-sm mb-4">
                  {invitation.rejectionReason}
                </p>
              )}
              <p className="text-slate-400 text-sm">
                Lütfen ilgili personelle iletişime geçin.
              </p>
            </>
          ) : isApproved ? (
            <>
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-white text-xl font-bold mb-2">
                Girişiniz Onaylandı!
              </h2>
              <p className="text-slate-400 text-sm">
                Güvenlik görevlisi sizi karşılayacak.
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-white text-xl font-bold mb-2">
                Başvurunuz Alındı
              </h2>
              <p className="text-slate-300 text-sm mb-2">
                Güvenlik onayı bekleniyor...
              </p>
              <p className="text-slate-500 text-xs">
                Lütfen güvenlik görevlisini bekleyin. Başvurunuz inceleniyor.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0a0f1e" }}
      >
        <div className="text-slate-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0f1e" }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "linear-gradient(135deg,#0ea5e9,#0284c7)" }}
          >
            S
          </div>
          <div>
            <div className="text-white font-bold text-sm">Safentry</div>
            {company && (
              <div className="text-slate-400 text-xs">{company.name}</div>
            )}
          </div>
        </div>
        <LangSwitcher />
      </div>

      <div className="max-w-lg mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold mb-1">
            Ziyaretçi Başvurusu
          </h1>
          {invitation.hostName && (
            <p className="text-slate-400 text-sm">
              <span style={{ color: "#0ea5e9" }}>{invitation.hostName}</span>{" "}
              tarafından davet edildiniz
            </p>
          )}
        </div>

        {error && (
          <div
            data-ocid="invite.error_state"
            className="mb-4 p-4 rounded-xl border border-red-500/40 bg-red-900/25 text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <p className="text-slate-300 text-sm mb-1">Ad Soyad *</p>
            <input
              data-ocid="invite.name.input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Adınız ve soyadınız"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-1">TC / Pasaport No *</p>
            <input
              data-ocid="invite.idnumber.input"
              value={form.idNumber}
              onChange={(e) =>
                setForm((f) => ({ ...f, idNumber: e.target.value }))
              }
              placeholder="TC kimlik veya pasaport"
              maxLength={11}
              className={`${inputCls} font-mono`}
              style={inputStyle}
            />
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-1">Telefon *</p>
            <input
              data-ocid="invite.phone.input"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="05xx xxx xx xx"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <p className="text-slate-300 text-sm mb-1">Ziyaret Amacı</p>
            <input
              data-ocid="invite.reason.input"
              value={form.visitReason}
              onChange={(e) =>
                setForm((f) => ({ ...f, visitReason: e.target.value }))
              }
              placeholder="Ziyaret amacını yazın"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-slate-300 text-sm mb-1">Departman *</p>
              <select
                data-ocid="invite.department.select"
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
                className={inputCls}
                style={{
                  background: "#0f1729",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <option value="" className="bg-[#0f1729]">
                  Seçin...
                </option>
                {departments.map((d) => (
                  <option key={d} value={d} className="bg-[#0f1729]">
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-slate-300 text-sm mb-1">Kat *</p>
              <select
                data-ocid="invite.floor.select"
                value={form.floor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, floor: e.target.value }))
                }
                className={inputCls}
                style={{
                  background: "#0f1729",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <option value="" className="bg-[#0f1729]">
                  Seçin...
                </option>
                {floors.map((fl) => (
                  <option key={fl} value={fl} className="bg-[#0f1729]">
                    {fl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{
              background: "rgba(14,165,233,0.06)",
              border: "1.5px solid rgba(14,165,233,0.2)",
            }}
          >
            <p className="text-slate-300 text-xs mb-3">
              Kişisel verileriniz KVKK kapsamında ziyaret kaydı amacıyla
              işlenmektedir. Verileriniz 90 gün sonra otomatik olarak
              silinecektir.
            </p>
          </div>

          <div>
            <p className="text-slate-300 text-sm mb-2">Dijital İmza *</p>
            <SignatureCanvas
              value={signatureData}
              onChange={setSignatureData}
            />
          </div>

          <button
            type="button"
            data-ocid="invite.submit_button"
            onClick={handleSubmit}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}
          >
            Başvuruyu Gönder
          </button>
        </div>
      </div>
    </div>
  );
}
