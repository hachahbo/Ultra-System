"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { format } from "date-fns";
import { dateFnsLocale } from "@/lib/date-locale";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/dashboard/empty-state";

type Variance = {
  id: string;
  expected_deduction: number;
  available_stock: number;
  reason: string;
  created_at: string;
  inventory_item: { id: string; name: string; unit: string } | null;
  menu_item: { id: string; name_fr: string } | null;
  order: { id: string; created_at: string } | null;
};

// Message key into Variances.*, not display text.
const REASON_LABELS: Record<string, string> = {
  stock_went_negative: "reasonNegativeStock",
};

async function fetchVariances(): Promise<Variance[]> {
  const res = await fetch("/api/dashboard/variances?limit=200");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.variances ?? [];
}

export function VariancesView() {
  const t = useTranslations("Variances");
  const locale = useLocale();
  const { data, isPending } = useQuery({
    queryKey: ["inventory-variances"],
    queryFn: fetchVariances,
  });

  if (isPending) {
    return (
      <div className="mt-6 space-y-3" aria-busy="true">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  const variances = data ?? [];

  if (variances.length === 0) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t("empty")}
        hint={t("emptyHint")}
        className="mt-6"
      />
    );
  }

  return (
    <div className="mt-6 bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-w-0 w-full overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent border-border">
            <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider pl-5">{t("colDate")}</TableHead>
            <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colIngredient")}</TableHead>
            <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colArticle")}</TableHead>
            <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colDeficit")}</TableHead>
            <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider pr-5">{t("colReason")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {variances.map((v) => (
            <TableRow key={v.id} className="border-border">
              <TableCell className="pl-5 text-[12.5px] text-muted-foreground whitespace-nowrap">
                {format(new Date(v.created_at), "d MMM HH:mm", { locale: dateFnsLocale(locale) })}
              </TableCell>
              <TableCell className="text-[13px] font-bold text-foreground">
                {v.inventory_item?.name ?? "—"}
              </TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">
                {v.menu_item?.name_fr ?? "—"}
              </TableCell>
              <TableCell className="text-[12.5px] font-bold text-destructive">
                {(v.expected_deduction - v.available_stock).toFixed(2)} {v.inventory_item?.unit ?? ""}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {t("available", { stock: v.available_stock })}
                </span>
              </TableCell>
              <TableCell className="pr-5 text-[12px] text-muted-foreground">
                {REASON_LABELS[v.reason] ? t(REASON_LABELS[v.reason]) : v.reason}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
