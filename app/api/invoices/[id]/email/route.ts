import { NextResponse } from "next/server";
import { Resend } from "resend";
import { invoicePdf } from "@/lib/invoice-pdf";
import { getBanks } from "@/lib/payments";
import { invoiceLink } from "@/lib/invoice-link";
import { ensureSchema, first, getSql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";
const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
const money = (value: unknown) =>
  `Rs ${Number(value || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const denied = await requireAuth(request);
    if (denied) return denied;
    if (!process.env.RESEND_API_KEY || !process.env.INVOICE_FROM_EMAIL)
      return NextResponse.json(
        { error: "Resend is not configured yet." },
        { status: 503 },
      );
    const { id } = await params;
    await ensureSchema();
    const sql = getSql();
    const inv = first<any>(await sql`SELECT * FROM invoices WHERE id=${id}`);
    if (!inv)
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const client = inv.client_snapshot;
    if (!client.email)
      return NextResponse.json(
        { error: "Client email is missing." },
        { status: 400 },
      );
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.INVOICE_FROM_EMAIL,
      to: client.email,
      replyTo: "info@catcoresolutions.com",
      subject: `Catcore Solutions Invoice ${inv.invoice_number}`,
      html: `<div style="font-family:Arial;color:#111;max-width:600px"><h2 style="color:#079db7">Catcore Solutions</h2><p>Dear ${escapeHtml(client.contact_name)},</p><p>Please find invoice <b>${escapeHtml(inv.invoice_number)}</b> attached as a PDF.</p><p style="font-size:24px"><b>PKR ${Number(inv.total).toLocaleString("en-PK")}</b></p><p>Issue date: ${escapeHtml(inv.issue_date)}<br>Due date: ${escapeHtml(inv.due_date || "-")}</p><p>For questions or payment confirmation, reply to this email.</p></div>`,
      attachments: [
        {
          filename: `${inv.invoice_number}.pdf`,
          content: await invoicePdf(
            inv,
            await getBanks(),
            await invoiceLink(id),
          ),
        },
      ],
    });
    if (result.error)
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 },
      );
    await sql`UPDATE invoices SET email_status='Sent',status=CASE WHEN status='Draft' THEN 'Sent' ELSE status END WHERE id=${id}`;
    return NextResponse.json({ sent: true, id: result.data?.id });
  } catch (error) {
    console.error("[invoice email]", error);
    return NextResponse.json(
      { error: "Unable to send email." },
      { status: 500 },
    );
  }
}
