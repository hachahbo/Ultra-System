"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, ChevronRight, ChevronLeft, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PosView } from "@/components/dashboard/pos-view";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

async function fetchOrders(): Promise<Order[]> {
  const res = await fetch("/api/dashboard/orders");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).orders;
}

type Filter = "all" | "active" | "done";

const STATUS_MAP: Record<string, { label: string; bg: string; color: string; darkBg: string; darkColor: string }> = {
  new: { label: "En cours", bg: "rgba(236, 91, 26, 0.14)", color: "#c94e10", darkBg: "rgba(236, 91, 26, 0.2)", darkColor: "#f7814b" },
  preparing: { label: "Prête", bg: "rgba(111, 143, 208, 0.16)", color: "#3a5fa0", darkBg: "rgba(111, 143, 208, 0.25)", darkColor: "#84a5e0" },
  done: { label: "Terminée", bg: "rgba(63, 143, 111, 0.16)", color: "#2f7357", darkBg: "rgba(63, 143, 111, 0.25)", darkColor: "#5eb892" },
};

const getStatusBadge = (status: string) => STATUS_MAP[status] || STATUS_MAP.new;

const columns: ColumnDef<Order>[] = [
  {
    accessorKey: "id",
    header: "N° CMD",
    cell: ({ row }) => {
      const order = row.original;
      const code = "CMD-" + order.id.slice(0, 4).toUpperCase();
      const d = new Date(order.created_at);
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      return (
        <div>
          <div className="text-[13px] font-extrabold text-foreground">{code}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{time}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "items",
    header: "ARTICLES",
    cell: ({ row }) => {
      const order = row.original;
      const totalQty = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      const firstItemName = order.items?.[0]?.name || "Article";
      const extraItems = (order.items?.length || 0) - 1;

      return (
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex shrink-0">
            {order.items?.slice(0, 3).map((_, i) => (
              <div 
                key={i} 
                className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-[19px] border-2 border-background shadow-sm"
                style={{ marginLeft: i === 0 ? '0' : '-12px', zIndex: 10 - i }}
              >
                🍔
              </div>
            ))}
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-bold truncate text-foreground">{firstItemName}</div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">
              {extraItems > 0 ? `+ ${extraItems} autre${extraItems > 1 ? 's' : ''} article${extraItems > 1 ? 's' : ''}` : `${totalQty} article${totalQty > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: "quantity",
    header: () => <div className="text-center">QTÉ</div>,
    cell: ({ row }) => {
      const order = row.original;
      const totalQty = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      return <div className="text-center text-[13.5px] font-bold text-foreground">{totalQty}</div>;
    },
  },
  {
    accessorKey: "total",
    header: "MONTANT",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("total"));
      return <div className="text-[14px] font-extrabold text-primary">{formatPrice(amount, "MAD")}</div>;
    },
  },
  {
    accessorKey: "customer_name",
    header: "CLIENT",
    cell: ({ row }) => {
      const name = row.getValue("customer_name") as string || "Sur place";
      const initials = (name === "Sur place" ? "SP" : name)
        .split(" ")
        .map(w => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      return (
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-[30px] h-[30px] rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <span className="text-[13px] font-semibold truncate text-foreground">
            {name}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: "TYPE",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div className="text-[12.5px] font-semibold text-foreground">
          {order.type === "dine_in" ? `Sur place${order.table_number ? ` · T${order.table_number}` : ''}` : "Livraison"}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "STATUT",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const badge = getStatusBadge(status);
      return (
        <div>
          <span 
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-colors dark:hidden"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
          <span 
            className="hidden items-center justify-center px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-colors dark:inline-flex"
            style={{ background: badge.darkBg, color: badge.darkColor }}
          >
            {badge.label}
          </span>
        </div>
      );
    },
  },
];

export function OrdersView() {
  const [tab, setTab] = useState<Filter>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [isPosModalOpen, setPosModalOpen] = useState(false);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    refetchInterval: 10_000,
  });

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (tab === "active" && o.status !== "new" && o.status !== "preparing") return false;
      if (tab === "done" && o.status !== "done") return false;
      return true;
    });
  }, [orders, tab]);

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const customer = String(row.original.customer_name || "").toLowerCase();
      const id = String(row.original.id || "").toLowerCase();
      const val = String(filterValue).toLowerCase();
      return customer.includes(val) || id.includes(val);
    }
  });

  const stats = useMemo(() => {
    const enCours = orders.filter(o => o.status === "new" || o.status === "preparing").length;
    const terminees = orders.filter(o => o.status === "done").length;
    const revenu = orders.reduce((sum, o) => sum + Number(o.total), 0);

    return [
      { label: "Commandes du jour", value: String(orders.length) },
      { label: "En cours", value: String(enCours), textClass: "text-primary" },
      { label: "Terminées", value: String(terminees), textClass: "text-emerald-600 dark:text-emerald-400" },
      { label: "Revenu du jour", value: `${revenu} MAD` },
    ];
  }, [orders]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-4rem)] bg-background -mx-4 -my-6 md:-mx-8 md:-my-8 px-4 md:px-8 py-6 md:py-8">
      <div className="flex-1 min-w-0 flex flex-col w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-tight text-foreground">Commandes</h1>
            <div className="text-[13.5px] text-muted-foreground mt-1">
              {orders.length} commandes aujourd&apos;hui · mise à jour en direct
            </div>
          </div>
          <button 
            onClick={() => setPosModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-[18px] py-[11px] rounded-xl text-[13.5px] font-bold hover:bg-primary/90 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus className="size-4 stroke-[2.5px]" />
            Nouvelle commande
          </button>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-[16px_18px] shadow-sm">
              <div className="text-xs font-bold text-muted-foreground">{s.label}</div>
              <div className={cn("text-2xl font-extrabold tracking-tight mt-1.5 text-foreground", s.textClass)}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
            {[
              { id: "all", label: "Toutes" },
              { id: "active", label: "En cours" },
              { id: "done", label: "Terminées" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as Filter)}
                className={cn(
                  "px-4 py-2 rounded-full text-[13px] font-bold transition-colors border whitespace-nowrap",
                  tab === t.id 
                    ? "bg-foreground border-foreground text-background" 
                    : "bg-card border-border text-foreground hover:bg-muted"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-2 w-full sm:w-[280px] shadow-sm">
            <Search className="size-4 text-muted-foreground" />
            <input 
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Rechercher client ou n° commande"
              className="border-none outline-none text-[13px] w-full bg-transparent text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Datatable */}
        <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} className="h-11 text-[11px] font-bold tracking-wide text-muted-foreground py-3.5">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className="border-border hover:bg-muted/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3.5 px-4 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-[13.5px] text-muted-foreground">
                      Aucune commande ne correspond.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Pagination */}
          <div className="px-5 py-3.5 flex items-center justify-between text-[12.5px] text-muted-foreground border-t border-border bg-muted/20">
            <span>Affichage de {table.getFilteredRowModel().rows.length} commande(s)</span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="w-[30px] h-[30px] rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[13px] font-bold px-2 text-foreground">
                {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
              </span>
              <button 
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="w-[30px] h-[30px] rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* POS Modal Overlay */}
      <Dialog open={isPosModalOpen} onOpenChange={setPosModalOpen}>
        <DialogContent className="max-w-[1440px] sm:max-w-[1440px] w-[95vw] h-[92vh] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <PosView />
        </DialogContent>
      </Dialog>
    </div>
  );
}
