import { NextResponse } from "next/server";

export const SESSION_COOKIE = "catcore_session";
export const authConfigured = () =>
  Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);

async function signature(email: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.ADMIN_PASSWORD || ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`catcore:${email.toLowerCase()}`),
    ),
  );
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function createSessionToken(_email?: string) {
  return signature(process.env.ADMIN_EMAIL || "");
}

export async function isAuthenticated(request: Request) {
  if (!authConfigured()) return false;
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!token) return false;
  return token === (await createSessionToken());
}

export async function requireAuth(request: Request) {
  return (await isAuthenticated(request))
    ? null
    : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
