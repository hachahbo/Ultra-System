import "server-only";
import { NextResponse } from "next/server";

// Consistent JSON error shape for the Super Admin API surface
// (api/admin/*, api/webhooks/*) — new/touched routes only, per plan.
export function apiError(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}
