import { NextResponse } from "next/server";
import { Resend } from "resend";
import { jsPDF } from "jspdf";
import { ensureSchema, first, getSql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
const escapeHtml = (value: unknown) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const money = (value: unknown) => `Rs ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;

function invoicePdf(inv: any) {
  const client = inv.client_snapshot;
  const items = Array.isArray(inv.line_items) ? inv.line_items : [];
  const doc = new jsPDF();
  doc.setFillColor(7, 157, 183); doc.rect(0, 0, 210, 8, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(23); doc.setTextColor(7, 157, 183); doc.text("Catcore.", 18, 28);
  doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.text("SOLUTIONS", 18, 35);
  doc.setFontSize(22); doc.text("INVOICE", 150, 28); doc.setFontSize(10); doc.text(String(inv.invoice_number), 150, 35); doc.line(18, 44, 192, 44);
  doc.setFontSize(9); doc.setTextColor(100, 100, 100); doc.text("INVOICE TO", 18, 54); doc.setTextColor(0, 0, 0);
  doc.setFontSize(12); doc.text(String(client.contact_name || ""), 18, 62); doc.setFontSize(10); doc.text(String(client.company_name || ""), 18, 69);
  doc.text(String(client.address || "Karachi, Pakistan"), 18, 76, { maxWidth: 90 }); doc.setFontSize(9);
  doc.text(`Issue: ${String(inv.issue_date).slice(0, 10)}`, 145, 55); doc.text(`Due: ${String(inv.due_date || "-").slice(0, 10)}`, 145, 62);
  let y = 95; doc.setFillColor(0, 0, 0); doc.rect(18, y - 7, 174, 10, "F"); doc.setTextColor(255, 255, 255);
  doc.text("Description", 21, y); doc.text("Qty", 125, y); doc.text("Rate", 145, y); doc.text("Amount", 174, y); doc.setTextColor(0, 0, 0);
  for (const item of items) { y += 13; doc.text(String(item.description || ""), 21, y, { maxWidth: 95 }); doc.text(String(item.quantity), 128, y, { align: "right" }); doc.text(money(item.rate), 161, y, { align: "right" }); doc.text(money(Number(item.quantity) * Number(item.rate)), 190, y, { align: "right" }); }
  y += 15; doc.line(120, y, 192, y); y += 9; doc.text("Subtotal", 130, y); doc.text(money(inv.subtotal), 190, y, { align: "right" });
  y += 8; doc.text(`Tax (${inv.tax_rate}%)`, 130, y); doc.text(money(inv.tax_amount), 190, y, { align: "right" });
  y += 10; doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.text("Total", 130, y); doc.setTextColor(7, 157, 183); doc.text(money(inv.total), 190, y, { align: "right" });
  doc.setTextColor(80, 80, 80); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text("Catcore Solutions · info@catcoresolutions.com", 18, 282);
  return Buffer.from(doc.output("arraybuffer"));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const denied = await requireAuth(request); if (denied) return denied;
    if (!process.env.RESEND_API_KEY || !process.env.INVOICE_FROM_EMAIL) return NextResponse.json({ error: "Resend is not configured yet." }, { status: 503 });
    const { id } = await params; await ensureSchema(); const sql = getSql(); const inv = first<any>(await sql`SELECT * FROM invoices WHERE id=${id}`);
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const client = inv.client_snapshot; if (!client.email) return NextResponse.json({ error: "Client email is missing." }, { status: 400 });
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.INVOICE_FROM_EMAIL, to: client.email, replyTo: "info@catcoresolutions.com",
      subject: `Catcore Solutions Invoice ${inv.invoice_number}`,
      html: `<div style="font-family:Arial;color:#111;max-width:600px"><h2 style="color:#079db7">Catcore Solutions</h2><p>Dear ${escapeHtml(client.contact_name)},</p><p>Please find invoice <b>${escapeHtml(inv.invoice_number)}</b> attached as a PDF.</p><p style="font-size:24px"><b>PKR ${Number(inv.total).toLocaleString("en-PK")}</b></p><p>Issue date: ${escapeHtml(inv.issue_date)}<br>Due date: ${escapeHtml(inv.due_date || "-")}</p><p>For questions or payment confirmation, reply to this email.</p></div>`,
      attachments: [{ filename: `${inv.invoice_number}.pdf`, content: invoicePdf(inv) }],
    });
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 });
    await sql`UPDATE invoices SET email_status='Sent',status=CASE WHEN status='Draft' THEN 'Sent' ELSE status END WHERE id=${id}`;
    return NextResponse.json({ sent: true, id: result.data?.id });
  } catch (error) { console.error("[invoice email]", error); return NextResponse.json({ error: "Unable to send email." }, { status: 500 }); }
}
