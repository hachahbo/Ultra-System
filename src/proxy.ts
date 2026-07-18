import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { defaultRouteFor, type Role } from "@/lib/permissions";

// Owner-only sections worth bouncing at the edge before any rendering
// happens. Fine-grained per-role routing for the rest of /dashboard lives in
// the server layout (src/app/dashboard/layout.tsx) — enforcing everything
// here would mean a profiles round-trip on every dashboard request.
const OWNER_ONLY_PREFIXES = ["/dashboard/settings", "/dashboard/team", "/dashboard/analytics"];

// Refreshes the Supabase session cookie and protects /dashboard (plan.md §7).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Forward the pathname to server components — there's no other way for
  // src/app/dashboard/layout.tsx to read the current path via headers() for
  // the fine-grained per-role redirect (canAccessRoute/defaultRouteFor).
  request.headers.set("x-pathname", pathname);

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user &&
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/admin") ||
      pathname === "/change-password")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && OWNER_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = profile?.role as Role | undefined;
    if (role && role !== "owner") {
      const url = request.nextUrl.clone();
      url.pathname = defaultRouteFor(role);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (user && pathname === "/login") {
    // "platform_admins self read" RLS policy lets the session client check
    // its own membership without the service-role key.
    const { data: membership } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const url = request.nextUrl.clone();
    if (membership) {
      url.pathname = "/admin";
    } else {
      // Land directly on the role's allowed page — sending every non-owner
      // role through "/dashboard" only for the layout to redirect them
      // again is the double-redirect that trips the Next 16 dev-mode
      // profiler bug (see src/app/login/page.tsx for the same fix).
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      const role = profile?.role as Role | undefined;
      url.pathname = role ? defaultRouteFor(role) : "/dashboard";
    }
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/change-password"],
};
