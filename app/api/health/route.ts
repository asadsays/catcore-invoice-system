import {NextResponse} from "next/server";import{ensureSchema}from "@/lib/db";
export async function GET(){let database=false;try{await ensureSchema();database=true;}catch{}return NextResponse.json({database,email:Boolean(process.env.RESEND_API_KEY),sender:Boolean(process.env.INVOICE_FROM_EMAIL)});}
