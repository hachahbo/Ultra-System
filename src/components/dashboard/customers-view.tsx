"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Download, ChevronLeft, ChevronRight, Phone, Clock, CalendarDays, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
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
} from "@tanstack/react-table";

async function fetchCustomerOrders(
  id: string,
): Promise<{ orders: Order[]; total_spent: number }> {
  const res = await fetch(`/api/dashboard/customers/${id}/orders`);
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}
const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: "NOM",
    cell: ({ row }) => {
      const name = row.getValue("name") as string || "Inconnu";
      const firstSeen = row.original.first_seen;
      const initials = name
        .split(" ")
        .map(w => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
      return (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-[38px] h-[38px] rounded-full bg-emerald-700 text-white text-[13px] font-extrabold flex items-center justify-center shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className="text-[13.5px] font-extrabold truncate text-foreground">
              {name}
            </span>
            <span className="text-[11.5px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
              <CalendarDays className="size-3" /> Client depuis {formatDateTime(firstSeen).split(' ')[0]}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "TÉLÉPHONE",
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string;
      return (
        <a
          href={`tel:${phone}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground hover:text-foreground transition-colors bg-muted/40 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-border"
        >
          <Phone className="size-3.5 text-primary" />
          {phone}
        </a>
      );
    },
  },
  {
    accessorKey: "order_count",
    header: () => <div className="text-center">COMMANDES</div>,
    cell: ({ row }) => {
      const count = row.getValue("order_count") as number;
      return (
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1.5 text-[13.5px] font-extrabold text-foreground bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            <ShoppingBag className="size-3.5 text-primary" />
            <span>{count}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "last_order",
    header: () => <div className="text-right">DERNIÈRE COMMANDE</div>,
    cell: ({ row }) => {
      const last = row.getValue("last_order") as string | null;
      if (!last) return <div className="text-right text-[13px] text-muted-foreground">—</div>;
      
      const parts = formatDateTime(last).split(' ');
      const date = parts[0];
      const time = parts[1];

      return (
        <div className="flex flex-col items-end justify-center">
          <div className="text-[13px] font-bold text-foreground">{date}</div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <Clock className="size-3" /> à {time}
          </div>
        </div>
      );
    },
  },
];

export function CustomersView({ customers }: { customers: Customer[] }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);

  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const name = String(row.original.name || "").toLowerCase();
      const phone = String(row.original.phone || "").toLowerCase();
      const val = String(filterValue).toLowerCase();
      return name.includes(val) || phone.includes(val);
    }
  });

  const stats = useMemo(() => {
    const total = customers.length;
    const recurring = customers.filter(c => c.order_count > 1).length;
    
    // Calculate new this month
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newThisMonth = customers.filter(c => new Date(c.first_seen) >= thirtyDaysAgo).length;

    return [
      { label: "Total clients", value: String(total), textClass: "text-foreground" },
      { label: "Nouveaux (30j)", value: String(newThisMonth), textClass: "text-primary" },
      { label: "Clients fidèles", value: String(recurring), textClass: "text-emerald-600 dark:text-emerald-400" },
    ];
  }, [customers]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-4rem)] bg-background -mx-4 -my-6 md:-mx-8 md:-my-8 px-4 md:px-8 py-6 md:py-8">
      <div className="flex-1 min-w-0 flex flex-col w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-tight text-foreground">Clients</h1>
            <div className="text-[13.5px] text-muted-foreground mt-1">
              Cette liste vous appartient.
            </div>
          </div>
          <a 
            href="/api/dashboard/customers/export"
            download
            className="flex items-center justify-center gap-2 bg-card text-foreground border border-border px-[18px] py-[11px] rounded-xl text-[13.5px] font-bold hover:bg-muted transition-colors shadow-sm w-full sm:w-auto"
          >
            <Download className="size-4" />
            Exporter CSV
          </a>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-[16px_18px] shadow-sm">
              <div className="text-xs font-bold text-muted-foreground">{s.label}</div>
              <div className={cn("text-2xl font-extrabold tracking-tight mt-1.5", s.textClass)}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="text-[13.5px] text-muted-foreground font-semibold">
            {table.getFilteredRowModel().rows.length} client{table.getFilteredRowModel().rows.length > 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-2 w-full sm:w-[320px] shadow-sm">
            <Search className="size-4 text-muted-foreground" />
            <input 
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Rechercher un client..."
              className="border-none outline-none text-[13px] w-full bg-transparent text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Datatable */}
        <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden min-h-[400px]">
          <div className="flex-1 overflow-auto">
            {customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                <Users className="size-10 mb-4 opacity-20" />
                <p className="text-sm font-semibold">
                  Vos clients apparaîtront ici dès la première commande.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id} className="h-11 text-[11px] font-bold tracking-wide text-muted-foreground py-3.5 px-5">
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
                        className="border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setSelected(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-4 px-5 align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-32 text-center text-[13.5px] text-muted-foreground">
                        Aucun client ne correspond à votre recherche.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Table Pagination */}
          {customers.length > 0 && (
            <div className="px-5 py-3.5 flex items-center justify-between text-[12.5px] text-muted-foreground border-t border-border bg-muted/20">
              <span>Affichage de {table.getFilteredRowModel().rows.length} client(s)</span>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="w-[30px] h-[30px] rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-[13px] font-bold px-2 text-foreground">
                  {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
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
          )}
        </div>
      </div>

      <CustomerHistoryDialog customer={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function CustomerHistoryDialog({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const { data, isPending } = useQuery({
    queryKey: ["customer-orders", customer?.id],
    queryFn: () => fetchCustomerOrders(customer!.id),
    enabled: customer !== null,
  });

  return (
    <Dialog open={customer !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg bg-card text-foreground border-border shadow-xl">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-extrabold">{customer?.name}</DialogTitle>
          <div className="text-sm text-muted-foreground">{customer?.phone}</div>
        </DialogHeader>
        {customer && (
          <div className="mt-2">
            <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-sm mb-4">
              <span className="text-primary font-bold">Total dépensé</span>
              <span className="font-extrabold text-primary text-lg">
                {isPending ? "…" : formatPrice(data?.total_spent ?? 0, "MAD")}
              </span>
            </div>
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Historique des commandes</h4>
              {isPending && (
                <div className="py-12 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!isPending && (data?.orders.length ?? 0) === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
                  Aucune commande pour ce client.
                </p>
              )}
              {data?.orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[13.5px]">CMD-{o.id.slice(0,4).toUpperCase()}</span>
                    <span className="font-extrabold text-foreground">{formatPrice(o.total, "MAD")}</span>
                  </div>
                  <div className="text-[12px] text-muted-foreground mb-3 flex items-center gap-2">
                    <span>{formatDateTime(o.created_at)}</span>
                    <span>•</span>
                    <span className="capitalize">{o.type === 'dine_in' ? 'Sur place' : 'Livraison'}</span>
                  </div>
                  <div className="space-y-1.5">
                    {o.items.map((l, i) => (
                      <div key={i} className="flex gap-2 text-[13px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{l.quantity}×</span>
                        <span>{l.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
