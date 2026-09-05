import { calculateInvoice } from "@/lib/calculations";
import { NextResponse } from "next/server";
import { ensureSchema, getSql, first } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
export async function POST(req: Request) {
  try {
    const denied = await requireAuth(req);
    if (denied) return denied;
    const b = await req.json();
    const validDate=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
    if(!validDate(b.issue_date)||(b.due_date&&!validDate(b.due_date))||!['Draft','Sent'].includes(b.status||'Draft')||String(b.notes||'').length>3000)return NextResponse.json({error:'Check invoice dates, status and notes (maximum 3,000 characters).'},{status:400});
    if (!b.client?.id || !Array.isArray(b.line_items))
      return NextResponse.json(
        { error: "Client and items are required." },
        { status: 400 },
      );
    let calculated;
    try {
      calculated = calculateInvoice(b);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid amounts" },
        { status: 400 },
      );
    }
    const items = calculated.items;
    if (!items.length || items.some((x) => !x.description || x.quantity <= 0))
      return NextResponse.json(
        { error: "Each item needs a description and positive quantity." },
        { status: 400 },
      );
    const {
      sub: subtotal,
      taxRate,
      tax: taxAmount,
      discount,
      delivery,
      total,
    } = calculated;
    await ensureSchema();
    const sql = getSql();
    const year = new Date(b.issue_date).getUTCFullYear();
    const out = await sql`WITH allocated AS (SELECT nextval(pg_get_serial_sequence('invoices','id')) AS id) INSERT INTO invoices(id,invoice_number,client_id,client_snapshot,issue_date,due_date,status,line_items,subtotal,tax_rate,tax_amount,discount,delivery,total,notes) SELECT id,${'CAT-'+year+'-'} || CASE WHEN length(id::text)<4 THEN lpad(id::text,4,'0') ELSE id::text END,${b.client.id},${JSON.stringify(b.client)}::jsonb,${b.issue_date}::date,${b.due_date||null}::date,${b.status||'Draft'},${JSON.stringify(items)}::jsonb,${subtotal},${taxRate},${taxAmount},${discount},${delivery},${total},${b.notes||''} FROM allocated RETURNING *`;
    return NextResponse.json(first(out), { status: 201 });
  } catch (e) {
    console.error("[invoices]", e);
    return NextResponse.json(
      { error: "Unable to create invoice. Please try again." },
      { status: 500 },
    );
  }
}
