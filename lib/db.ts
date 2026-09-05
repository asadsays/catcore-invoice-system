import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;
let client: Sql | null = null;
let ready: Promise<void> | null = null;

export function getSql() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url)
    throw new Error("Database is not connected. POSTGRES_URL is missing.");
  if (!client) client = neon(url);
  return client;
}

export async function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    const sql = getSql();
    await sql`CREATE TABLE IF NOT EXISTS clients (
      id BIGSERIAL PRIMARY KEY, contact_name TEXT NOT NULL, company_name TEXT NOT NULL,
      email TEXT DEFAULT '', phone TEXT DEFAULT '', address TEXT DEFAULT '', ntn TEXT DEFAULT '',
      default_tax NUMERIC(7,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS services (
      id BIGSERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT DEFAULT '',
      default_rate NUMERIC(14,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE TABLE IF NOT EXISTS invoices (
      id BIGSERIAL PRIMARY KEY, invoice_number TEXT UNIQUE, client_id BIGINT REFERENCES clients(id),
      client_snapshot JSONB NOT NULL, issue_date DATE NOT NULL, due_date DATE, status TEXT NOT NULL DEFAULT 'Draft',
      line_items JSONB NOT NULL DEFAULT '[]', subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
      tax_rate NUMERIC(7,2) NOT NULL DEFAULT 0, tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      discount NUMERIC(14,2) NOT NULL DEFAULT 0, delivery NUMERIC(14,2) NOT NULL DEFAULT 0,
      total NUMERIC(14,2) NOT NULL DEFAULT 0, notes TEXT DEFAULT '', email_status TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`;
    await sql`CREATE INDEX IF NOT EXISTS invoices_client_idx ON invoices(client_id)`;
    await sql`INSERT INTO clients (contact_name,company_name,address,ntn)
      SELECT 'Ms. Ifra','Khas Socks','Plot No. C-7, Shed-B, South Avenue Site, Karachi','5270818-4'
      WHERE NOT EXISTS (SELECT 1 FROM clients WHERE company_name='Khas Socks')`;
    await sql`INSERT INTO clients (contact_name,company_name,address,ntn)
      SELECT 'Mr. Areeb','Khas Head Office','K-2/3 2/4 2/5, Main Gizri Gate Road, Karachi','5270818-4'
      WHERE NOT EXISTS (SELECT 1 FROM clients WHERE company_name='Khas Head Office')`;
    await sql`INSERT INTO clients (contact_name,company_name)
      SELECT 'Mr. Huzaifa','Aitch Studio'
      WHERE NOT EXISTS (SELECT 1 FROM clients WHERE company_name='Aitch Studio')`;
    await sql`INSERT INTO services (name,description,default_rate) VALUES
      ('Social Media Retainer','Monthly social media management services',60000),
      ('Web Consultation','Professional web consultation services',20000),
      ('Professional Shoot','Professional camera and equipment shoot',20000)
      ON CONFLICT (name) DO NOTHING`;
  })().catch((error) => {
    ready = null;
    throw error;
  });
  return ready;
}

export const num = (value: unknown) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;
export function first<T = Record<string, unknown>>(rows: unknown): T {
  return (rows as T[])[0];
}
