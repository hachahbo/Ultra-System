"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  allowedTransitions,
  isActive,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/order-flow";
import type { Role } from "@/lib/permissions";
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
  FileText,
  Utensils,
  ShoppingBag,
  Clock,
  CheckCircle2,
  User,
  Hash,
  Ban,
  BellRing,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PosView } from "@/components/dashboard/pos-view";
import { formatPrice } from "@/lib/format";
import { getDishImage } from "@/lib/image";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";
import { markOrderSeen, useSeenOrders } from "@/lib/seen-orders";
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

async function fetchMenu(): Promise<{ items: Array<{ id: string; image_url: string | null }> }> {
  const res = await fetch("/api/dashboard/menu");
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

type Filter = "all" | "active" | "done";

// `label` indexes into the Orders.* messages, via ORDER_STATUS_LABELS so every
// surface names a state identically. (The pre-0030 table labelled 'preparing'
// as "ready" and 'new' as "inProgress" — both wrong, and invisible until the
// two concepts became separate states.)
const STATUS_MAP: Record<OrderStatus, { label: string; icon: typeof Clock; bg: string; color: string; darkBg: string; darkColor: string }> = {
  pending: { label: ORDER_STATUS_LABELS.pending, icon: Clock, bg: "rgba(236, 91, 26, 0.14)", color: "#c94e10", darkBg: "rgba(236, 91, 26, 0.2)", darkColor: "#f7814b" },
  confirmed: { label: ORDER_STATUS_LABELS.confirmed, icon: ClipboardCheck, bg: "rgba(111, 143, 208, 0.16)", color: "#3a5fa0", darkBg: "rgba(111, 143, 208, 0.25)", darkColor: "#84a5e0" },
  preparing: { label: ORDER_STATUS_LABELS.preparing, icon: Utensils, bg: "rgba(111, 143, 208, 0.16)", color: "#3a5fa0", darkBg: "rgba(111, 143, 208, 0.25)", darkColor: "#84a5e0" },
  ready: { label: ORDER_STATUS_LABELS.ready, icon: BellRing, bg: "rgba(236, 91, 26, 0.14)", color: "#c94e10", darkBg: "rgba(236, 91, 26, 0.2)", darkColor: "#f7814b" },
  served: { label: ORDER_STATUS_LABELS.served, icon: CheckCircle2, bg: "rgba(63, 143, 111, 0.16)", color: "#2f7357", darkBg: "rgba(63, 143, 111, 0.25)", darkColor: "#5eb892" },
  cancelled: { label: ORDER_STATUS_LABELS.cancelled, icon: Ban, bg: "rgba(120, 120, 120, 0.14)", color: "#6b7280", darkBg: "rgba(160, 160, 160, 0.2)", darkColor: "#9ca3af" },
};

const getStatusBadge = (status: string) => STATUS_MAP[status as OrderStatus] ?? STATUS_MAP.pending;

// Phase 8.1 — payment_status is orthogonal to fulfilment status (a 'served'
// order can still be 'unpaid'). Same badge shape as STATUS_MAP above.
const PAYMENT_STATUS_MAP: Record<string, { label: string; bg: string; color: string; darkBg: string; darkColor: string }> = {
  paid: { label: "paymentPaid", bg: "rgba(63, 143, 111, 0.16)", color: "#2f7357", darkBg: "rgba(63, 143, 111, 0.25)", darkColor: "#5eb892" },
  unpaid: { label: "paymentUnpaid", bg: "rgba(217, 119, 6, 0.14)", color: "#b45309", darkBg: "rgba(217, 119, 6, 0.22)", darkColor: "#f0a94e" },
  refunded: { label: "paymentRefunded", bg: "rgba(120, 113, 108, 0.14)", color: "#57534e", darkBg: "rgba(168, 162, 158, 0.2)", darkColor: "#d6d3d1" },
};

const getPaymentBadge = (status: string) => PAYMENT_STATUS_MAP[status] || PAYMENT_STATUS_MAP.unpaid;

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

export function OrdersView({
  role,
  canSettlePayment = false,
}: {
  role: Role;
  canSettlePayment?: boolean;
}) {
  const t = useTranslations("Orders");
  const queryClient = useQueryClient();
  const seenOrders = useSeenOrders();
  const [tab, setTab] = useState<Filter>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isPosModalOpen, setPosModalOpen] = useState(false);

  // Edit / View Modal State
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editTableNumber, setEditTableNumber] = useState("");
  const [editStatus, setEditStatus] = useState<OrderStatus>("pending");
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

  const { data: menuData } = useQuery({
    queryKey: ["menu"],
    queryFn: fetchMenu,
  });

  const itemImagesMap = useMemo(() => {
    const map = new Map<string, string | null>();
    if (menuData?.items) {
      for (const item of menuData.items) {
        if (item.id && item.image_url) {
          map.set(item.id, item.image_url);
        }
      }
    }
    return map;
  }, [menuData]);

  const getItemImageUrl = (item: { item_id?: string; name?: string; image_url?: string | null }) => {
    const rawUrl = item.image_url || (item.item_id ? itemImagesMap.get(item.item_id) : null) || null;
    return getDishImage({ id: item.item_id || item.name || "dish", image_url: rawUrl });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // "active" is anything still on the floor; the closed bucket is the
      // orders that were actually delivered — a cancelled one was not, and
      // shows only under "all".
      if (tab === "active" && !isActive(o.status)) return false;
      if (tab === "done" && o.status !== "served") return false;
      return true;
    });
  }, [orders, tab]);

  const openEditModal = (order: Order) => {
    markOrderSeen(order.id);
    setSelectedOrderForEdit(order);
    setEditCustomerName(order.customer_name || "");
    setEditTableNumber(order.table_number || "");
    setEditStatus(order.status);
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
      toast.success(t("updated"));
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrderForEdit(null);
    } catch {
      toast.error(t("updateFailed"));
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
      toast.success(t("deleted"));
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedOrderForDelete(null);
      setRowSelection({});
    } catch {
      toast.error(t("deleteFailed"));
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

  // Targets legal for EVERY order in the selection. A mixed selection
  // (some pending, some ready) correctly offers only what they share, which
  // is usually just "cancelled" — better than firing a batch half of which
  // the state machine will reject.
  const bulkTargets = useMemo(() => {
    const selected = filteredOrders.filter((o) => selectedOrderIds.includes(o.id));
    if (selected.length === 0) return [] as OrderStatus[];
    return selected
      .map((o) => allowedTransitions(role, o.status))
      .reduce((shared, next) => shared.filter((st) => next.includes(st)));
  }, [filteredOrders, selectedOrderIds, role]);

  const handleBulkStatusChange = async (newStatus: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;
    try {
      const results = await Promise.all(
        selectedOrderIds.map((id) =>
          fetch(`/api/dashboard/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      // Report what actually happened: a 409 from a concurrent update is
      // normal here, and silently claiming success would hide it.
      const ok = results.filter((r) => r.ok).length;
      if (ok === results.length) {
        toast.success(`${ok} commande(s) mise(s) à jour`);
      } else {
        toast.warning(`${ok}/${results.length} commande(s) mise(s) à jour`);
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setRowSelection({});
    } catch {
      toast.error(t("bulkUpdateFailed"));
    }
  };

  const markPaidMutation = useMutation({
    mutationFn: markOrderPaid,
    onSuccess: () => {
      toast.success(t("paymentMarked"));
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: () => toast.error(t("paymentMarkFailed")),
  });

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
      toast.error(t("bulkDeleteFailed"));
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
            aria-label={t("selectAll")}
            className="size-4 rounded border-border accent-primary cursor-pointer align-middle"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            aria-label={t("selectRow")}
            className="size-4 rounded border-border accent-primary cursor-pointer align-middle"
          />
        ),
      },
      {
        accessorKey: "id",
        header: t("colNumber"),
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
                {order.items?.slice(0, 3).map((item, i) => {
                  const imageUrl = getItemImageUrl(item);
                  return (
                    <div
                      key={i}
                      className="relative w-10 h-10 rounded-full overflow-hidden border-1 border-background shadow-sm bg-muted shrink-0"
                      style={{ marginLeft: i === 0 ? '0' : '-12px', zIndex: 10 - i }}
                    >
                      <img
                        src={imageUrl}
                        alt={item.name}
                        className="size-full object-cover scale-[1.2]"
                      />
                    </div>
                  );
                })}
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
        header: () => <div className="text-center">{t("colQty")}</div>,
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
          // Dine-in QR orders may carry a phone with no name — it's the only
          // callback the kitchen has, so show it under the name either way.
          const phone = row.original.customer_phone;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-[30px] h-[30px] rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <span className="block text-[13px] font-semibold truncate text-foreground">
                  {name}
                </span>
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="block text-[11.5px] text-muted-foreground truncate tabular-nums hover:text-foreground hover:underline"
                  >
                    {phone}
                  </a>
                )}
              </div>
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
                {t(badge.label)}
              </span>
              <span 
                className="hidden items-center justify-center px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-colors dark:inline-flex"
                style={{ background: badge.darkBg, color: badge.darkColor }}
              >
                {t(badge.label)}
              </span>
            </div>
          );
        },
      },
      {
        id: "payment",
        header: "PAIEMENT",
        cell: ({ row }) => {
          const order = row.original;
          const badge = getPaymentBadge(order.payment_status);
          return (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-colors dark:hidden"
                style={{ background: badge.bg, color: badge.color }}
              >
                {t(badge.label)}
              </span>
              <span
                className="hidden items-center justify-center px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-colors dark:inline-flex"
                style={{ background: badge.darkBg, color: badge.darkColor }}
              >
                {t(badge.label)}
              </span>
              {canSettlePayment && order.payment_status === "unpaid" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markPaidMutation.mutate(order.id);
                  }}
                  disabled={markPaidMutation.isPending}
                  className="text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
                >
                  {t("markPaid")}
                </button>
              )}
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
            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(order);
                }}
                title="Détails de la commande"
                className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Eye className="size-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(order);
                }}
                title={t("editOrder")}
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
      const phone = String(row.original.customer_phone || "").toLowerCase();
      const id = String(row.original.id || "").toLowerCase();
      const val = String(filterValue).toLowerCase();
      return customer.includes(val) || phone.includes(val) || id.includes(val);
    }
  });

  const stats = useMemo(() => {
    const enCours = orders.filter(o => isActive(o.status)).length;
    const terminees = orders.filter(o => o.status === "served").length;
    // A cancelled order carries a non-zero total but earned nothing. Mirrors
    // the same exclusion in get_order_aggregates (0030 §9).
    const revenu = orders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + Number(o.total), 0);

    return [
      { label: t("title"), value: String(orders.length) },
      { label: t("inProgress"), value: String(enCours), textClass: "text-primary" },
      { label: t("donePlural"), value: String(terminees), textClass: "text-emerald-600 dark:text-emerald-400" },
      { label: t("revenue"), value: `${revenu} MAD` },
    ];
  }, [orders]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-4rem)] bg-background -mx-4 -my-6 md:-mx-8 md:-my-8 px-4 md:px-8 py-6 md:py-8">
      <div className="flex-1 min-w-0 flex flex-col w-full">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
          <div>
            <h1 className="m-0 text-[26px] font-extrabold tracking-tight text-foreground">{t("title")}</h1>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {canSettlePayment && (
              <Link
                href="/dashboard/orders/reconciliation"
                className="flex items-center justify-center gap-1.5 border border-border bg-card px-4 py-[11px] rounded-xl text-[13.5px] font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
              >
                {t("reconciliation")}
              </Link>
            )}
            <button
              onClick={() => setPosModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-primary text-primary-foreground px-[18px] py-[11px] rounded-xl text-[13.5px] font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="size-4 stroke-[2.5px]" />
              {t("newOrder")}
            </button>
          </div>
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
              {bulkTargets.length > 0 && (
                <>
                  <span className="text-xs font-semibold text-muted-foreground mr-1">{t("changeStatus")}</span>
                  {bulkTargets.map((st) => (
                    <Button
                      key={st}
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkStatusChange(st)}
                      className="rounded-xl text-xs font-bold"
                    >
                      {t(STATUS_MAP[st].label)}
                    </Button>
                  ))}
                  <div className="h-4 w-px bg-border mx-1" />
                </>
              )}

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
              { id: "all", label: t("all") },
              { id: "active", label: t("inProgress") },
              { id: "done", label: t("donePlural") },
            ].map((tab_) => (
              <button
                key={tab_.id}
                onClick={() => setTab(tab_.id as Filter)}
                className={cn(
                  "px-4 py-2 rounded-full text-[13px] font-bold transition-colors border whitespace-nowrap",
                  tab === tab_.id 
                    ? "bg-foreground border-foreground text-background" 
                    : "bg-card border-border text-foreground hover:bg-muted"
                )}
              >
                {tab_.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3.5 py-2 w-full sm:w-[280px] shadow-sm">
            <Search className="size-4 text-muted-foreground" />
            <input 
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={t("search")}
              className="border-none outline-none text-[13px] w-full bg-transparent text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Datatable */}
        <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col shadow-sm overflow-hidden min-w-0">
          <div className="flex-1 overflow-auto">
            {/* Mobile: card list */}
            <div className="flex flex-col gap-3 p-3.5 md:hidden">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const order = row.original;
                  const isNewUnread = order.status === "pending" && !seenOrders.has(order.id);
                  const code = "CMD-" + order.id.slice(0, 4).toUpperCase();
                  const d = new Date(order.created_at);
                  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                  const badge = getStatusBadge(order.status as string);
                  const totalQty = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                  const firstItemName = order.items?.[0]?.name || "Article";
                  const extraItems = (order.items?.length || 0) - 1;
                  return (
                    <div
                      key={row.id}
                      onClick={() => openEditModal(order)}
                      className={cn(
                        "rounded-xl border p-4 shadow-sm transition-colors cursor-pointer",
                        isNewUnread
                          ? "bg-amber-500/12 border-orange-500/40 hover:border-orange-500/60 dark:bg-amber-500/15 border-l-4 border-l-orange-500"
                          : "border-border bg-card hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[14px] font-extrabold text-foreground">{code}</div>
                          <div className="text-[11.5px] text-muted-foreground mt-0.5">{time}</div>
                        </div>
                        <span
                          className="inline-flex shrink-0 items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {t(badge.label)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex shrink-0">
                          {order.items?.slice(0, 3).map((item, i) => {
                            const imageUrl = getItemImageUrl(item);
                            return (
                              <div
                                key={i}
                                className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-background shadow-xs bg-muted shrink-0"
                                style={{ marginLeft: i === 0 ? "0" : "-10px", zIndex: 10 - i }}
                              >
                                <img
                                  src={imageUrl}
                                  alt={item.name}
                                  className="size-full object-cover scale-[1.4]"
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13.5px] font-bold text-foreground truncate">{firstItemName}</div>
                          <div className="text-[11.5px] text-muted-foreground mt-0.5">
                            {extraItems > 0
                              ? `+ ${extraItems} autre${extraItems > 1 ? "s" : ""} article${extraItems > 1 ? "s" : ""}`
                              : `${totalQty} article${totalQty > 1 ? "s" : ""}`}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-foreground truncate">
                            {order.customer_name || "Sur place"}
                          </div>
                          <div className="text-[11.5px] text-muted-foreground">
                            {order.type === "dine_in"
                              ? `Sur place${order.table_number ? ` · T${order.table_number}` : ""}`
                              : "Livraison"}
                          </div>
                        </div>
                        <div className="text-[15px] font-extrabold text-primary shrink-0">
                          {formatPrice(Number(order.total), "MAD")}
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        {(() => {
                          const paymentBadge = getPaymentBadge(order.payment_status);
                          return (
                            <span
                              className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold dark:hidden"
                              style={{ background: paymentBadge.bg, color: paymentBadge.color }}
                            >
                              {t(paymentBadge.label)}
                            </span>
                          );
                        })()}
                        {canSettlePayment && order.payment_status === "unpaid" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markPaidMutation.mutate(order.id); }}
                            disabled={markPaidMutation.isPending}
                            className="text-[11px] font-bold text-primary hover:underline disabled:opacity-50"
                          >
                            {t("markPaid")}
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(order); }}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12.5px] font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="size-3.5" /> Voir
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedOrderForDelete(order); }}
                          aria-label="Supprimer la commande"
                          className="flex size-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="size-4 stroke-[#ef4444]" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-[13.5px] text-muted-foreground">
                  {t("empty")}
                </div>
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block w-full min-w-0 overflow-x-auto">
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
                  table.getRowModel().rows.map((row) => {
                    const isNewUnread = row.original.status === "pending" && !seenOrders.has(row.original.id);
                    return (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                        onClick={() => openEditModal(row.original)}
                        className={cn(
                          "border-border transition-colors cursor-pointer",
                          isNewUnread
                            ? "bg-amber-500/12 hover:bg-amber-500/20 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border-l-4 border-l-orange-500 font-medium"
                            : "hover:bg-muted/50"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3.5 px-4 align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-[13.5px] text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
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
        {isPosModalOpen && (
          <DialogContent showCloseButton={false} className="w-full max-w-full sm:max-w-[1440px] sm:w-[95vw] h-[98dvh] sm:h-[92vh] p-0 overflow-hidden bg-transparent border-none shadow-none rounded-[28px] sm:rounded-[24px]">
            <DialogTitle className="sr-only">{t("newOrder")}</DialogTitle>
            <PosView onClose={() => setPosModalOpen(false)} />
          </DialogContent>
        )}
      </Dialog>

      {/* Edit / View Order Modal */}
      <Dialog open={!!selectedOrderForEdit} onOpenChange={(open) => !open && setSelectedOrderForEdit(null)}>
        <DialogContent className="w-[94vw] max-w-[94vw] sm:max-w-3xl lg:max-w-4xl max-h-[92dvh] overflow-y-auto rounded-[28px] sm:rounded-3xl p-4 sm:p-7 bg-card/98 backdrop-blur-2xl border-border/80 shadow-2xl space-y-4 my-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-display border-b border-border/60 pb-3.5">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                  <ShoppingBag className="size-5 stroke-[2.25]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-extrabold text-foreground leading-snug truncate">
                    Commande CMD-{selectedOrderForEdit?.id.slice(0, 4).toUpperCase()}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3 text-primary/70" />
                      {selectedOrderForEdit && new Date(selectedOrderForEdit.created_at).toLocaleString("fr-FR")}
                    </span>
                    {selectedOrderForEdit?.type && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide">
                        {selectedOrderForEdit.type === "dine_in"
                          ? `Sur place${selectedOrderForEdit.table_number ? ` · T${selectedOrderForEdit.table_number}` : ''}`
                          : "Livraison"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {selectedOrderForEdit && (() => {
                  const badge = getPaymentBadge(selectedOrderForEdit.payment_status);
                  return (
                    <span
                      className="inline-flex items-center justify-center px-3.5 py-1 rounded-full text-[11.5px] font-extrabold shadow-2xs"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {t(badge.label)}
                    </span>
                  );
                })()}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedOrderForEdit && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 py-1">
              {/* Left Column: Order Settings, Customer Info, Notes & Financial Total */}
              <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3.5">
                  {/* Status Pills */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                      {t("orderStatus")}
                    </Label>
                    {/* Only the current state plus the transitions this role
                        may actually perform. Offering the full six would just
                        manufacture 403s — and the two system transitions
                        (confirmed→preparing, preparing→ready) are the
                        database's to make, never a button's. */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      {[
                        selectedOrderForEdit.status,
                        ...allowedTransitions(role, selectedOrderForEdit.status),
                      ].map((st) => {
                        const isSelected = editStatus === st;
                        const conf = STATUS_MAP[st];
                        const Icon = conf.icon;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setEditStatus(st)}
                            className={cn(
                              "flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1.5 sm:px-2.5 rounded-2xl text-[11px] sm:text-xs font-extrabold border transition-all duration-150 shadow-2xs cursor-pointer truncate",
                              isSelected
                                ? "border-primary/50 bg-primary/10 text-primary ring-2 ring-primary/20"
                                : "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className="size-3.5 stroke-[2.25] shrink-0" />
                            <span className="truncate">{t(conf.label)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer & Table details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 bg-muted/30 border border-border/60 rounded-2xl p-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit-customer" className="text-[11px] font-extrabold text-muted-foreground flex items-center gap-1">
                        <User className="size-3.5 text-primary" /> {t("customerName")}
                      </Label>
                      <Input
                        id="edit-customer"
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        placeholder={t("colDineIn")}
                        className="rounded-xl text-xs font-bold bg-card border-border/80 shadow-2xs h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-table" className="text-[11px] font-extrabold text-muted-foreground flex items-center gap-1">
                        <Hash className="size-3.5 text-primary" /> {t("colTable")}
                      </Label>
                      <Input
                        id="edit-table"
                        value={editTableNumber}
                        onChange={(e) => setEditTableNumber(e.target.value)}
                        placeholder={t("tablePlaceholder")}
                        className="rounded-xl text-xs font-bold bg-card border-border/80 shadow-2xs h-9"
                      />
                    </div>
                  </div>

                  {/* Order-Level Special Instructions / Note */}
                  {selectedOrderForEdit.note && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        <FileText className="size-3.5" />
                        Instructions spéciales
                      </div>
                      <p className="text-xs font-medium text-foreground italic line-clamp-3">
                        « {selectedOrderForEdit.note} »
                      </p>
                    </div>
                  )}
                </div>

                {/* Promo code discount, if any */}
                {Number(selectedOrderForEdit.discount_amount) > 0 && (
                  <div className="flex items-center justify-between px-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>{t("promoApplied", { code: selectedOrderForEdit.promo_code ?? "" })}</span>
                    <span>-{formatPrice(Number(selectedOrderForEdit.discount_amount), "MAD")}</span>
                  </div>
                )}

                {/* Financial Total Box */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs flex items-center justify-between mt-auto">
                  <div>
                    <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">{t("orderTotal")}</span>
                    {canSettlePayment && selectedOrderForEdit.payment_status === "unpaid" && (
                      <button
                        onClick={() => markPaidMutation.mutate(selectedOrderForEdit.id)}
                        disabled={markPaidMutation.isPending}
                        className="text-xs font-bold text-primary hover:underline disabled:opacity-50 mt-0.5 block"
                      >
                        {t("markPaid")}
                      </button>
                    )}
                  </div>
                  <span className="font-extrabold text-xl sm:text-2xl text-primary tracking-tight">
                    {formatPrice(Number(selectedOrderForEdit.total), "MAD")}
                  </span>
                </div>
              </div>

              {/* Right Column: Articles Breakdown */}
              <div className="md:col-span-6 space-y-2 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                    Détail des articles
                  </Label>
                  <span className="rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-extrabold text-primary">
                    {selectedOrderForEdit.items?.length || 0} article{(selectedOrderForEdit.items?.length || 0) > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="bg-muted/30 border border-border/70 rounded-2xl p-2.5 space-y-2 flex-1 max-h-[260px] md:max-h-[340px] overflow-y-auto">
                  {selectedOrderForEdit.items?.map((item, idx) => {
                    const imageUrl = getItemImageUrl(item);
                    return (
                      <div key={idx} className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-card border border-border/50 shadow-2xs">
                        <div className="flex items-center justify-between text-sm gap-2 min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="relative size-9 rounded-full overflow-hidden bg-muted shrink-0 border-2 border-background shadow-xs">
                              <img
                                src={imageUrl}
                                alt={item.name}
                                className="size-full object-cover scale-[1.4]"
                              />
                            </div>
                            <span className="font-extrabold text-primary text-xs bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                              x{item.quantity}
                            </span>
                            <span className="font-bold text-[13px] truncate text-foreground flex-1 min-w-0">{item.name}</span>
                          </div>
                          <span className="font-extrabold text-foreground text-sm shrink-0">
                            {formatPrice(item.unit_price * item.quantity, "MAD")}
                          </span>
                        </div>
                        {item.options && item.options.length > 0 && (
                          <div className="text-xs font-medium text-muted-foreground pl-11 flex flex-wrap gap-1.5">
                            {item.options.map((opt, optIdx) => {
                              const isNote = opt.toLowerCase().includes("note:") || opt.toLowerCase().includes("instruction");
                              return (
                                <span
                                  key={optIdx}
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                                    isNote
                                      ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold"
                                      : "bg-muted/60 border-border text-foreground/90"
                                  )}
                                >
                                  {opt}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row justify-stretch sm:justify-end gap-2.5 pt-2 w-full">
            <Button
              variant="outline"
              onClick={() => setSelectedOrderForEdit(null)}
              className="w-full sm:w-auto rounded-xl font-bold text-xs px-4 h-11 sm:h-10 border-border/80 hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="w-full sm:w-auto rounded-xl font-extrabold text-xs px-5 h-11 sm:h-10 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
            >
              <Check className="size-4 stroke-[2.5]" />
              {isSavingEdit ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal (Single Order) */}
      <Dialog open={!!selectedOrderForDelete} onOpenChange={(open) => !open && setSelectedOrderForDelete(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 bg-card/98 backdrop-blur-2xl border-red-500/20 shadow-2xl space-y-4 overflow-hidden relative">
          <div className="absolute -top-12 -left-12 size-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          <DialogHeader className="pt-1">
            <DialogTitle className="flex items-center gap-3 font-display">
              <div className="size-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="size-6 stroke-[2.25]" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground leading-tight">{t("deleteOrder")}</h3>
                <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-xs font-bold">
                  CMD-{selectedOrderForDelete?.id.slice(0, 4).toUpperCase()}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="bg-muted/40 border border-border/70 rounded-2xl p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement cette commande ?{" "}
            <span className="font-bold text-foreground block mt-1">Cette action est irréversible et supprimera l&apos;historique.</span>
          </div>

          <DialogFooter className="gap-2 sm:gap-2.5 pt-1">
            <Button
              variant="outline"
              onClick={() => setSelectedOrderForDelete(null)}
              className="rounded-xl font-bold text-xs px-4 h-10 border-border/80 hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSingle}
              disabled={isDeleting}
              className="rounded-xl font-extrabold text-xs px-5 h-10 gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Trash2 className="size-4 stroke-[2.25]" />
              {isDeleting ? "Suppression..." : t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 sm:p-7 bg-card/98 backdrop-blur-2xl border-red-500/20 shadow-2xl space-y-4 overflow-hidden relative">
          <div className="absolute -top-12 -left-12 size-36 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          <DialogHeader className="pt-1">
            <DialogTitle className="flex items-center gap-3 font-display">
              <div className="size-12 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="size-6 stroke-[2.25]" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground leading-tight">{t("bulkDelete")}</h3>
                <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-xs">
                  {selectedOrderIds.length} commande{selectedOrderIds.length > 1 ? "s" : ""} sélectionnée{selectedOrderIds.length > 1 ? "s" : ""}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="bg-muted/40 border border-border/70 rounded-2xl p-4 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Êtes-vous sûr de vouloir supprimer définitivement ces{" "}
            <span className="font-bold text-foreground">{selectedOrderIds.length} commandes</span> ?{" "}
            <span className="font-bold text-foreground block mt-1">Cette action est irréversible.</span>
          </div>

          <DialogFooter className="gap-2 sm:gap-2.5 pt-1">
            <Button
              variant="outline"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="rounded-xl font-bold text-xs px-4 h-10 border-border/80 hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="rounded-xl font-extrabold text-xs px-5 h-10 gap-2 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Trash2 className="size-4 stroke-[2.25]" />
              {isDeleting ? "Suppression..." : t("deleteAll")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

