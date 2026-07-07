import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every mutating api/admin/* route calls this. An unauditable admin action
 * is worse than a retried one, so a failed write throws instead of being
 * fire-and-forget — the caller's request should fail too.
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
