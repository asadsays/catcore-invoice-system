import { randomBytes } from "node:crypto";
import { getSql } from "./db";
import { paymentSchema } from "./payments";
export async function invoiceLink(id: string) {
  await paymentSchema();
  const rows =
    await getSql()`INSERT INTO invoice_public_links(invoice_id,token) VALUES(${id},${randomBytes(32).toString("hex")}) ON CONFLICT(invoice_id) DO UPDATE SET invoice_id=EXCLUDED.invoice_id RETURNING token`;
  return "https://catcore-invoice-system.vercel.app/invoice/" + rows[0].token;
}
