"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, LayoutGrid, ChevronDown, X, ShoppingBag, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePickerModal } from "@/components/dashboard/table-picker-modal";
import { ItemDialog } from "@/components/menu/item-dialog";
import { useCart, cartSubtotal } from "@/store/cart";
import type { Category, Item } from "@/lib/types";
import Image from "next/image";
import { getDishImage } from "@/lib/image";

// ── Types ─────────────────────────────────────────────────────────────────────

type DashboardMenu = {
  restaurant_id: string;
  categories: Category[];
  items: Item[];
};

type OrderType = "dine_in" | "takeaway" | "delivery";
const ORDER_TYPES: OrderType[] = ["dine_in", "takeaway", "delivery"];


// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetchDashboardMenu(): Promise<DashboardMenu> {
  const res = await fetch("/api/dashboard/menu");
  if (!res.ok) throw new Error("dashboard menu fetch failed");
  return res.json();
}

async function placeStaffOrder(body: {
  type: string;
  table_number?: string;
  customer_name?: string;
  note?: string;
  lines: { item_id: string; quantity: number; options: string[] }[];
}): Promise<{ id: string; total: number }> {
  const res = await fetch("/api/dashboard/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "pos order failed");
  }
  return res.json();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PosView({ onClose }: { onClose?: () => void }) {
  const t = useTranslations("Pos");
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { lines: cartLines, increment, decrement, clear: clearCart } = useCart();
  const [customerName, setCustomerName] = useState("");
  const [table, setTable] = useState("");
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const { data: menuData, isLoading } = useQuery<DashboardMenu>({
    queryKey: ["dashboard-menu"],
    queryFn: fetchDashboardMenu,
    staleTime: 30_000,
  });

  const submitOrder = useMutation({
    mutationFn: placeStaffOrder,
    onSuccess: ({ id, total }) => {
      toast.success(`Commande #${id.slice(0, 8)} placée — ${total} MAD`);
      clearCart();
      setCustomerName("");
      setTable("");
      setOrderType("dine_in");
      setMobileSummaryOpen(false);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose?.();
    },
    onError: (err: Error) => toast.error(err.message || t("orderFailed")),
  });

  const categories = menuData?.categories ?? [];
  const items = menuData?.items ?? [];

  useEffect(() => {
    if (categories.length > 0 && category !== "all" && !categories.find((c) => c.id === category)) {
      setCategory("all");
    }
  }, [categories, category]);

  const visibleItems = items.filter((item) => {
    const matchCat = category === "all" || item.category_id === category;
    const matchQ = !searchQuery || item.name_fr.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  });

  const subtotal = cartSubtotal(cartLines);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  const cartEmpty = cartLines.length === 0;

  function handlePlaceOrder() {
    if (cartEmpty || submitOrder.isPending) return;
    const apiType = orderType;
    if (apiType === "dine_in" && !table) {
      toast.error(t("pickTableHint"));
      return;
    }
    submitOrder.mutate({
      type: apiType,
      table_number: apiType === "dine_in" ? table : undefined,
      customer_name: customerName || undefined,
      lines: cartLines.map((l) => ({
        item_id: l.item_id,
        quantity: l.quantity,
        options: l.options,
      })),
    });
  }

  return (
    <>
      <div className="relative flex flex-col lg:flex-row h-full w-full bg-[#f7f2ea] dark:bg-[#0c0c0e] rounded-none sm:rounded-[22px] overflow-hidden shadow-2xl border-0 sm:border border-[#ece6dc] dark:border-white/10 text-[#1c1712] dark:text-white">

        {/* ── Menu Column ────────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* Top header with close button */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <h1 className="m-0 text-xl sm:text-2xl font-extrabold tracking-tight">{t("newOrder")}</h1>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="size-9 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-foreground hover:bg-black/20 dark:hover:bg-white/20 transition-colors shrink-0"
              >
                <X className="size-5" />
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a1c] border border-[#ece6dc] dark:border-white/10 rounded-xl px-3.5 py-2.5 mb-4 shadow-sm dark:shadow-none w-full">
            <Search className="size-4 text-[#928a7e] dark:text-white/50 shrink-0" />
            <input
              placeholder={t("searchDish")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-none outline-none text-sm w-full bg-transparent text-[#1c1712] dark:text-white placeholder:text-[#b6ada0] dark:placeholder:text-white/40"
            />
          </div>

          {/* Category Chips - Touch Horizontal Scrollbar */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1.5 scrollbar-none shrink-0">
            <button
              onClick={() => setCategory("all")}
              className={cn(
                "px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors border whitespace-nowrap shrink-0",
                category === "all"
                  ? "border-[#ec5b1a] bg-[#ec5b1a] text-white shadow-sm"
                  : "border-[#ece6dc] dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-[#5a544c] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5",
              )}
            >
              Tous
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-colors border whitespace-nowrap shrink-0",
                  category === cat.id
                    ? "border-[#ec5b1a] bg-[#ec5b1a] text-white shadow-sm"
                    : "border-[#ece6dc] dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-[#5a544c] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5",
                )}
              >
                {cat.name_fr}
              </button>
            ))}
          </div>

          {/* Responsive Menu Items Grid */}
          <div className="flex-1 overflow-y-auto pb-20 lg:pb-6 custom-scrollbar pr-4 sm:pr-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[96px] rounded-[20px]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pt-2">
                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      "relative flex items-center gap-3.5 bg-gradient-to-br from-[#221a14] to-[#120e0b] border border-[#2c2119] rounded-[20px] p-3.5 shadow-sm transition-all hover:-translate-y-0.5 cursor-pointer min-h-[96px]",
                      !item.in_stock && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {/* Item Thumbnail */}
                    <div className="relative size-14 sm:size-16 rounded-full bg-[#2a1f16] flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-white/10 ring-2 ring-white/10">
                      <Image src={getDishImage(item)} alt={item.name_fr} fill sizes="256px" className="object-cover rounded-full scale-[1.30] transition-transform duration-300 group-hover:scale-[1.40]" />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 pr-7">
                      <div className="text-xs sm:text-sm font-extrabold text-white leading-tight truncate">{item.name_fr}</div>
                      {item.description_fr && (
                        <div className="text-[10.5px] sm:text-[11.5px] text-[#a09a92] mt-0.5 leading-snug line-clamp-2">{item.description_fr}</div>
                      )}
                      <div className="text-xs sm:text-sm font-extrabold text-[#ff8a4d] mt-1.5">{item.base_price} MAD</div>
                    </div>

                    {!item.in_stock && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-[20px] bg-black/50">
                        <span className="text-xs font-bold text-white/80 bg-black/60 px-2 py-0.5 rounded-full">{t("soldOut")}</span>
                      </div>
                    )}

                    {/* + Add Button */}
                    <div className="absolute right-3.5 bottom-3.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); if (item.in_stock) setSelectedItem(item); }}
                        disabled={!item.in_stock}
                        aria-label={`Ajouter ${item.name_fr}`}
                        className="size-9 rounded-full bg-[#ec5b1a] text-white flex items-center justify-center shadow-md transition-all hover:bg-[#d94a09] hover:scale-105 active:scale-95 disabled:opacity-40"
                      >
                        <Plus className="size-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))}
                {!isLoading && visibleItems.length === 0 && (
                  <div className="col-span-full py-12 text-center text-[#b6ada0] dark:text-gray-500 font-medium">
                    {t("noDish")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile Floating Sticky Cart Bar (lg:hidden) ────────────────────── */}
        {!cartEmpty && (
          <div className="fixed sm:absolute bottom-0 left-0 right-0 p-3 bg-[#0c0c0e]/95 backdrop-blur-md border-t border-white/10 z-20 lg:hidden">
            <Button
              type="button"
              onClick={() => setMobileSummaryOpen(true)}
              className="w-full h-12 rounded-xl bg-[#ec5b1a] text-white font-bold flex items-center justify-between px-4 shadow-lg hover:bg-[#d94a09]"
            >
              <span className="flex items-center gap-2 text-sm">
                <ShoppingBag className="size-4" />
                <span>{cartLines.reduce((s, l) => s + l.quantity, 0)} article(s)</span>
              </span>
              <span className="text-sm font-extrabold">{total} MAD →</span>
            </Button>
          </div>
        )}

        {/* ── Order Summary Column (Desktop Sidebar + Mobile Drawer) ─────────── */}
        <div
          className={cn(
            "w-full lg:w-[360px] flex-shrink-0 bg-white dark:bg-[#1a1a1c] border-t lg:border-t-0 lg:border-l border-[#ece6dc] dark:border-white/10 p-5 sm:p-6 flex flex-col z-30 transition-transform duration-300",
            "lg:relative lg:translate-y-0",
            mobileSummaryOpen
              ? "fixed inset-0 sm:absolute sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[380px] translate-y-0 shadow-2xl overflow-y-auto"
              : "hidden lg:flex"
          )}
        >
          {/* Mobile Drawer Top Bar */}
          <div className="flex items-center justify-between mb-4 lg:mb-5 border-b border-[#ece6dc] dark:border-white/10 pb-3">
            <span className="text-base sm:text-lg font-extrabold">{t("summary")}</span>
            <button
              type="button"
              onClick={() => setMobileSummaryOpen(false)}
              className="lg:hidden size-8 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <label className="text-[12.5px] font-bold text-[#5a544c] dark:text-gray-400 mb-1 block">{t("customerName")}</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder={t("enterName")}
            className="w-full border border-[#ece6dc] dark:border-white/10 rounded-xl px-3 py-2 text-sm mb-3 outline-none focus:border-[#ec5b1a] focus:ring-1 focus:ring-[#ec5b1a] transition-all bg-white dark:bg-white/5 dark:text-white"
          />

          {/* Table picker — only for sur place */}
          <div className={cn("transition-opacity duration-200", orderType !== "dine_in" && "opacity-40 pointer-events-none select-none")}>
            <label className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#5a544c] dark:text-gray-400 mb-1">
              <LayoutGrid className="size-3.5 opacity-70" />
              Table
              {orderType !== "dine_in" && (
                <span className="ml-auto text-[11px] font-normal text-[#928a7e] dark:text-white/30 italic">{t("notApplicable")}</span>
              )}
            </label>
            <button
              type="button"
              disabled={orderType !== "dine_in"}
              onClick={() => setTablePickerOpen(true)}
              className={cn(
                "w-full flex items-center justify-between gap-2 mb-3 h-10 rounded-xl border px-3 text-sm transition-all",
                table
                  ? "border-[#ec5b1a] bg-[#ec5b1a]/[0.08] text-[#ec5b1a] dark:bg-[#ec5b1a]/[0.12]"
                  : "border-[#ece6dc] dark:border-white/10 bg-white dark:bg-white/5 text-[#928a7e] dark:text-white/40",
                orderType === "dine_in" && "hover:border-[#ec5b1a] focus-visible:outline-none",
              )}
            >
              <span className={cn("font-medium", table ? "text-[#ec5b1a]" : "")}>
                {table ? `Table ${table}` : t("pickTable")}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {table && orderType === "dine_in" && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setTable(""); }}
                    className="rounded-full p-0.5 hover:bg-[#ec5b1a]/20 transition-colors cursor-pointer"
                  >
                    <X className="size-3 text-[#ec5b1a]" />
                  </span>
                )}
                <ChevronDown className="size-4 opacity-50" />
              </span>
            </button>
            <TablePickerModal
              open={tablePickerOpen}
              onClose={() => setTablePickerOpen(false)}
              selected={table}
              onSelect={(val) => { setTable(val); if (val) setTablePickerOpen(false); }}
            />
          </div>

          {/* Order type buttons */}
          <label className="text-[12.5px] font-bold text-[#5a544c] dark:text-gray-400 mb-1 block">{t("orderType")}</label>
          <div className="flex gap-1.5 mb-4">
            {ORDER_TYPES.map((ot) => (
              <button
                key={ot}
                onClick={() => { setOrderType(ot); if (ot !== "dine_in") setTable(""); }}
                className={cn(
                  "flex-1 text-center py-2 px-1 rounded-xl text-xs font-bold transition-all border",
                  ot === orderType
                    ? "border-[#ec5b1a] bg-[#ec5b1a]/10 text-[#ec5b1a]"
                    : "border-[#ece6dc] dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-[#5a544c] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5",
                )}
              >
                {ot === "dine_in" ? t("dineIn") : ot === "takeaway" ? t("takeaway") : t("delivery")}
              </button>
            ))}
          </div>

          {/* Cart lines */}
          <div className="flex items-center justify-between mb-2 border-b border-[#ece6dc] dark:border-white/10 pb-2">
            <span className="text-sm font-extrabold">Articles</span>
            {!cartEmpty && (
              <button onClick={clearCart} className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors">
                Vider
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[100px] mb-3 pr-1">
            {cartEmpty ? (
              <div className="text-center text-[#b6ada0] dark:text-gray-500 text-xs py-8 flex flex-col items-center gap-2">
                <span className="text-3xl opacity-50">🛒</span>
                <span>{t("cartEmpty")}<br />{t("addItems")}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {cartLines.map((line) => (
                  <div key={line.key} className="flex gap-2.5 py-2 border-b border-[#f2eee6] dark:border-white/10 last:border-0">
                    <div className="size-10 rounded-full shrink-0 flex items-center justify-center text-lg bg-[#2a1f16] text-white shadow-xs relative overflow-hidden ring-1 ring-white/10">
                      <Image src={getDishImage({ id: line.item_id, image_url: line.image_url })} alt={line.name} fill sizes="160px" className="object-cover rounded-full scale-125" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs sm:text-sm font-bold truncate leading-tight">{line.name}</span>
                        <span className="text-xs text-[#928a7e] dark:text-white/50 font-bold shrink-0">×{line.quantity}</span>
                      </div>
                      {line.options.length > 0 && (
                        <div className="text-[10px] text-[#928a7e] dark:text-white/40 leading-snug">
                          {line.options.join(", ")}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => decrement(line.key)}
                            className="size-5 rounded border border-[#ece6dc] dark:border-white/10 bg-[#fbf8f2] dark:bg-white/5 flex items-center justify-center text-xs font-bold hover:bg-[#f2eee6] dark:hover:bg-white/10 transition-colors"
                          >–</button>
                          <button
                            onClick={() => increment(line.key)}
                            className="size-5 rounded border border-[#ece6dc] dark:border-white/10 bg-[#fbf8f2] dark:bg-white/5 flex items-center justify-center text-xs font-bold hover:bg-[#f2eee6] dark:hover:bg-white/10 transition-colors"
                          >+</button>
                        </div>
                        <span className="text-xs sm:text-[13px] font-extrabold text-[#ec5b1a]">{line.unit_price * line.quantity} MAD</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals + submit */}
          <div className="border-t border-[#ece6dc] dark:border-white/10 pt-4 mt-auto">
            <div className="flex justify-between text-xs text-[#5a544c] dark:text-gray-400 mb-1 font-medium">
              <span>Sous-total</span><span>{subtotal} MAD</span>
            </div>
            <div className="flex justify-between text-xs text-[#5a544c] dark:text-gray-400 mb-3 font-medium">
              <span>{t("vat")}</span><span>{tax} MAD</span>
            </div>
            <div className="flex justify-between text-base sm:text-lg font-extrabold mb-4 text-[#1c1712] dark:text-white">
              <span>Total</span><span>{total} MAD</span>
            </div>
            <Button
              onClick={handlePlaceOrder}
              disabled={cartEmpty || submitOrder.isPending}
              className={cn(
                "w-full h-12 rounded-xl text-sm font-bold transition-all shadow-sm dark:shadow-none",
                cartEmpty || submitOrder.isPending
                  ? "bg-[#f2eee6] dark:bg-white/5 text-[#b6ada0] dark:text-white/30 opacity-100 hover:bg-[#f2eee6]"
                  : "bg-[#ec5b1a] text-white hover:bg-[#d94a09] hover:shadow-md",
              )}
            >
              {submitOrder.isPending
                ? t("sending")
                : cartEmpty
                ? t("emptyCart")
                : `Placer la commande · ${total} MAD`}
            </Button>
          </div>
        </div>
      </div>

      {/* Item options modal */}
      <ItemDialog
        item={selectedItem}
        currency="MAD"
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}

