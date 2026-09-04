import { NextResponse } from "next/server";
import { ensureSchema,getSql,first } from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await ensureSchema(); const sql=getSql();
  const [clients,services,invoices,metrics]=await Promise.all([
   sql`SELECT * FROM clients ORDER BY company_name`,
   sql`SELECT * FROM services ORDER BY name`,
   sql`SELECT * FROM invoices ORDER BY created_at DESC LIMIT 100`,
   sql`SELECT COALESCE(SUM(total) FILTER(WHERE date_trunc('month',issue_date)=date_trunc('month',CURRENT_DATE)),0) month_revenue,
   COALESCE(SUM(total) FILTER(WHERE status IN ('Sent','Overdue')),0) outstanding,
   COALESCE(SUM(total) FILTER(WHERE status='Paid' AND date_trunc('month',issue_date)=date_trunc('month',CURRENT_DATE)),0) month_paid,
   COUNT(*) invoice_count FROM invoices`
  ]);
  return NextResponse.json({clients,services,invoices,metrics:first(metrics),database:"connected"});
 }catch(error){console.error("[dashboard]",error);return NextResponse.json({error:error instanceof Error?error.message:"Unable to load dashboard"},{status:500});}
}
