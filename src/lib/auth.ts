import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function tokenFrom(req: Request): string {
  const header = req.headers.get("authorization") ?? "";
  return req.headers.get("x-admin-token") ?? header.replace(/^Bearer\s+/i, "");
}

/** Admin UI and cron callers. CRON_SECRET is what Vercel Cron sends as a Bearer token. */
export function isAuthorized(req: Request, { allowCron = false } = {}): boolean {
  const token = tokenFrom(req);
  if (!token) return false;
  const admin = process.env.ADMIN_TOKEN;
  const cron = process.env.CRON_SECRET;
  return Boolean((admin && safeEqual(token, admin)) || (allowCron && cron && safeEqual(token, cron)));
}

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

