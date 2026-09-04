import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
export async function proxy(request:NextRequest){const{pathname}=request.nextUrl;if(pathname==="/login"||pathname.startsWith("/api/auth/")||pathname==="/api/health")return NextResponse.next();if(await isAuthenticated(request))return NextResponse.next();if(pathname.startsWith("/api/"))return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.redirect(new URL("/login",request.url));}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
