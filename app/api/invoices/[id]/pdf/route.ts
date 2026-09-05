import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSql, ensureSchema } from "@/lib/db";
import { getBanks } from "@/lib/payments";
import { invoicePdf } from "@/lib/invoice-pdf";
import { invoiceLink } from "@/lib/invoice-link";
export const runtime = "nodejs";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const denied = await requireAuth(req);
    if (denied) return denied;
    const { id } = await params;
    if (!/^\d+$/.test(id))
      return NextResponse.json({ error: "Invalid invoice" }, { status: 400 });
    await ensureSchema();
    const rows = await getSql()`SELECT * FROM invoices WHERE id=${id}`;
    if (!rows[0])
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    const pdf = await invoicePdf(
      rows[0],
      await getBanks(),
      await invoiceLink(id),
    );
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${rows[0].invoice_number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[invoice pdf]", e);
    return NextResponse.json(
      { error: "Unable to generate PDF." },
      { status: 500 },
    );
  }
}
