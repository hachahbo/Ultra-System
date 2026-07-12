import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { PREVIEW_COOKIE } from "@/lib/site-theme";

// Sets/clears the HttpOnly cookie that src/lib/site-theme.ts checks before
// serving a draft-merged theme on the public [slug] route. The cookie value
// alone grants nothing — getSiteTheme re-verifies a live Super Admin session
// via getAdminContext() on every read, so a forged cookie does nothing.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const cookieStore = await cookies();
  cookieStore.set(PREVIEW_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;
  await params;

  const cookieStore = await cookies();
  cookieStore.delete(PREVIEW_COOKIE);
  return NextResponse.json({ ok: true });
}
