import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomersView } from "@/components/dashboard/customers-view";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/dashboard";
import type { Customer } from "@/lib/types";

export const metadata: Metadata = { title: "Clients" };

// The payoff (plan.md §3E): the exportable list the restaurant owns.
export default async function CustomersPage() {
  const ctx = await getSessionContext();
  if (!ctx || ctx.profile.role !== "owner") redirect("/dashboard");

  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("*")
    .order("last_order", { ascending: false, nullsFirst: false });
  const customers = (data ?? []) as Customer[];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cette liste vous appartient.
          </p>
        </div>
        <Button asChild>
          <a href="/api/dashboard/customers/export" download>
            <Download className="size-4" /> Exporter CSV
          </a>
        </Button>
      </div>

      <CustomersView customers={customers} />
    </div>
  );
}
