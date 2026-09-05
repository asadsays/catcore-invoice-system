import { notFound } from "next/navigation";
import { getSql } from "@/lib/db";
import { getBanks, paymentSchema } from "@/lib/payments";
import OnlineInvoice from "@/components/online-invoice";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Invoice | Catcore Solutions",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  await paymentSchema();
  const rows =
    await getSql()`SELECT i.invoice_number,i.client_snapshot,i.issue_date,i.due_date,i.line_items,i.subtotal,i.discount,i.tax_rate,i.tax_amount,i.delivery,i.total,i.notes FROM invoices i JOIN invoice_public_links l ON i.id=l.invoice_id WHERE l.token=${token}`;
  if (!rows.length) notFound();
  const invoice = JSON.parse(JSON.stringify(rows[0]));
  delete invoice.client_snapshot.email;
  delete invoice.client_snapshot.phone;
  const banks = await getBanks();
  return <OnlineInvoice invoice={invoice} banks={banks} />;
}
