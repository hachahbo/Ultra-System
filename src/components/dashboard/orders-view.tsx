"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Search,
  ChevronRight,
  ChevronLeft,
  Pencil,
  Trash2,
  Eye,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  RowSelectionState,
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

export function OrdersView() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Filter>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPosModalOpen, setPosModalOpen] = useState(false);

  // Edit / View Modal State
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [editStatus, setEditStatus] = useState<"new" | "preparing" | "done">("new");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Modal State
  const [selectedOrderForDelete, setSelectedOrderForDelete] = useState<Order | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const openEditModal = (order: Order) => {
    setSelectedOrderForEdit(order);
    setEditCustomerName(order.customer_name || "");
    setEditTableNumber(order.table_number || "");
    setEditStatus((order.status as "new" | "preparing" | "done") || "new");
  };

  const handleSaveEdit = async () => {
    if (!selectedOrderForEdit) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/dashboard/orders/${selectedOrderForEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          customer_name: editCustomerName.trim() || null,
          table_number: editTableNumber.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update order");
      toast.success("Commande mise à jour avec succès");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrderForEdit(null);
    } catch {
      toast.error("Erreur lors de la mise à jour de la commande");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!selectedOrderForDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/dashboard/orders/${selectedOrderForDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete order");
      toast.success("Commande supprimée avec succès");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrderForDelete(null);
      setRowSelection({});
    } catch {
      toast.error("Erreur lors de la suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedOrderIds = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((indexStr) => filteredOrders[Number(indexStr)]?.id)
      .filter(Boolean);
  }, [rowSelection, filteredOrders]);

  const handleBulkStatusChange = async (newStatus: "new" | "preparing" | "done") => {
    if (selectedOrderIds.length === 0) return;
    try {
      await Promise.all(
        selectedOrderIds.map((id) =>
          fetch(`/api/dashboard/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      toast.success(`${selectedOrderIds.length} commande(s) mise(s) à jour`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setRowSelection({});
    } catch {
      toast.error("Erreur lors de la mise à jour des commandes");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsDeleting(true);
    try {
      await Promise.all(
        selectedOrderIds.map((id) =>
          fetch(`/api/dashboard/orders/${id}`, {
            method: "DELETE",
          })
        )
      );
      toast.success(`${selectedOrderIds.length} commande(s) supprimée(s)`);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setRowSelection({});
      setIsBulkDeleteModalOpen(false);
    } catch {
      toast.error("Erreur lors de la suppression des commandes");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<Order>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            aria-label="Sélectionner tout"
            className="size-4 rounded border-border accent-primary cursor-pointer align-middle"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label="Sélectionner la ligne"
            className="size-4 rounded border-border accent-primary cursor-pointer align-middle"
          />
        ),
      },
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
      {
        id: "actions",
        header: () => <div className="text-right tracking-wider">ACTIONS</div>,
        cell: ({ row }) => {
          const order = row.original;
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(order);
                }}
                title="Modifier la commande"
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedOrderForDelete(order);
                }}
                title="Supprimer la commande"
                className="size-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="size-4 stroke-[#ef4444]" />
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      globalFilter,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
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

        {/* Multi-Select Bulk Actions Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="mb-4 bg-primary/10 border border-primary/20 rounded-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-extrabold text-xs">
                {selectedOrderIds.length}
              </span>
              <span className="text-sm font-bold text-foreground">
                commande{selectedOrderIds.length > 1 ? "s" : ""} sélectionnée{selectedOrderIds.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground mr-1">Changer statut:</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange("new")}
                className="rounded-xl text-xs font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              >
                En cours
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange("preparing")}
                className="rounded-xl text-xs font-bold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              >
                Prête
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusChange("done")}
                className="rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                Terminée
              </Button>

              <div className="h-4 w-px bg-border mx-1" />

              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="rounded-xl text-xs font-bold gap-1.5"
              >
                <Trash2 className="size-3.5" />
                Supprimer ({selectedOrderIds.length})
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRowSelection({})}
                className="rounded-xl text-xs font-bold"
              >
                <X className="size-3.5 mr-1" />
                Annuler
              </Button>
            </div>
          </div>
        )}

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
                {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
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

      {/* Edit / View Order Modal */}
      <Dialog open={!!selectedOrderForEdit} onOpenChange={(open) => !open && setSelectedOrderForEdit(null)}>
        <DialogContent className="max-w-xl rounded-3xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold flex items-center justify-between">
              <span>
                Commande CMD-{selectedOrderForEdit?.id.slice(0, 4).toUpperCase()}
              </span>
              <span className="text-xs font-semibold text-muted-foreground font-mono">
                {selectedOrderForEdit && new Date(selectedOrderForEdit.created_at).toLocaleString("fr-FR")}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selectedOrderForEdit && (
            <div className="space-y-6 py-2">
              {/* Status Pills */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Statut de la commande
                </Label>
                <div className="flex gap-2">
                  {(["new", "preparing", "done"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={cn(
                        "flex-1 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all",
                        editStatus === st
                          ? "border-primary bg-primary/15 text-primary shadow-sm"
                          : "border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {STATUS_MAP[st]?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer & Table details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-customer" className="text-xs font-bold text-muted-foreground">
                    Nom du client
                  </Label>
                  <Input
                    id="edit-customer"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    placeholder="Sur place / Nom"
                    className="rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-table" className="text-xs font-bold text-muted-foreground">
                    Table N°
                  </Label>
                  <Input
                    id="edit-table"
                    value={editTableNumber}
                    onChange={(e) => setEditTableNumber(e.target.value)}
                    placeholder="Ex: T3"
                    className="rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Articles Breakdown */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Détail des articles ({selectedOrderForEdit.items?.length || 0})
                </Label>
                <div className="bg-muted/30 border border-border rounded-2xl p-3.5 space-y-2.5 max-h-48 overflow-y-auto">
                  {selectedOrderForEdit.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-primary text-xs bg-primary/10 px-2 py-0.5 rounded-md">
                          x{item.quantity}
                        </span>
                        <span className="font-semibold truncate text-foreground">{item.name}</span>
                      </div>
                      <span className="font-bold text-foreground shrink-0">
                        {formatPrice(item.unit_price * item.quantity, "MAD")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Total */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="font-bold text-base text-foreground">Total de la commande</span>
                <span className="font-extrabold text-xl text-primary">
                  {formatPrice(Number(selectedOrderForEdit.total), "MAD")}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSelectedOrderForEdit(null)}
              className="rounded-xl font-bold text-xs"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              <Check className="size-4" />
              {isSavingEdit ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal (Single Order) */}
      <Dialog open={!!selectedOrderForDelete} onOpenChange={(open) => !open && setSelectedOrderForDelete(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-red-500">
              <AlertTriangle className="size-5" />
              Supprimer la commande
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground py-2">
            Êtes-vous sûr de vouloir supprimer la commande{" "}
            <span className="font-bold text-foreground">
              CMD-{selectedOrderForDelete?.id.slice(0, 4).toUpperCase()}
            </span>{" "}
            ? Cette action est irréversible.
          </p>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setSelectedOrderForDelete(null)}
              className="rounded-xl font-bold text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSingle}
              disabled={isDeleting}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              <Trash2 className="size-4" />
              {isDeleting ? "Suppression..." : "Confirmer la suppression"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2 text-red-500">
              <AlertTriangle className="size-5" />
              Suppression groupée
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground py-2">
            Êtes-vous sûr de vouloir supprimer définitivement les{" "}
            <span className="font-bold text-foreground">{selectedOrderIds.length}</span> commandes
            sélectionnées ?
          </p>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="rounded-xl font-bold text-xs gap-1.5"
            >
              <Trash2 className="size-4" />
              {isDeleting ? "Suppression..." : "Supprimer tout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

