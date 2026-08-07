"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock,
  CalendarDays,
  ShoppingBag,
  MessageCircle,
  Sparkles,
  ArrowUpDown,
  Star,
  Receipt,
  Eye,
  Megaphone,
  Gift,
  Percent,
  Send,
  Copy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";
import { getDishImage } from "@/lib/image";
import { formatDateTime, formatPrice } from "@/lib/format";
import type { Customer, Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";

async function fetchCustomerOrders(
  id: string,
): Promise<{ orders: Order[]; total_spent: number }> {
  const res = await fetch(`/api/dashboard/customers/${id}/orders`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

function getCustomerTier(orderCount: number) {
  if (orderCount >= 4) {
    return {
      label: "VIP",
      badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
      avatarBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/20",
      icon: Sparkles,
    };
  }
  if (orderCount >= 2) {
    return {
      label: "Habitué",
      badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      avatarBg: "bg-emerald-600 text-white",
      icon: Star,
    };
  }
  return {
    label: "Nouveau",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
    avatarBg: "bg-primary text-primary-foreground",
    icon: Users,
  };
}

function formatWhatsAppLink(phone: string, name?: string) {
  const cleanPhone = phone.replace(/[^\d]/g, "");
  let formatted = cleanPhone;
  if (cleanPhone.startsWith("0")) {
    formatted = "212" + cleanPhone.slice(1);
  }
  const text = encodeURIComponent(
    `Bonjour ${name ? name : ""} ! Merci de votre confiance.`
  );
  return `https://wa.me/${formatted}?text=${text}`;
}

function makeColumns(
  t: ReturnType<typeof useTranslations<"CustomersDashboard">>,
  onView: (c: Customer) => void
): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <button
          type="button"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1.5 font-bold hover:text-foreground transition-colors cursor-pointer"
        >
          {t("colName")}
          <ArrowUpDown className="size-3 text-muted-foreground/70" />
        </button>
      ),
      cell: ({ row }) => {
        const name = (row.getValue("name") as string) || t("unknown");
        const firstSeen = row.original.first_seen;
        const count = row.original.order_count;
        const tier = getCustomerTier(count);
        const TierIcon = tier.icon;

        const initials = name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

        return (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "size-10 rounded-full font-extrabold text-[13px] flex items-center justify-center shrink-0 shadow-sm border border-white/10",
                tier.avatarBg
              )}
            >
              {initials}
            </div>
            <div className="min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-extrabold truncate text-foreground">
                  {name}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shadow-2xs",
                    tier.badgeClass
                  )}
                >
                  <TierIcon className="size-2.5 shrink-0" />
                  {tier.label}
                </span>
              </div>
              <span className="text-[11.5px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                <CalendarDays className="size-3 text-primary/80" />{" "}
                {t("customerSince", { date: formatDateTime(firstSeen).split(" ")[0] })}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phone",
      header: t("colPhone"),
      cell: ({ row }) => {
        const phone = row.getValue("phone") as string;
        const name = row.getValue("name") as string;
        const waHref = formatWhatsAppLink(phone, name);

        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground hover:text-foreground transition-colors bg-muted/40 hover:bg-muted px-2.5 py-1.5 rounded-xl border border-border/60"
            >
              <Phone className="size-3.5 text-primary" />
              {phone}
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              title="Envoyer un message WhatsApp"
              className="inline-flex items-center justify-center size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
            >
              <MessageCircle className="size-4 stroke-[2.25]" />
            </a>
          </div>
        );
      },
    },
    {
      accessorKey: "order_count",
      header: ({ column }) => (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-bold hover:text-foreground transition-colors cursor-pointer"
          >
            {t("colOrders")}
            <ArrowUpDown className="size-3 text-muted-foreground/70" />
          </button>
        </div>
      ),
      cell: ({ row }) => {
        const count = row.getValue("order_count") as number;
        return (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-1.5 text-[13px] font-extrabold text-foreground bg-primary/10 px-3 py-1 rounded-full border border-primary/20 shadow-2xs">
              <ShoppingBag className="size-3.5 text-primary" />
              <span>{count}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "last_order",
      header: ({ column }) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1 font-bold hover:text-foreground transition-colors cursor-pointer"
          >
            {t("colLastOrder")}
            <ArrowUpDown className="size-3 text-muted-foreground/70" />
          </button>
        </div>
      ),
      cell: ({ row }) => {
        const last = row.getValue("last_order") as string | null;
        if (!last)
          return <div className="text-right text-[13px] text-muted-foreground">—</div>;

        const parts = formatDateTime(last).split(" ");
        const date = parts[0];
        const time = parts[1];

        return (
          <div className="flex flex-col items-end justify-center">
            <div className="text-[13px] font-bold text-foreground">{date}</div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="size-3 text-primary/80" /> {t("at", { time })}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">ACTIONS</div>,
      cell: ({ row }) => (
        <div className="text-right" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onView(row.original)}
            className="h-8 rounded-xl font-bold text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Eye className="size-3.5 text-primary" /> Détails
          </Button>
        </div>
      ),
    },
  ];
}

type CategoryFilter = "all" | "vip" | "recurring" | "new";

export function CustomersView({ customers }: { customers: Customer[] }) {
  const t = useTranslations("CustomersDashboard");
  const [globalFilter, setGlobalFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "last_order", desc: true },
  ]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoTarget, setPromoTarget] = useState<"all" | "vip" | "recurring" | "new" | Customer>("all");

  const columns = useMemo(
    () => makeColumns(t, (customer) => setSelected(customer)),
    [t]
  );

  const openPromoForGroup = (group: "all" | "vip" | "recurring" | "new" | Customer) => {
    setPromoTarget(group);
    setIsPromoModalOpen(true);
  };

  const filteredCustomers = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return customers.filter((c) => {
      if (categoryFilter === "vip") return c.order_count >= 4;
      if (categoryFilter === "recurring") return c.order_count >= 2;
      if (categoryFilter === "new") return new Date(c.first_seen) >= thirtyDaysAgo;
      return true;
    });
  }, [customers, categoryFilter]);

  const table = useReactTable({
    data: filteredCustomers,
    columns,
    state: {
      globalFilter,
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const name = String(row.original.name || "").toLowerCase();
      const phone = String(row.original.phone || "").toLowerCase();
      const val = String(filterValue).toLowerCase();
      return name.includes(val) || phone.includes(val);
    },
  });

  const stats = useMemo(() => {
    const total = customers.length;
    const recurring = customers.filter((c) => c.order_count >= 2).length;
    const vips = customers.filter((c) => c.order_count >= 4).length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newThisMonth = customers.filter(
      (c) => new Date(c.first_seen) >= thirtyDaysAgo
    ).length;

    return [
      {
        label: t("totalCustomers"),
        value: String(total),
        textClass: "text-foreground",
        icon: Users,
      },
      {
        label: t("newCustomers"),
        value: String(newThisMonth),
        textClass: "text-primary",
        icon: CalendarDays,
      },
      {
        label: t("loyalCustomers"),
        value: String(recurring),
        textClass: "text-emerald-600 dark:text-emerald-400",
        icon: Star,
      },
      {
        label: "Clients VIP (4+)",
        value: String(vips),
        textClass: "text-amber-500",
        icon: Sparkles,
      },
    ];
  }, [customers, t]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-4rem)] bg-background -mx-4 -my-6 md:-mx-8 md:-my-8 px-4 md:px-8 py-6 md:py-8">
      <div className="flex-1 min-w-0 flex flex-col w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <div className="text-[13.5px] text-muted-foreground mt-1">
              {t("subtitle")}
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Button
              onClick={() => openPromoForGroup(categoryFilter)}
              className="flex-1 sm:flex-initial rounded-xl font-extrabold text-xs gap-2 px-4 h-[42px] bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all"
            >
              <Megaphone className="size-4 stroke-[2.25]" />
              Campagne Promo WhatsApp
            </Button>
            <a
              href="/api/dashboard/customers/export"
              download
              className="flex items-center justify-center gap-2 bg-card text-foreground border border-border px-[16px] py-[11px] rounded-xl text-[13.5px] font-extrabold hover:bg-muted transition-all shadow-xs hover:shadow-sm"
            >
              <Download className="size-4 text-primary" />
              {t("exportCsv")}
            </a>
          </div>
        </div>

        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-extrabold text-muted-foreground">
                  <span>{s.label}</span>
                  <Icon className="size-4 text-primary/70" />
                </div>
                <div
                  className={cn(
                    "text-2xl font-black tracking-tight mt-2",
                    s.textClass
                  )}
                >
                  {s.value}
                </div>
              </div>
            );
          })}
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 mb-4">
          {/* Segment Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer shadow-2xs",
                categoryFilter === "all"
                  ? "border-primary/50 bg-primary/15 text-primary ring-2 ring-primary/20"
                  : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Tous ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("vip")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs",
                categoryFilter === "vip"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20"
                  : "border-border/80 bg-muted/40 text-amber-600/80 dark:text-amber-400/80 hover:bg-amber-500/10"
              )}
            >
              <Sparkles className="size-3" /> VIP (4+)
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("recurring")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs",
                categoryFilter === "recurring"
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                  : "border-border/80 bg-muted/40 text-emerald-600/80 dark:text-emerald-400/80 hover:bg-emerald-500/10"
              )}
            >
              <Star className="size-3" /> Habitués (2+)
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("new")}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs",
                categoryFilter === "new"
                  ? "border-primary/50 bg-primary/15 text-primary ring-2 ring-primary/20"
                  : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Users className="size-3" /> Nouveaux (30j)
            </button>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2 bg-card border border-border/80 rounded-xl px-3.5 py-2 w-full md:w-[300px] shadow-2xs">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="border-none outline-none text-[13px] w-full bg-transparent text-foreground placeholder:text-muted-foreground font-medium"
            />
          </div>
        </div>

        {/* Datatable Card Container */}
        <div className="flex-1 bg-card border border-border/80 rounded-2xl flex flex-col shadow-xs overflow-hidden min-h-[400px] min-w-0">
          <div className="flex-1 overflow-auto">
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Users className="size-10 mb-4 opacity-20" />
                <p className="text-sm font-semibold">{t("emptyTitle")}</p>
              </div>
            ) : (
              <>
                {/* Mobile Card List */}
                <div className="flex flex-col gap-3 p-3.5 md:hidden">
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                      const c = row.original;
                      const name = c.name || t("unknown");
                      const tier = getCustomerTier(c.order_count);
                      const TierIcon = tier.icon;
                      const waHref = formatWhatsAppLink(c.phone, name);

                      const initials = name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <div
                          key={row.id}
                          onClick={() => setSelected(c)}
                          className="w-full rounded-2xl border border-border/80 bg-card p-4 text-left shadow-2xs transition-all hover:bg-muted/40 cursor-pointer space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "size-10 rounded-full font-extrabold text-[13px] flex items-center justify-center shrink-0 shadow-sm border border-white/10",
                                  tier.avatarBg
                                )}
                              >
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-[14px] font-extrabold text-foreground">
                                  {name}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-muted-foreground">
                                  <CalendarDays className="size-3 text-primary" />{" "}
                                  {t("customerSince", {
                                    date: formatDateTime(c.first_seen).split(" ")[0],
                                  })}
                                </div>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs shrink-0",
                                tier.badgeClass
                              )}
                            >
                              <TierIcon className="size-2.5 shrink-0" />
                              {tier.label}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                            <div
                              className="flex items-center gap-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a
                                href={`tel:${c.phone}`}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-muted/50 px-2.5 py-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground"
                              >
                                <Phone className="size-3.5 text-primary" />
                                {c.phone}
                              </a>
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                              >
                                <MessageCircle className="size-4" />
                              </a>
                            </div>

                            <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[12.5px] font-extrabold text-foreground">
                              <ShoppingBag className="size-3.5 text-primary" />
                              {c.order_count} cmd
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-12 text-center text-[13.5px] text-muted-foreground">
                      {t("noMatch")}
                    </div>
                  )}
                </div>

                {/* Desktop Datatable */}
                <div className="hidden md:block w-full min-w-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow
                          key={headerGroup.id}
                          className="border-border/70 hover:bg-transparent"
                        >
                          {headerGroup.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              className="h-11 text-[11px] font-extrabold tracking-wider uppercase text-muted-foreground py-3.5 px-5"
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            data-state={row.getIsSelected() && "selected"}
                            className="border-border/70 hover:bg-muted/40 transition-colors cursor-pointer"
                            onClick={() => setSelected(row.original)}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                className="py-3.5 px-5 align-middle"
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-32 text-center text-[13.5px] text-muted-foreground"
                          >
                            {t("noMatch")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>

          {/* Table Pagination */}
          {customers.length > 0 && (
            <div className="px-5 py-3.5 flex items-center justify-between text-[12.5px] text-muted-foreground border-t border-border/80 bg-muted/20">
              <span>
                {t("showingCount", {
                  count: table.getFilteredRowModel().rows.length,
                })}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="size-8 rounded-xl border border-border/80 bg-card flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-[13px] font-extrabold px-2 text-foreground">
                  {table.getState().pagination.pageIndex + 1} /{" "}
                  {table.getPageCount() || 1}
                </span>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="size-8 rounded-xl border border-border/80 bg-card flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <CustomerHistoryDialog
        customer={selected}
        onClose={() => setSelected(null)}
        onSendOffer={(c) => openPromoForGroup(c)}
      />

      <BroadcastPromoModal
        isOpen={isPromoModalOpen}
        onClose={() => setIsPromoModalOpen(false)}
        customers={customers}
        initialTarget={promoTarget}
      />
    </div>
  );
}

function CustomerHistoryDialog({
  customer,
  onClose,
  onSendOffer,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSendOffer: (customer: Customer) => void;
}) {
  const t = useTranslations("CustomersDashboard");
  const { data, isPending } = useQuery({
    queryKey: ["customer-orders", customer?.id],
    queryFn: () => fetchCustomerOrders(customer!.id),
    enabled: customer !== null,
  });

  const tier = customer ? getCustomerTier(customer.order_count) : null;
  const TierIcon = tier?.icon;
  const waHref = customer ? formatWhatsAppLink(customer.phone, customer.name) : "#";

  const totalSpent = data?.total_spent ?? 0;
  const orderCount = data?.orders.length ?? customer?.order_count ?? 1;
  const avgBasket = orderCount > 0 ? totalSpent / orderCount : 0;

  return (
    <Dialog open={customer !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col min-h-0 rounded-3xl p-4 sm:p-7 bg-card/98 backdrop-blur-2xl border-border/80 shadow-2xl space-y-4">
        <DialogHeader className="border-b border-border/60 pb-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pr-6">
            <div className="flex items-center gap-3">
              {customer && tier && (
                <div
                  className={cn(
                    "size-11 sm:size-12 rounded-full font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-md border-2 border-white/20",
                    tier.avatarBg
                  )}
                >
                  {(customer.name || "?")
                    .split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2 flex-wrap">
                  <span className="truncate">{customer?.name}</span>
                  {tier && TierIcon && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shadow-2xs shrink-0",
                        tier.badgeClass
                      )}
                    >
                      <TierIcon className="size-2.5 shrink-0" />
                      {tier.label}
                    </span>
                  )}
                </DialogTitle>
                <p className="text-xs font-semibold text-muted-foreground mt-1 flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary shrink-0" />
                  {customer?.first_seen
                    ? t("customerSince", { date: formatDateTime(customer.first_seen).split(" ")[0] })
                    : ""}
                </p>
              </div>
            </div>

            {/* Direct Action Contact CTAs */}
            {customer && (
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Button
                  type="button"
                  onClick={() => onSendOffer(customer)}
                  className="rounded-xl font-extrabold text-xs gap-1.5 px-2.5 sm:px-3 py-2 h-8.5 sm:h-9 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30 transition-all shadow-2xs cursor-pointer flex-1 sm:flex-none justify-center whitespace-nowrap"
                >
                  <Gift className="size-3.5 stroke-[2.25] shrink-0" />
                  <span>Offrir une promo</span>
                </Button>
                <a
                  href={`tel:${customer.phone}`}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold bg-muted/60 text-foreground hover:bg-muted border border-border/80 transition-all h-8.5 sm:h-9 flex-1 sm:flex-none whitespace-nowrap"
                >
                  <Phone className="size-3.5 text-primary shrink-0" />
                  {customer.phone}
                </a>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all shadow-2xs h-8.5 sm:h-9 shrink-0 whitespace-nowrap"
                >
                  <MessageCircle className="size-4 stroke-[2.25] shrink-0" />
                  <span>WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </DialogHeader>

        {customer && (
          <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 pt-1 pr-1">
            {/* Left Column: Financial KPIs & Overview */}
            <div className="md:col-span-5 space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Aperçu financier
                </span>

                {/* Total Spent */}
                <div className="bg-primary/10 border border-primary/25 rounded-2xl p-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-extrabold text-primary">
                    <span>Total dépensé</span>
                    <Receipt className="size-4 text-primary shrink-0" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-primary mt-1.5 truncate">
                    {isPending ? "…" : formatPrice(totalSpent, "MAD")}
                  </div>
                </div>

                {/* Orders Count & Average Basket Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider truncate">
                      Commandes
                    </span>
                    <span className="text-base sm:text-lg font-black text-foreground mt-1 block truncate">
                      {orderCount}
                    </span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3.5 min-w-0">
                    <span className="block text-[10px] font-extrabold uppercase text-amber-600 dark:text-amber-400 tracking-wider truncate">
                      Panier moyen
                    </span>
                    <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-1 block truncate">
                      {isPending ? "…" : formatPrice(avgBasket, "MAD")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Quick Stats Box */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-4 space-y-2.5">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Fidélité client
                </span>
                <div className="flex items-center justify-between text-xs font-bold gap-2">
                  <span className="text-muted-foreground shrink-0">Statut :</span>
                  <span className="font-extrabold text-foreground truncate">{tier?.label}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold gap-2">
                  <span className="text-muted-foreground shrink-0">Commandes totales :</span>
                  <span className="font-extrabold text-foreground truncate">{orderCount} commandes</span>
                </div>
              </div>
            </div>

            {/* Right Column: Order History Cards */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 truncate">
                  <Receipt className="size-3.5 text-primary shrink-0" /> {t("orderHistory")}
                </span>
                <span className="text-xs font-bold text-muted-foreground shrink-0">
                  {data?.orders.length ?? 0} commande(s)
                </span>
              </div>

              <div className="max-h-[340px] md:max-h-[380px] overflow-y-auto pr-1 space-y-3 custom-scrollbar scrollbar-thin">
                {isPending && (
                  <div className="py-16 flex items-center justify-center">
                    <div className="size-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {!isPending && (data?.orders.length ?? 0) === 0 && (
                  <p className="py-12 text-center text-xs font-semibold text-muted-foreground bg-muted/30 rounded-2xl border border-dashed border-border/80">
                    {t("noOrdersForCustomer")}
                  </p>
                )}
                {data?.orders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 text-xs shadow-2xs hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs text-foreground bg-muted/60 px-2.5 py-0.5 rounded-lg border border-border/60">
                          CMD-{o.id.slice(0, 4).toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold text-muted-foreground">
                          {formatDateTime(o.created_at)}
                        </span>
                      </div>
                      <span className="font-black text-sm text-foreground">
                        {formatPrice(o.total, "MAD")}
                      </span>
                    </div>

                    <div className="space-y-2 border-t border-border/60 pt-2.5">
                      {o.items.map((l, i) => {
                        const imgSrc = getDishImage({ id: l.item_id || l.name, image_url: (l as any).image_url });
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs text-foreground bg-muted/20 p-1.5 rounded-xl border border-border/40 gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="size-8 rounded-full overflow-hidden shrink-0 border border-border/60 relative bg-muted">
                                <Image
                                  src={imgSrc}
                                  alt={l.name}
                                  fill
                                  className="object-cover scale-[1.4]"
                                />
                              </div>
                              <span className="font-bold truncate">{l.name}</span>
                            </div>
                            <span className="font-extrabold text-primary shrink-0 bg-primary/10 px-2 py-0.5 rounded-md">
                              {l.quantity}×
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface BroadcastPromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  initialTarget?: "all" | "vip" | "recurring" | "new" | Customer;
}

function BroadcastPromoModal({
  isOpen,
  onClose,
  customers,
  initialTarget = "all",
}: BroadcastPromoModalProps) {
  const [targetGroup, setTargetGroup] = useState<"all" | "vip" | "recurring" | "new" | "single">(
    typeof initialTarget === "object" ? "single" : initialTarget
  );
  const [selectedSingleCustomer, setSelectedSingleCustomer] = useState<Customer | null>(
    typeof initialTarget === "object" ? initialTarget : null
  );

  const [messageTemplate, setMessageTemplate] = useState<"vip_discount" | "loyalty_gift" | "welcome_offer" | "custom">(
    "vip_discount"
  );
  const [customMessage, setCustomMessage] = useState(
    "Bonjour {nom} ! 🌟 En tant que client VIP, profitez de -15% sur votre prochaine commande avec le code promo VIP15 ! À très bientôt."
  );

  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const targetClients = useMemo(() => {
    if (targetGroup === "single" && selectedSingleCustomer) {
      return [selectedSingleCustomer];
    }
    return customers.filter((c) => {
      if (targetGroup === "vip") return c.order_count >= 4;
      if (targetGroup === "recurring") return c.order_count >= 2;
      if (targetGroup === "new") return new Date(c.first_seen) >= thirtyDaysAgo;
      return true;
    });
  }, [customers, targetGroup, selectedSingleCustomer, thirtyDaysAgo]);

  const handleTemplateChange = (template: "vip_discount" | "loyalty_gift" | "welcome_offer" | "custom") => {
    setMessageTemplate(template);
    if (template === "vip_discount") {
      setCustomMessage(
        "Bonjour {nom} ! 🌟 En tant que client VIP, profitez de -15% sur votre prochaine commande avec le code promo VIP15 ! À très bientôt."
      );
    } else if (template === "loyalty_gift") {
      setCustomMessage(
        "Bonjour {nom} ! 🎁 Pour vous remercier de votre fidélité, une boisson vous est offerte lors de votre prochain repas chez nous !"
      );
    } else if (template === "welcome_offer") {
      setCustomMessage(
        "Bonjour {nom} ! 👋 Merci pour votre commande. Bénéficiez de 10 MAD offerts sur votre prochaine livraison avec le code WELCOME10 !"
      );
    }
  };

  const copyMessageText = (c?: Customer) => {
    const name = c?.name || "cher client";
    const text = customMessage.replace(/\{nom\}/g, name);
    navigator.clipboard.writeText(text);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col min-h-0 rounded-3xl p-4 sm:p-5 bg-card/98 backdrop-blur-2xl border-border/80 shadow-2xl space-y-3">
        <DialogHeader className="border-b border-border/60 pb-2.5 shrink-0">
          <DialogTitle className="flex items-center gap-2.5 font-display min-w-0 pr-6">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs shrink-0">
              <Megaphone className="size-4.5 stroke-[2.25]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-black text-foreground leading-none">
                Campagne Promo WhatsApp
              </h3>
              <p className="text-xs font-semibold text-muted-foreground mt-1 leading-normal truncate sm:whitespace-normal">
                Envoyez des offres ciblées et codes promos par WhatsApp selon les tags clients.
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-3.5 pr-1">
          {/* Left Column: Audience & Template Selection */}
          <div className="md:col-span-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              {/* Target Audience */}
              <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 space-y-2.5">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  1. Audience cible ({targetClients.length} client{targetClients.length > 1 ? "s" : ""})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetGroup("all")}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-between cursor-pointer shadow-2xs",
                      targetGroup === "all"
                        ? "border-primary/50 bg-primary/15 text-primary ring-2 ring-primary/20"
                        : "border-border/80 bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>Tous</span>
                    <Badge variant="outline" className="text-[10px] font-extrabold px-2 py-0.5 bg-muted/60">{customers.length}</Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetGroup("vip")}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-between cursor-pointer shadow-2xs",
                      targetGroup === "vip"
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20"
                        : "border-border/80 bg-card text-amber-600/80 dark:text-amber-400/80 hover:bg-amber-500/10"
                    )}
                  >
                    <span className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-amber-500" /> VIP (4+)</span>
                    <Badge variant="outline" className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      {customers.filter((c) => c.order_count >= 4).length}
                    </Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetGroup("recurring")}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-between cursor-pointer shadow-2xs",
                      targetGroup === "recurring"
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                        : "border-border/80 bg-card text-emerald-600/80 dark:text-emerald-400/80 hover:bg-emerald-500/10"
                    )}
                  >
                    <span className="flex items-center gap-1.5"><Star className="size-3.5 text-emerald-500" /> Habitués</span>
                    <Badge variant="outline" className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      {customers.filter((c) => c.order_count >= 2).length}
                    </Badge>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetGroup("new")}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl text-xs font-extrabold border transition-all flex items-center justify-between cursor-pointer shadow-2xs",
                      targetGroup === "new"
                        ? "border-primary/50 bg-primary/15 text-primary ring-2 ring-primary/20"
                        : "border-border/80 bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span className="flex items-center gap-1.5"><Users className="size-3.5 text-primary" /> Nouveaux</span>
                    <Badge variant="outline" className="text-[10px] font-extrabold px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                      {customers.filter((c) => new Date(c.first_seen) >= thirtyDaysAgo).length}
                    </Badge>
                  </button>
                </div>
              </div>

              {/* Offer Template Select */}
              <div className="space-y-1.5">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  2. Modèle d&apos;offre promo
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTemplateChange("vip_discount")}
                    className={cn(
                      "p-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-2xs",
                      messageTemplate === "vip_discount"
                        ? "border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20"
                        : "border-border/80 bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <div className="size-5 rounded-md bg-amber-500/20 flex items-center justify-center">
                      <Percent className="size-3 text-amber-500" />
                    </div>
                    <span className="font-extrabold text-[11.5px]">Réduction -15%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTemplateChange("loyalty_gift")}
                    className={cn(
                      "p-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-2xs",
                      messageTemplate === "loyalty_gift"
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20"
                        : "border-border/80 bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <div className="size-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
                      <Gift className="size-3 text-emerald-500" />
                    </div>
                    <span className="font-extrabold text-[11.5px]">Cadeau boisson</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTemplateChange("welcome_offer")}
                    className={cn(
                      "p-2 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex flex-col justify-between gap-1.5 shadow-2xs",
                      messageTemplate === "welcome_offer"
                        ? "border-primary/50 bg-primary/15 text-primary ring-2 ring-primary/20"
                        : "border-border/80 bg-card text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <div className="size-5 rounded-md bg-primary/20 flex items-center justify-center">
                      <Sparkles className="size-3 text-primary" />
                    </div>
                    <span className="font-extrabold text-[11.5px]">Code 10 MAD</span>
                  </button>
                </div>
              </div>

              {/* Message Textarea */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                    <span>Message personnalisé</span>
                    <span className="text-[9.5px] font-black text-primary bg-primary/10 px-1 py-0.2 rounded border border-primary/20">
                      &#123;nom&#125;
                    </span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => copyMessageText()}
                    className="text-[10.5px] font-extrabold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="size-3" /> Copier
                  </button>
                </div>
                <Textarea
                  rows={4}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="rounded-xl text-xs font-medium bg-card border-border/80 shadow-2xs leading-relaxed focus-visible:ring-primary/30 py-2.5 px-3 min-h-[96px]"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Direct Target Client WhatsApp Broadcaster */}
          <div className="md:col-span-6 space-y-2 flex flex-col justify-between">
            <div className="bg-muted/30 border border-border/60 rounded-2xl p-2.5 space-y-2 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="block text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  3. Destinataires ciblés ({targetClients.length})
                </span>
                <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Prêt à envoyer
                </span>
              </div>

              <div className="max-h-[300px] md:max-h-[340px] overflow-y-auto pr-1 space-y-1.5 flex-1 custom-scrollbar scrollbar-thin">
                {targetClients.length === 0 ? (
                  <div className="py-10 text-center text-xs font-semibold text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border/80">
                    Aucun client dans ce groupe d&apos;audience.
                  </div>
                ) : (
                  targetClients.map((c) => {
                    const tier = getCustomerTier(c.order_count);
                    const name = c.name || "Client";
                    const waText = encodeURIComponent(customMessage.replace(/\{nom\}/g, name));
                    let cleanPhone = c.phone.replace(/[^\d]/g, "");
                    if (cleanPhone.startsWith("0")) cleanPhone = "212" + cleanPhone.slice(1);
                    const waHref = `https://wa.me/${cleanPhone}?text=${waText}`;

                    const initials = name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-all shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "size-7.5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs border border-white/20",
                              tier.avatarBg
                            )}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-[12px] truncate text-foreground flex items-center gap-1">
                              {name}
                              <span className="text-[9px] font-black uppercase text-muted-foreground bg-muted px-1.5 py-0.1 rounded border border-border/60">
                                {c.order_count} cmd
                              </span>
                            </div>
                            <div className="text-[10.5px] font-bold text-muted-foreground truncate mt-0.2">
                              {c.phone}
                            </div>
                          </div>
                        </div>

                        <a
                          href={waHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-extrabold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all shrink-0 cursor-pointer active:scale-95"
                        >
                          <Send className="size-3 stroke-[2.25]" />
                          <span>Envoyer WhatsApp</span>
                        </a>
                      </div>
                    );
                  })
                )}
              </div>

              <p className="text-[10.5px] font-semibold text-muted-foreground flex items-center gap-1.5 border-t border-border/60 pt-2">
                <MessageCircle className="size-3.5 text-emerald-500 shrink-0" />
                Cliquez sur « Envoyer WhatsApp » pour ouvrir le message personnalisé direct.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 pt-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl font-bold text-xs px-4 h-9 sm:h-8.5 border-border/80 hover:bg-muted cursor-pointer"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
