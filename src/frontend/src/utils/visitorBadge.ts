import type { Visitor } from "../types";

function drawQrPattern(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
) {
  const cells = 21;
  const cell = size / cells;
  const hash = value.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  ctx.fillStyle = "white";
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = "black";
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      const isFinder =
        (r < 7 && c < 7) ||
        (r < 7 && c >= cells - 7) ||
        (r >= cells - 7 && c < 7);
      const filled = isFinder || (hash * (r + 1) * (c + 1)) % 3 === 0;
      if (filled) {
        ctx.fillRect(x + c * cell, y + r * cell, cell, cell);
      }
    }
  }
}

type LangLabels = {
  id: string;
  phone: string;
  reason: string;
  host: string;
  entry: string;
  signature: string;
  plate?: string;
};

const LANG_LABELS: Record<string, LangLabels> = {
  EN: {
    id: "TC / ID",
    phone: "Telefon / Phone",
    reason: "Ziyaret Nedeni / Reason",
    host: "Ev Sahibi / Host",
    entry: "Giriş Saati / Entry",
    signature: "İmza / Signature",
    plate: "Araç Plakası / Plate",
  },
  DE: {
    id: "TC / Kimlik",
    phone: "Telefon / Telefon",
    reason: "Ziyaret Nedeni / Besuchsgrund",
    host: "Ev Sahibi / Gastgeber",
    entry: "Giriş Saati / Ankunftszeit",
    signature: "İmza / Unterschrift",
    plate: "Araç Plakası / Kennzeichen",
  },
  FR: {
    id: "TC / Identité",
    phone: "Téléphone / Téléphone",
    reason: "Ziyaret Nedeni / Motif",
    host: "Ev Sahibi / Hôte",
    entry: "Giriş Saati / Heure d'arrivée",
    signature: "İmza / Signature",
    plate: "Araç Plakası / Plaque",
  },
  ES: {
    id: "TC / Identidad",
    phone: "Teléfono / Teléfono",
    reason: "Ziyaret Nedeni / Motivo",
    host: "Ev Sahibi / Anfitrión",
    entry: "Giriş Saati / Hora llegada",
    signature: "İmza / Firma",
  },
  AR: {
    id: "TC / ID",
    phone: "Telefon / Phone",
    reason: "Ziyaret Nedeni / Reason",
    host: "Ev Sahibi / Host",
    entry: "Giriş Saati / Entry",
    signature: "İmza / Signature",
    plate: "Araç Plakası / Plate",
  },
  RU: {
    id: "TC / Уд. личности",
    phone: "Телефон / Телефон",
    reason: "Причина / Причина",
    host: "Принимает / Принимающий",
    entry: "Время входа / Время",
    signature: "Подпись / Подпись",
  },
  ZH: {
    id: "TC / 证件",
    phone: "电话 / 电话",
    reason: "原因 / 原因",
    host: "接待 / 接待",
    entry: "入场 / 入场时间",
    signature: "签名 / 签名",
  },
  PT: {
    id: "TC / Identidade",
    phone: "Telefone / Telefone",
    reason: "Motivo / Motivo",
    host: "Anfitrião / Anfitrião",
    entry: "Entrada / Hora",
    signature: "Assinatura / Assinatura",
  },
};

const DEFAULT_LABELS: LangLabels = {
  id: "TC / ID",
  phone: "Telefon / Phone",
  reason: "Ziyaret Nedeni / Reason",
  host: "Ev Sahibi / Host",
  entry: "Giriş Saati / Entry",
  signature: "İmza / Signature",
  plate: "Araç Plakası / Plate",
};

function getLabels(lang?: string): LangLabels {
  if (!lang || lang === "TR") return DEFAULT_LABELS;
  return LANG_LABELS[lang] ?? DEFAULT_LABELS;
}

export async function generateVisitorBadgePDF(
  visitor: Visitor,
  companyName: string,
  hostName?: string,
  printMode = false,
  visitorLanguage?: string,
): Promise<void> {
  const W = 559;
  const H = 794;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const langCode = visitorLanguage ?? visitor.visitorLanguage;
  const labels = getLabels(langCode);

  ctx.fillStyle = "#0a0f1e";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(0, 0, W, 60);

  ctx.fillStyle = "white";
  ctx.font = "bold 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(companyName.toUpperCase(), W / 2, 38);

  const badgeSubtitle =
    langCode && langCode !== "TR"
      ? `ZIYARETCI GIRIS BELGESI  ·  TR / ${langCode}`
      : "ZIYARETCI GIRIS BELGESI / VISITOR BADGE";

  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px sans-serif";
  ctx.fillText(badgeSubtitle, W / 2, 80);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText(visitor.name, W / 2, 120);

  const labelColors: Record<string, string> = {
    vip: "#f59e0b",
    attention: "#f97316",
    restricted: "#a855f7",
    normal: "#0ea5e9",
  };
  ctx.fillStyle = labelColors[visitor.label] ?? "#0ea5e9";
  ctx.beginPath();
  ctx.roundRect(W / 2 - 40, 130, 80, 24, 6);
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText(visitor.label.toUpperCase(), W / 2, 147);

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 168);
  ctx.lineTo(W - 20, 168);
  ctx.stroke();

  const maskedId = `${visitor.idNumber.slice(0, 3)}***${visitor.idNumber.slice(-2)}`;
  const fields: [string, string][] = [
    [labels.id, maskedId],
    [labels.phone, visitor.phone],
    [labels.reason, visitor.visitReason || "-"],
    [labels.host, hostName ?? visitor.hostStaffId],
    [labels.entry, new Date(visitor.arrivalTime).toLocaleString("tr-TR")],
    [
      "NDA",
      visitor.ndaAccepted ? "Imzalandi / Signed" : "Imzalanmadi / Not Signed",
    ],
  ];
  if (visitor.vehiclePlate) {
    fields.push([labels.plate ?? "Araç Plakası / Plate", visitor.vehiclePlate]);
  }

  let y = 200;
  for (const [label, value] of fields) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${label}:`, 30, y);
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(value), 220, y);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(20, y + 10);
    ctx.lineTo(W - 20, y + 10);
    ctx.stroke();
    y += 36;
  }

  const qrSize = 140;
  drawQrPattern(ctx, visitor.badgeQr, W / 2 - qrSize / 2, y + 10, qrSize);
  y += qrSize + 20;

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`ID: ${visitor.visitorId}`, W / 2, y + 10);
  y += 20;

  if (visitor.signatureData) {
    try {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${labels.signature}:`, 30, y + 20);
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = visitor.signatureData;
      });
      ctx.drawImage(img, 30, y + 30, 200, 60);
      y += 100;
    } catch {
      // skip
    }
  }

  ctx.fillStyle = "#0ea5e9";
  ctx.fillRect(0, H - 40, W, 40);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `Safentry Visitor Management | ${new Date().getFullYear()}`,
    W / 2,
    H - 15,
  );

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (printMode) {
      const win = window.open(url, "_blank");
      if (win) {
        win.onload = () => {
          win.focus();
          win.print();
        };
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = `ziyaretci-${visitor.visitorId}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }, "image/png");
}
