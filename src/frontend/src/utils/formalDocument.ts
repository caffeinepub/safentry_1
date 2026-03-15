import type { Visitor } from "../types";

export function printFormalDocument(
  visitor: Visitor,
  companyName: string,
  hostName: string,
) {
  const refNumber = `VIS-${new Date(visitor.arrivalTime).toISOString().slice(0, 10).replace(/-/g, "")}-${visitor.visitorId.toUpperCase().slice(0, 4)}`;
  const entryDate = new Date(visitor.arrivalTime).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const entryTime = new Date(visitor.arrivalTime).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>Ziyaretçi Giriş Belgesi - ${refNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      color: #000;
      background: #fff;
      padding: 2cm;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-name {
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 8px 0 4px;
    }
    .ref {
      font-size: 10pt;
      color: #555;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 1px solid #888;
      padding-bottom: 4px;
      margin-bottom: 12px;
      color: #333;
    }
    .field-row {
      display: flex;
      align-items: baseline;
      margin-bottom: 10px;
      gap: 8px;
    }
    .field-label {
      font-weight: bold;
      min-width: 180px;
      font-size: 11pt;
    }
    .field-value {
      border-bottom: 1px solid #aaa;
      flex: 1;
      padding-bottom: 2px;
      font-size: 11pt;
      min-height: 20px;
    }
    .signatures {
      display: flex;
      gap: 40px;
      margin-top: 40px;
    }
    .sig-box {
      flex: 1;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #000;
      margin-top: 60px;
      padding-top: 6px;
      font-size: 10pt;
      font-weight: bold;
    }
    .sig-sub {
      font-size: 9pt;
      color: #555;
      margin-top: 2px;
    }
    .footer {
      margin-top: 40px;
      border-top: 1px solid #ccc;
      padding-top: 10px;
      text-align: center;
      font-size: 9pt;
      color: #777;
    }
    .stamp-area {
      display: inline-block;
      width: 100px;
      height: 100px;
      border: 1px dashed #ccc;
      text-align: center;
      padding: 10px;
      font-size: 8pt;
      color: #999;
      vertical-align: top;
      margin-left: 20px;
    }
    @media print {
      body { padding: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${escapeHtml(companyName)}</div>
    <div class="doc-title">Ziyaretçi Giriş Belgesi</div>
    <div class="ref">Referans No: ${refNumber}</div>
  </div>

  <div class="section">
    <div class="section-title">Ziyaretçi Bilgileri</div>
    <div class="field-row">
      <span class="field-label">Ad Soyad:</span>
      <span class="field-value">${escapeHtml(visitor.name)}</span>
    </div>
    <div class="field-row">
      <span class="field-label">TC / Pasaport No:</span>
      <span class="field-value">${escapeHtml(visitor.idNumber)}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Telefon:</span>
      <span class="field-value">${escapeHtml(visitor.phone || "-")}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Kurum / Şirket:</span>
      <span class="field-value">${escapeHtml(visitor.visitReason || "-")}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Ziyaret Bilgileri</div>
    <div class="field-row">
      <span class="field-label">Ev Sahibi Personel:</span>
      <span class="field-value">${escapeHtml(hostName || "-")}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Ziyaret Amacı:</span>
      <span class="field-value">${escapeHtml(visitor.visitType || "-")}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Kategori:</span>
      <span class="field-value">${escapeHtml(visitor.category || "-")}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Giriş Tarihi:</span>
      <span class="field-value">${entryDate}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Giriş Saati:</span>
      <span class="field-value">${entryTime}</span>
    </div>
    <div class="field-row">
      <span class="field-label">Tahmini Çıkış Saati:</span>
      <span class="field-value">&nbsp;</span>
    </div>
    ${
      visitor.vehiclePlate
        ? `
    <div class="field-row">
      <span class="field-label">Araç Plakası:</span>
      <span class="field-value">${escapeHtml(visitor.vehiclePlate)}</span>
    </div>`
        : ""
    }
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div style="font-size:10pt; color:#555; margin-bottom:4px;">Ziyaretçi İmzası</div>
      <div class="sig-line">${escapeHtml(visitor.name)}</div>
      <div class="sig-sub">Tarih: ${entryDate}</div>
    </div>
    <div class="sig-box">
      <div style="font-size:10pt; color:#555; margin-bottom:4px;">Güvenlik Görevlisi İmzası</div>
      <div class="sig-line">&nbsp;</div>
      <div class="sig-sub">İsim / Sicil No</div>
    </div>
    <div class="stamp-area">Kurum Kaşesi</div>
  </div>

  <div class="footer">
    Bu belge ${escapeHtml(companyName)} ziyaretçi yönetim sistemi tarafından otomatik olarak oluşturulmuştur.
    Belge no: ${refNumber} — ${new Date().toLocaleDateString("tr-TR")}
  </div>

  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=800,height=1000");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
