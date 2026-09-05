import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { getBanks, paymentSchema } from "@/lib/payments";
export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  return NextResponse.json({ banks: await getBanks() });
}
export async function PUT(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    if (!Array.isArray(body.banks) || body.banks.length > 12)
      throw new Error("Use at most 12 payment mediums.");
    const banks = body.banks.map((b: any, i: number) => ({
      id: String(i),
      name: String(b.name || "").trim(),
      title: String(b.title || "").trim(),
      account: String(b.account || "").trim(),
      iban: String(b.iban || "").trim(),
      is_default: b.is_default === true,
    }));
    if (
      banks.some(
        (b: any) =>
          !b.name ||
          !b.title ||
          (!b.account && !b.iban) ||
          [b.name, b.title, b.account, b.iban].some((x) => x.length > 160),
      )
    )
      throw new Error(
        "Each bank needs a name, account title and account number or IBAN.",
      );
    if (banks.length && banks.filter((b: any) => b.is_default).length !== 1)
      throw new Error("Select exactly one official default bank.");
    await paymentSchema();
    await getSql()`INSERT INTO invoice_payment_settings(id,banks) VALUES(1,${JSON.stringify(banks)}::jsonb) ON CONFLICT(id) DO UPDATE SET banks=EXCLUDED.banks`;
    return NextResponse.json({ banks });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unable to save banks" },
      { status: 400 },
    );
  }
}
