import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { calculateInvoice } from "@/lib/calculations";
import { invoicePdf } from "@/lib/invoice-pdf";
import { getBanks } from "@/lib/payments";
export const runtime = "nodejs";
export async function POST(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  try {
    const b = await req.json();
    const c = calculateInvoice(b);
    if (
      !b.client ||
      !c.items.length ||
      c.items.some((x) => !x.description || x.quantity <= 0)
    )
      throw Error("Complete all invoice items.");
    const pdf = await invoicePdf(
      {
        ...b,
        client_snapshot: b.client,
        line_items: c.items,
        subtotal: c.sub,
        tax_amount: c.tax,
        discount: c.discount,
        total: c.total,
      },
      await getBanks(),
    );
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to preview invoice." },
      { status: 400 },
    );
  }
}
