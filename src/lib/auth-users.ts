import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Single cached source for auth.users last_sign_in_at, shared by every admin
// route that needs it (analytics DAU/MAU + at-risk, restaurants last-active
// column). Before this, /api/admin/analytics paged through every auth user
// via listUsers() on every request, and /api/admin/restaurants called
// getUserById() once PER ROW — both N+1 against the Supabase Auth Admin
// API. One 60s-cached full scan replaces both.
export const getLastSignInMap = unstable_cache(
  async (): Promise<Record<string, string | null>> => {
    const admin = createAdminClient();
    const map: Record<string, string | null> = {};
    for (let page = 1; ; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data) break;
      for (const u of data.users) {
        map[u.id] = u.last_sign_in_at ?? null;
      }
      if (data.users.length < 200) break;
    }
    return map;
  },
  ["auth-last-signin"],
  { revalidate: 60 },
);
