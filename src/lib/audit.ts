import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every mutating api/admin/* route calls this, and (since 0011) owner-side
 * team mutations in api/dashboard/staff/* do too — `adminId` is just "the
 * auth.users id who made the change"; audit_logs.admin_id references
 * auth.users generically, an owner satisfies that FK the same as a platform
 * admin. An unauditable action is worse than a retried one, so a failed
 * write throws instead of being fire-and-forget — the caller's request
 * should fail too, even though the underlying mutation already succeeded.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetRestaurantId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    admin_id: adminId,
    action,
    target_restaurant_id: targetRestaurantId,
    metadata,
  });
  if (error) {
    throw new Error(`audit log write failed: ${error.message}`);
  }
}
