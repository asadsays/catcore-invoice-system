import { getSql, ensureSchema } from "@/lib/db";
export type Bank = {
  id: string;
  name: string;
  title: string;
  account: string;
  iban: string;
  is_default: boolean;
};
export async function paymentSchema() {
  await ensureSchema();
  const sql = getSql();
  await sql`CREATE TABLE IF NOT EXISTS invoice_payment_settings (id INTEGER PRIMARY KEY CHECK(id=1),banks JSONB NOT NULL DEFAULT '[]')`;
  await sql`CREATE TABLE IF NOT EXISTS invoice_public_links (invoice_id BIGINT PRIMARY KEY REFERENCES invoices(id),token TEXT UNIQUE NOT NULL)`;
}
export async function getBanks(): Promise<Bank[]> {
  await paymentSchema();
  const rows =
    await getSql()`SELECT banks FROM invoice_payment_settings WHERE id=1`;
  return (rows[0]?.banks || []) as Bank[];
}
