import type { Visitor } from "../types";

export async function generateVisitorBadgePDF(
  visitor: Visitor,
  companyName: string,
  hostName?: string,
) {
  const { jsPDF } = await import("jspdf");
  const QRCode = await import("qrcode");

  const doc = new jsPDF({ format: "a5", unit: "mm" });
  const W = 148;
  const H = 210;

  // Background
  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, W, H, "F");

  // Header bar
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, W, 18, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(companyName.toUpperCase(), W / 2, 12, { align: "center" });

  // Title
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("ZIYARETCI GIRIS BELGESI / VISITOR BADGE", W / 2, 24, {
    align: "center",
  });

  // Visitor name
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(241, 245, 249);
  doc.text(visitor.name, W / 2, 36, { align: "center" });

  // Label badge
  const labelColors: Record<string, [number, number, number]> = {
    vip: [245, 158, 11],
    attention: [249, 115, 22],
    restricted: [239, 68, 68],
    normal: [14, 165, 233],
  };
  const [lr, lg, lb] = labelColors[visitor.label] ?? labelColors.normal;
  doc.setFillColor(lr, lg, lb);
  doc.roundedRect(W / 2 - 15, 39, 30, 7, 2, 2, "F");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(visitor.label.toUpperCase(), W / 2, 44, { align: "center" });

  // Info fields
  const maskedId = `${visitor.idNumber.slice(0, 3)}***${visitor.idNumber.slice(-2)}`;
  const fields: [string, string][] = [
    ["TC / ID", maskedId],
    ["Telefon / Phone", visitor.phone],
    ["Ziyaret Nedeni / Reason", visitor.visitReason],
    ["Ev Sahibi / Host", hostName ?? visitor.hostStaffId],
    [
      "Giris Saati / Entry",
      new Date(visitor.arrivalTime).toLocaleString("tr-TR"),
    ],
    [
      "NDA",
      visitor.ndaAccepted ? "Imzalandi / Signed" : "Imzalanmadi / Not Signed",
    ],
  ];

  doc.setFontSize(8);
  let y = 56;
  for (const [label, value] of fields) {
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, 10, y);
    doc.setTextColor(241, 245, 249);
    doc.setFont("helvetica", "bold");
    doc.text(String(value), 55, y);
    doc.setDrawColor(30, 41, 59);
    doc.line(10, y + 2, W - 10, y + 2);
    y += 10;
  }

  // QR code
  try {
    const qrDataUrl = await QRCode.toDataURL(visitor.badgeQr, {
      width: 80,
      margin: 1,
      color: { dark: "#f1f5f9", light: "#0a0f1e" },
    });
    doc.addImage(qrDataUrl, "PNG", W / 2 - 20, y, 40, 40);
    y += 44;
  } catch {
    // skip
  }

  // Signature
  if (visitor.signatureData) {
    try {
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("Imza / Signature:", 10, y + 5);
      doc.addImage(visitor.signatureData, "PNG", 10, y + 8, 60, 20);
      y += 32;
    } catch {
      // skip
    }
  }

  // Footer
  doc.setFillColor(14, 165, 233);
  doc.rect(0, H - 12, W, 12, "F");
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(`ID: ${visitor.visitorId} | Safentry`, W / 2, H - 5, {
    align: "center",
  });

  doc.save(`ziyaretci-${visitor.visitorId}.pdf`);
}
