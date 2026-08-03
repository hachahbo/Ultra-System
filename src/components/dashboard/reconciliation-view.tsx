"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { dateFnsLocale } from "@/lib/date-locale";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatPrice } from "@/lib/format";

type UnpaidOrder = {
  id: string;
  type: "dine_in" | "delivery";
  table_number: string | null;
  customer_name: string | null;
  total: number;
  created_at: string;
};

type StaffBreakdown = {
  staffId: string;
  email: string;
  total: number;
  count: number;
};

type Reconciliation = {
  collectedTotal: number;
  outstandingTotal: number;
  paidCount: number;
  unpaidOrders: UnpaidOrder[];
  byStaff: StaffBreakdown[];
};

async function fetchReconciliation(): Promise<Reconciliation> {
  const res = await fetch("/api/dashboard/orders/reconciliation");
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

async function markOrderPaid(orderId: string): Promise<void> {
  const res = await fetch(`/api/dashboard/orders/${orderId}/payment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payment_status: "paid" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "payment update failed");
  }
}

export function ReconciliationView() {
  const t = useTranslations("Reconciliation");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["orders-reconciliation"],
    queryFn: fetchReconciliation,
    refetchInterval: 30_000,
  });

  const markPaid = useMutation({
    mutationFn: markOrderPaid,
    onSuccess: () => {
      toast.success(t("marked"));
      queryClient.invalidateQueries({ queryKey: ["orders-reconciliation"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => toast.error(t("markFailed")),
  });

  if (isPending) {
    return (
      <div className="mt-6 space-y-3" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const collectedTotal = data?.collectedTotal ?? 0;
  const outstandingTotal = data?.outstandingTotal ?? 0;
  const unpaidOrders = data?.unpaidOrders ?? [];
  const byStaff = data?.byStaff ?? [];

  return (
    <div className="mt-6 space-y-6">
      {/* Totals strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {t("collectedToday")}
          </div>
          <div className="text-2xl font-extrabold tracking-tight mt-1.5 text-emerald-600 dark:text-emerald-400">
            {formatPrice(collectedTotal, "MAD")}
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {t("outstanding")}
          </div>
          <div className="text-2xl font-extrabold tracking-tight mt-1.5 text-amber-600 dark:text-amber-400">
            {formatPrice(outstandingTotal, "MAD")}
          </div>
        </div>
      </div>

      {/* Per-staff breakdown */}
      {byStaff.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">{t("byStaff")}</h2>
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider pl-5">
                    {t("colStaff")}
                  </TableHead>
                  <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                    {t("colOrderCount")}
                  </TableHead>
                  <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider pr-5">
                    {t("colTotal")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byStaff.map((s) => (
                  <TableRow key={s.staffId} className="border-border">
                    <TableCell className="pl-5 text-[13px] font-semibold text-foreground">{s.email}</TableCell>
                    <TableCell className="text-[12.5px] text-muted-foreground">{s.count}</TableCell>
                    <TableCell className="pr-5 text-[13px] font-bold text-foreground">
                      {formatPrice(s.total, "MAD")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Unpaid list */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-2">{t("unpaidList")}</h2>
        {unpaidOrders.length === 0 ? (
          <EmptyState icon={Wallet} title={t("emptyUnpaid")} hint={t("emptyUnpaidHint")} />
        ) : (
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider pl-5">
                    {t("colTime")}
                  </TableHead>
                  <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                    {t("colCustomer")}
                  </TableHead>
                  <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                    {t("colTotal")}
                  </TableHead>
                  <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider pr-5 text-right">
                    {t("colAction")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidOrders.map((o) => (
                  <TableRow key={o.id} className="border-border">
                    <TableCell className="pl-5 text-[12.5px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(o.created_at), "d MMM HH:mm", { locale: dateFnsLocale(locale) })}
                    </TableCell>
                    <TableCell className="text-[13px] font-semibold text-foreground">
                      {o.customer_name || (o.type === "dine_in" ? `Table ${o.table_number ?? "—"}` : "—")}
                    </TableCell>
                    <TableCell className="text-[13px] font-bold text-foreground">
                      {formatPrice(Number(o.total), "MAD")}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <button
                        onClick={() => markPaid.mutate(o.id)}
                        disabled={markPaid.isPending}
                        className="text-[12.5px] font-bold text-primary hover:underline disabled:opacity-50"
                      >
                        {t("markPaid")}
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
