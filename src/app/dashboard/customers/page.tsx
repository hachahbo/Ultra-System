import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomersView } from "@/components/dashboard/customers-view";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/dashboard";
import { canAccessRoute, defaultRouteFor } from "@/lib/permissions";
import type { Customer } from "@/lib/types";

export const metadata: Metadata = { title: "Clients" };

// The payoff (plan.md §3E): the exportable list the restaurant owns.
export default async function CustomersPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/");
  if (!canAccessRoute(ctx.profile.role, "/dashboard/customers")) redirect(defaultRouteFor(ctx.profile.role));

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .order("last_order", { ascending: false, nullsFirst: false });
  const customers = (data ?? []) as Customer[];

  return (
    <CustomersView customers={customers} />
  );
}
