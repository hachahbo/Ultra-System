"use client";

import { useState } from "react";
import { Search, LayoutGrid, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TablePickerModal } from "@/components/dashboard/table-picker-modal";
import { ItemDialog } from "@/components/menu/item-dialog";
import { useCart, cartSubtotal } from "@/store/cart";
import { Item, CustomizationGroup } from "@/lib/types";
import Image from "next/image";

// Mock options for the menu
const defaultOptions: CustomizationGroup[] = [
  {
    title: { fr: 'Choix de sauce', ar: null, es: null },
    required: true,
    max_selections: 2,
    options: [
      { name: 'Algérienne', price_modifier: 0 },
      { name: 'Biggy', price_modifier: 0 },
      { name: 'Fromagère', price_modifier: 2 },
    ]
  },
  {
    title: { fr: 'Ingrédients', ar: null, es: null },
    required: false,
    max_selections: 5,
    options: [
      { name: 'Oignons', price_modifier: 0 },
      { name: 'Tomates', price_modifier: 0 },
      { name: 'Salade', price_modifier: 0 },
    ]
  }
];

const MENU: (Item & { emoji: string; imgBg: string; category: string })[] = [
  {
    id: 'tp', name_fr: 'Tacos Poulet', category: 'Tacos', base_price: 35, emoji: '🌮', imgBg: '#e7a15c', description_fr: 'Poulet mariné, frites, fromage', image_url: '/images/dish-4.png', customization_groups: defaultOptions, restaurant_id: 'r1', category_id: 'c1', name_ar: null, name_es: null, in_stock: true, sort_order: 1, is_smart_menu_eligible: false
  },
  {
    id: 'tm', name_fr: 'Tacos Mixte', category: 'Tacos', base_price: 45, emoji: '🌮', imgBg: '#d98a4a', description_fr: 'Bœuf, poulet, frites, fromage', image_url: '/images/dish-4.png', customization_groups: defaultOptions, restaurant_id: 'r1', category_id: 'c1', name_ar: null, name_es: null, in_stock: true, sort_order: 2, is_smart_menu_eligible: false
  },
  {
    id: 'bc', name_fr: 'Burger Classic', category: 'Burgers', base_price: 40, emoji: '🍔', imgBg: '#c96a4a', description_fr: 'Steak, cheddar, salade, sauce maison', image_url: '/images/dish-4.png', customization_groups: defaultOptions, restaurant_id: 'r1', category_id: 'c2', name_ar: null, name_es: null, in_stock: true, sort_order: 3, is_smart_menu_eligible: false
  },
  {
    id: 'bd', name_fr: 'Burger Double', category: 'Burgers', base_price: 55, emoji: '🍔', imgBg: '#b5651d', description_fr: 'Double steak, double cheddar, bacon', image_url: '/images/dish-4.png', customization_groups: defaultOptions, restaurant_id: 'r1', category_id: 'c2', name_ar: null, name_es: null, in_stock: true, sort_order: 4, is_smart_menu_eligible: false
  },
  {
    id: 'cc', name_fr: 'Coca-Cola 33cl', category: 'Boissons', base_price: 8, emoji: '🥤', imgBg: '#6f8fd0', description_fr: 'Boisson gazeuse fraîche', image_url: null, customization_groups: [], restaurant_id: 'r1', category_id: 'c3', name_ar: null, name_es: null, in_stock: true, sort_order: 5, is_smart_menu_eligible: false
  },
  {
    id: 'em', name_fr: 'Eau minérale 50cl', category: 'Boissons', base_price: 5, emoji: '💧', imgBg: '#7fb0c9', description_fr: 'Eau plate ou gazeuse', image_url: null, customization_groups: [], restaurant_id: 'r1', category_id: 'c3', name_ar: null, name_es: null, in_stock: true, sort_order: 6, is_smart_menu_eligible: false
  },
];

const ORDER_TYPES = ['Sur place', 'À emporter', 'Livraison'];
const CATEGORIES = ['Tous', 'Tacos', 'Burgers', 'Boissons'];

export function PosView() {
  const [category, setCategory] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');

  // Migrate from local state to global cart
  const { lines: cartLines, increment, decrement, clear: clearCart } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [table, setTable] = useState('');
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  const [orderType, setOrderType] = useState('Sur place');

  // Track selected item to show the ItemDialog modal
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const placeOrder = () => {
    if (cartLines.length === 0) return;
    toast.success("Commande placée avec succès !");
    clearCart();
    setCustomerName('');
    setTable('');
  };

  const visibleItems = MENU.filter(m =>
    (category === 'Tous' || m.category === category) &&
    (searchQuery === '' || m.name_fr.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const subtotal = cartSubtotal(cartLines);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;
  const cartEmpty = cartLines.length === 0;

  return (
    <>
      <div className="flex flex-col lg:flex-row h-full w-full bg-[#f7f2ea] dark:bg-[#0c0c0e] rounded-[22px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.08)] dark:shadow-none border border-[#ece6dc] dark:border-white/10 text-[#1c1712] dark:text-white min-h-[800px]">

        {/* Menu Column */}
        <div className="flex-1 min-w-0 flex flex-col p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h1 className="m-0 text-2xl font-extrabold tracking-tight">Nouvelle commande</h1>
            <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a1c] border border-[#ece6dc] dark:border-white/10 rounded-xl px-3.5 py-2.5 w-full sm:w-[280px] shadow-sm dark:shadow-none">
              <Search className="size-4 text-[#928a7e] dark:text-white/50" />
              <input
                placeholder="Rechercher un plat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none outline-none text-sm w-full bg-transparent text-[#1c1712] dark:text-white placeholder:text-[#b6ada0] dark:placeholder:text-white/40"
              />
            </div>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold transition-colors border",
                  c === category
                    ? "border-[#ec5b1a] bg-[#ec5b1a] text-white shadow-sm dark:shadow-none"
                    : "border-[#ece6dc] dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-[#5a544c] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto pb-6 pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-y-5 gap-x-4 pt-4">
              {visibleItems.map(item => {
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item as Item)}
                    className="relative bg-gradient-to-br from-[#221a14] to-[#120e0b] border border-[#2c2119] rounded-[20px] p-[18px_96px_18px_18px] min-h-[118px] shadow-sm transition-transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div
                      className="absolute -top-4 right-3.5 w-[86px] h-[86px] rounded-full flex items-center justify-center text-[32px] text-white overflow-hidden"
                      style={{
                        background: item.imgBg,
                        boxShadow: '0 10px 22px rgba(0,0,0,.4), 0 0 0 4px rgba(255,255,255,.05)'
                      }}
                    >
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name_fr} fill sizes="86px" className="object-cover" />
                      ) : (
                        item.emoji
                      )}
                    </div>
                    <div className="text-[15px] font-extrabold text-white">{item.name_fr}</div>
                    <div className="text-[11.5px] text-[#a09a92] mt-1.5 leading-[1.4] line-clamp-2">{item.description_fr}</div>
                    <div className="text-[15px] font-extrabold text-[#ff8a4d] mt-3.5">{item.base_price} MAD</div>

                    <div className="absolute right-4 bottom-4">
                      <button
                        className="w-[34px] h-[34px] rounded-full border-[1.5px] border-[#ec5b1a] bg-transparent text-[#ec5b1a] text-[17px] font-bold flex items-center justify-center hover:bg-[#ec5b1a]/10 transition-colors leading-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              {visibleItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#b6ada0] dark:text-gray-500 font-medium">
                  Aucun plat trouvé pour votre recherche.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="w-full lg:w-[360px] flex-shrink-0 bg-white dark:bg-[#1a1a1c] border-t lg:border-t-0 lg:border-l border-[#ece6dc] dark:border-white/10 p-6 flex flex-col z-10">
          <div className="text-lg font-extrabold mb-5">Résumé de la commande</div>

          <label className="text-[13px] font-bold text-[#5a544c] dark:text-gray-400 mb-1.5 block">Nom du client</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Entrer un nom"
            className="w-full border border-[#ece6dc] dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm mb-4 outline-none focus:border-[#ec5b1a] focus:ring-1 focus:ring-[#ec5b1a] transition-all bg-white dark:bg-white/5 dark:text-white"
          />

          {/* ── Table section: only active for "Sur place" ── */}
          <div
            className={cn(
              "transition-opacity duration-200",
              orderType !== 'Sur place' && "opacity-40 pointer-events-none select-none"
            )}
          >
            {/* Table label */}
            <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#5a544c] dark:text-gray-400 mb-1.5">
              <LayoutGrid className="size-3.5 opacity-70" />
              Table
              {orderType !== 'Sur place' && (
                <span className="ml-auto text-[11px] font-normal text-[#928a7e] dark:text-white/30 italic">
                  Non applicable
                </span>
              )}
            </label>

            {/* Table trigger button */}
            <button
              type="button"
              disabled={orderType !== 'Sur place'}
              onClick={() => setTablePickerOpen(true)}
              className={cn(
                "w-full flex items-center justify-between gap-2 mb-4",
                "h-10 rounded-xl border px-3.5 text-sm transition-all",
                table
                  ? "border-[#ec5b1a] bg-[#ec5b1a]/[0.08] text-[#ec5b1a] dark:bg-[#ec5b1a]/[0.12]"
                  : "border-[#ece6dc] dark:border-white/10 bg-white dark:bg-white/5 text-[#928a7e] dark:text-white/40",
                orderType === 'Sur place' &&
                "hover:border-[#ec5b1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ec5b1a]/50"
              )}
            >
              <span className={cn("font-medium", table ? "text-[#ec5b1a]" : "")}>
                {table ? `Table ${table}` : "Sélectionner une table"}
              </span>
              <span className="flex items-center gap-1 shrink-0">
                {table && orderType === 'Sur place' && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Effacer la table"
                    onClick={(e) => { e.stopPropagation(); setTable(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), setTable(''))}
                    className="rounded-full p-0.5 hover:bg-[#ec5b1a]/20 transition-colors"
                  >
                    <X className="size-3 text-[#ec5b1a]" />
                  </span>
                )}
                <ChevronDown className="size-4 opacity-50" />
              </span>
            </button>

            {/* Table picker modal */}
            <TablePickerModal
              open={tablePickerOpen}
              onClose={() => setTablePickerOpen(false)}
              selected={table}
              onSelect={(val) => {
                setTable(val);
                if (val) setTablePickerOpen(false);
              }}
            />
          </div>

          <label className="text-[13px] font-bold text-[#5a544c] dark:text-gray-400 mb-1.5 block">Type de commande</label>
          <div className="flex gap-1.5 mb-6">
            {ORDER_TYPES.map(ot => (
              <button
                key={ot}
                onClick={() => {
                  setOrderType(ot);
                  if (ot !== 'Sur place') setTable('');
                }}
                className={cn(
                  "flex-1 text-center py-2 px-1.5 rounded-xl text-xs font-bold transition-all border",
                  ot === orderType
                    ? "border-[#ec5b1a] bg-[#ec5b1a]/10 text-[#ec5b1a]"
                    : "border-[#ece6dc] dark:border-white/10 bg-white dark:bg-[#1a1a1c] text-[#5a544c] dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                {ot}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3 border-b border-[#ece6dc] dark:border-white/10 pb-3">
            <span className="text-sm font-extrabold">Articles</span>
            {!cartEmpty && (
              <button onClick={clearCart} className="text-[13px] font-bold text-red-500 hover:text-red-600 transition-colors">
                Vider
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-[120px] mb-4 pr-1">
            {cartEmpty ? (
              <div className="text-center text-[#b6ada0] dark:text-gray-500 text-sm py-10 flex flex-col items-center gap-3">
                <span className="text-4xl opacity-50">🛒</span>
                <span>Le panier est vide.<br />Ajoutez des articles du menu.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {cartLines.map(line => {
                  const itemMock = MENU.find(x => x.id === line.item_id);
                  return (
                    <div key={line.key} className="flex gap-3 py-2.5 border-b border-[#f2eee6] dark:border-white/10 last:border-0">
                      <div
                        className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl text-white shadow-sm dark:shadow-none relative overflow-hidden"
                        style={{ background: itemMock?.imgBg || '#333' }}
                      >
                        {line.image_url ? (
                          <Image src={line.image_url} alt={line.name} fill sizes="48px" className="object-cover" />
                        ) : (
                          itemMock?.emoji
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-sm font-bold truncate leading-tight">{line.name}</span>
                          <span className="text-xs text-[#928a7e] dark:text-white/50 font-bold shrink-0 mt-0.5">×{line.quantity}</span>
                        </div>
                        {line.options.length > 0 && (
                          <div className="text-[11px] text-[#928a7e] dark:text-white/40 mt-1 leading-snug">
                            {line.options.join(", ")}
                          </div>
                        )}
                        <div className="flex justify-between items-center mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => decrement(line.key)}
                              className="w-6 h-6 rounded-md border border-[#ece6dc] dark:border-white/10 bg-[#fbf8f2] dark:bg-white/5 flex items-center justify-center text-xs font-bold hover:bg-[#f2eee6] dark:hover:bg-white/10 transition-colors"
                            >
                              –
                            </button>
                            <button
                              onClick={() => increment(line.key)}
                              className="w-6 h-6 rounded-md border border-[#ece6dc] dark:border-white/10 bg-[#fbf8f2] dark:bg-white/5 flex items-center justify-center text-xs font-bold hover:bg-[#f2eee6] dark:hover:bg-white/10 transition-colors"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[13.5px] font-extrabold text-[#ec5b1a]">{line.unit_price * line.quantity} MAD</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[#ece6dc] dark:border-white/10 pt-5 mt-auto">
            <div className="flex justify-between text-sm text-[#5a544c] dark:text-gray-400 mb-2 font-medium">
              <span>Sous-total</span>
              <span>{subtotal} MAD</span>
            </div>
            <div className="flex justify-between text-sm text-[#5a544c] dark:text-gray-400 mb-4 font-medium">
              <span>TVA (10%)</span>
              <span>{tax} MAD</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold mb-5 text-[#1c1712] dark:text-white">
              <span>Total</span>
              <span>{total} MAD</span>
            </div>

            <Button
              onClick={placeOrder}
              disabled={cartEmpty}
              className={cn(
                "w-full h-[52px] rounded-xl text-[15px] font-bold transition-all shadow-sm dark:shadow-none",
                cartEmpty
                  ? "bg-[#f2eee6] dark:bg-white/5 text-[#b6ada0] dark:text-white/30 opacity-100 hover:bg-[#f2eee6] dark:hover:bg-white/5"
                  : "bg-[#ec5b1a] text-white hover:bg-[#d94a09] hover:shadow-md hover:-translate-y-0.5"
              )}
            >
              {cartEmpty ? 'Panier vide' : `Placer la commande · ${total} MAD`}
            </Button>
          </div>
        </div>

      </div>

      {/* Item Options Modal */}
      <ItemDialog
        item={selectedItem}
        currency="MAD"
        onClose={() => setSelectedItem(null)}
      />
    </>
  );
}
