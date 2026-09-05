import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { paymentSchema } from "@/lib/payments";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const { id } = await params;
  if (!/^\d+$/.test(id))
    return NextResponse.json({ error: "Invalid invoice" }, { status: 400 });
  await paymentSchema();
  const sql = getSql();
  const rows = await sql`SELECT id FROM invoices WHERE id=${id}`;
  if (!rows.length)
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  const token = randomBytes(32).toString("hex");
  const links =
    await sql`INSERT INTO invoice_public_links(invoice_id,token) VALUES(${id},${token}) ON CONFLICT(invoice_id) DO UPDATE SET invoice_id=EXCLUDED.invoice_id RETURNING token`;
  return NextResponse.json({ path: "/invoice/" + links[0].token });
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  const { id } = await params;
  if (!/^\d+$/.test(id))
    return NextResponse.json({ error: "Invalid invoice" }, { status: 400 });
  await paymentSchema();
  await getSql()`DELETE FROM invoice_public_links WHERE invoice_id=${id}`;
  return NextResponse.json({ revoked: true });
}
