import { jsPDF } from "jspdf";
import { regularFont, boldFont } from "./pdf-fonts";
import QRCode from "qrcode";
import { logo } from "./brand";
import type { Bank } from "./payments";

const money = (n: unknown) =>
  "Rs " + Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 });
// Stored, approved amounts are authoritative; historical invoices are never recalculated.
export async function invoicePdf(inv: any, banks: Bank[], url?: string) {
  const doc = new jsPDF({
      format: "a5",
      unit: "mm",
      compress: true,
      putOnlyUsedFonts: true,
    }),
    right = 136,
    width = 124;
  doc.addFileToVFS("Catcore-Regular.ttf", regularFont);
  doc.addFont("Catcore-Regular.ttf", "Catcore", "normal");
  doc.addFileToVFS("Catcore-Bold.ttf", boldFont);
  doc.addFont("Catcore-Bold.ttf", "Catcore", "bold");
  doc.setFont("Catcore", "normal");
  const cyan = () => doc.setTextColor(7, 157, 183),
    normal = () => {
      doc.setFont("Catcore", "normal");
      doc.setFontSize(8);
      doc.setTextColor(55, 55, 55);
    };
  let y = 0;
  const header = (continued = false) => {
    doc.setFillColor(7, 157, 183);
    doc.rect(12, 10, width, 1.5, "F");
    doc.addImage(logo, "PNG", 96, 18, 40, 16);
    cyan();
    doc.setFont("Catcore", "bold");
    doc.setFontSize(22);
    doc.text("Invoice", 12, 34);
    doc.setFontSize(8);
    doc.text(String(inv.invoice_number || "DRAFT - pending approval"), 12, 40);
    normal();
    doc.text("Issued " + String(inv.issue_date).slice(0, 10), 12, 46);
    doc.text("Due " + String(inv.due_date || "-").slice(0, 10), right, 46, {
      align: "right",
    });
    y = 55;
    if (continued) {
      doc.text("Continued", 12, y);
      y += 8;
    }
  };
  const room = (height: number) => {
    if (y + height > 164) {
      doc.addPage();
      header(true);
    }
  };
  const lines = (text: unknown, x: number, maxWidth: number) => {
    const wrapped = doc.splitTextToSize(
      String(text || ""),
      maxWidth,
    ) as string[];
    for (const line of wrapped) {
      room(4);
      doc.text(line, x, y);
      y += 4;
    }
  };
  header();
  doc.setFont("Catcore", "bold");
  doc.text("Invoice to", 12, y);
  y += 5;
  normal();
  for (const text of [
    inv.client_snapshot.contact_name,
    inv.client_snapshot.company_name,
    inv.client_snapshot.address,
    inv.client_snapshot.ntn ? "NTN: " + inv.client_snapshot.ntn : "",
  ])
    if (text) lines(text, 12, 100);
  y += 5;
  const tableHead = () => {
    room(9);
    cyan();
    doc.setFont("Catcore", "bold");
    doc.text("Description", 12, y);
    doc.text("Qty", 85, y, { align: "right" });
    doc.text("Unit price", 108, y, { align: "right" });
    doc.text("Total price", right, y, { align: "right" });
    y += 6;
    normal();
  };
  tableHead();
  const row = (
    description: string,
    qty: string,
    rate: string,
    total: string,
    index: number,
  ) => {
    const wrapped = doc.splitTextToSize(description, 63) as string[];
    const h = Math.max(7, wrapped.length * 3.7 + 3);
    if (y + h > 164) {
      doc.addPage();
      header(true);
      tableHead();
    }
    // Long descriptions flow across pages instead of overlapping the footer.
    const chunks = [];
    for (let i = 0; i < wrapped.length; i += 20)
      chunks.push(wrapped.slice(i, i + 20));
    for (let n = 0; n < chunks.length; n++) {
      const chunk = chunks[n],
        height = Math.max(7, chunk.length * 3.7 + 3);
      if (y + height > 164) {
        doc.addPage();
        header(true);
        tableHead();
      }
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(12, y - 3, width, height, "F");
      }
      doc.text(chunk, 13, y, { lineHeightFactor: 1.3 });
      if (n === 0) {
        doc.text(qty, 85, y, { align: "right" });
        doc.text(rate, 108, y, { align: "right" });
        doc.text(total, right - 1, y, { align: "right" });
      }
      y += height;
    }
  };
  let idx = 0;
  for (const item of inv.line_items) {
    row(
      String(item.description),
      String(item.quantity),
      money(item.rate),
      money(item.amount ?? Number(item.quantity) * Number(item.rate)),
      idx++,
    );
    if (Number(item.card_tax_amount) > 0)
      row(
        "Card tax (" + item.card_tax_rate + "%) - " + item.description,
        "",
        "",
        money(item.card_tax_amount),
        idx++,
      );
  }
  y += 4;
  room(42);
  const summary = (label: string, value: unknown) => {
    doc.text(label, 80, y);
    doc.text(money(value), right, y, { align: "right" });
    y += 5;
  };
  summary("Subtotal", inv.subtotal);
  if (Number(inv.discount)) summary("Discount", -Number(inv.discount));
  const cardTax = inv.line_items.reduce(
    (s: number, x: any) => s + Number(x.card_tax_amount || 0),
    0,
  );
  if (cardTax) summary("Card tax", cardTax);
  summary("Invoice tax (" + Number(inv.tax_rate || 0) + "%)", inv.tax_amount);
  if (Number(inv.delivery)) summary("Delivery", inv.delivery);
  cyan();
  doc.setFont("Catcore", "bold");
  doc.setFontSize(12);
  doc.text("Total", 80, y + 2);
  doc.text(money(inv.total), right, y + 2, { align: "right" });
  y += 12;
  normal();
  if (inv.notes) {
    lines("Notes", 12, width);
    lines(inv.notes, 12, width);
  }
  const bank = banks.find((b) => b.is_default);
  const bankLines = bank
    ? [
        bank.name,
        bank.title,
        bank.account ? "Account: " + bank.account : "",
        bank.iban ? "IBAN: " + bank.iban : "",
      ].filter(Boolean)
    : ["Contact info@catcoresolutions.com for payment details."];
  // A5 footer reserved for the official bank and a scannable online-view QR.
  const footerLines = bankLines.flatMap(
    (s) => doc.splitTextToSize(s, url ? 89 : 124) as string[],
  );
  if (footerLines.length > 5) {
    room(footerLines.length * 4 + 8);
    lines("Official bank transfer", 12, width);
    for (const line of footerLines) lines(line, 12, width);
    footerLines.length = 0;
  }
  if (y > 161) {
    doc.addPage();
    header(true);
  }
  const last = doc.getNumberOfPages();
  for (let page = 1; page <= last; page++) {
    doc.setPage(page);
    normal();
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text("Catcore Solutions | info@catcoresolutions.com", 12, 202);
    doc.text(page + " / " + last, right, 202, { align: "right" });
  }
  doc.setPage(last);
  normal();
  doc.setDrawColor(210, 210, 210);
  doc.line(12, 170, right, 170);
  doc.setFont("Catcore", "bold");
  doc.text("Official bank transfer", 12, 176);
  normal();
  doc.setFontSize(7);
  footerLines.forEach((line, i) => doc.text(line, 12, 181 + i * 3.4));
  if (url) {
    const qr = await QRCode.toDataURL(url, {
      margin: 1,
      errorCorrectionLevel: "M",
      width: 320,
    });
    doc.addImage(qr, "PNG", 111, 173, 25, 25);
    cyan();
    doc.setFontSize(7);
    doc.textWithLink("View invoice & payment options", 12, 198, { url });
    doc.link(111, 173, 25, 25, { url });
  } else {
    doc.setFontSize(7);
    doc.text("Online link and QR are added after approval.", 12, 198);
  }
  return Buffer.from(doc.output("arraybuffer"));
}
