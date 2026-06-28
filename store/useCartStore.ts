import { create } from 'zustand';
import type { Restaurant, Item, Modifier, MenuPayload } from '../types/airtable';

// ─── Cart-domain types ────────────────────────────────────────────────────────

/**
 * A snapshot of one modifier option the customer selected.
 * We snapshot (not reference) so that a price change in Airtable mid-session
 * does not silently mutate an in-progress cart.
 */
export interface SelectedModifier {
  modifier_id: string;
  group_name_fr: string;
  option_name_fr: string;
  price_impact: number;
}

/**
 * One distinct line in the cart.
 *
 * Identity rule: two lines for the same item_id are DISTINCT if their
 * sorted modifier selections differ. This allows:
 *   - Tacos + "Extra Cheese"  →  line A
 *   - Tacos + "Extra Fries"   →  line B  (separate line, not merged)
 *
 * `cartLineId` encodes this identity and is the stable React key.
 */
export interface CartLine {
  cartLineId: string;
  item: Item;
  selectedModifiers: SelectedModifier[];
  quantity: number;
  /** Unit price including all modifier impacts. Multiply by quantity for line total. */
  unitPrice: number;
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface CartState {
  // Menu fetch state (managed by useFetchMenu hook)
  menuPayload: MenuPayload | null;
  isMenuLoading: boolean;
  menuError: string | null;

  // Session context (set by the data-fetching hook on mount)
  restaurant: Restaurant | null;
  tableId: string | null;

  // Cart
  lines: CartLine[];

  // Derived totals — recomputed on every mutation, stored for O(1) reads
  subtotal: number;
  deliveryFee: number;
  total: number;
  totalItemCount: number;

  // ── Actions: menu fetch ───────────────────────────────────────────────────
  setMenuPayload: (payload: MenuPayload) => void;
  setMenuLoading: (loading: boolean) => void;
  setMenuError: (error: string | null) => void;

  // ── Actions: session ──────────────────────────────────────────────────────
  setRestaurant: (restaurant: Restaurant) => void;
  setTableId: (tableId: string | null) => void;

  // ── Actions: cart ─────────────────────────────────────────────────────────
  addLine: (item: Item, selectedModifiers: SelectedModifier[]) => void;
  removeLine: (cartLineId: string) => void;
  incrementLine: (cartLineId: string) => void;
  decrementLine: (cartLineId: string) => void;
  clearCart: () => void;

  // ── WhatsApp checkout engine ───────────────────────────────────────────────
  generateWhatsAppLink: () => string | null;
}

// ─── Pure helpers (no Zustand dependency) ────────────────────────────────────

function calcUnitPrice(item: Item, modifiers: SelectedModifier[]): number {
  return modifiers.reduce((sum, m) => sum + m.price_impact, item.base_price);
}

/**
 * Stable identity key: item_id + alphabetically sorted modifier ids.
 * Same item + same modifiers → same key → quantity is incremented.
 * Same item + different modifiers → different key → new cart line.
 */
function buildCartLineId(itemId: string, modifiers: SelectedModifier[]): string {
  const modKey = [...modifiers]
    .sort((a, b) => a.modifier_id.localeCompare(b.modifier_id))
    .map((m) => m.modifier_id)
    .join('+');
  return modKey ? `${itemId}__${modKey}` : itemId;
}

function calcTotals(
  lines: CartLine[],
  deliveryFee: number
): { subtotal: number; deliveryFee: number; total: number; totalItemCount: number } {
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const totalItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const appliedDelivery = lines.length > 0 ? deliveryFee : 0;
  return { subtotal, deliveryFee: appliedDelivery, total: subtotal + appliedDelivery, totalItemCount };
}

/**
 * Formats the cart into a human-readable WhatsApp message and returns the
 * full wa.me deep-link URL. Returns null if the cart is empty or the
 * restaurant context has not been loaded yet.
 *
 * Output message example (rendered in WhatsApp):
 *
 *   🧾 *Commande — Tacos Al Amin*
 *   📍 Table N°5
 *   ──────────────────
 *   1x *Tacos Mixte* — 45 DH
 *      › Algérienne
 *      › Extra Cheese
 *
 *   2x *Burger Classic* — 60 DH
 *   ──────────────────
 *   Sous-total : 105 DH
 *   Livraison  : 15 DH
 *   *TOTAL     : 120 DH*
 */
function buildWhatsAppLink(
  restaurant: Restaurant,
  lines: CartLine[],
  tableId: string | null,
  subtotal: number,
  deliveryFee: number,
  total: number
): string | null {
  if (lines.length === 0) return null;

  const sep = '──────────────────';
  const cur = restaurant.currency; // e.g. "MAD" → displayed as "DH" below
  const displayCurrency = cur === 'MAD' ? 'DH' : cur;

  const header = `🧾 *Commande — ${restaurant.restaurant_name}*`;
  const tableLabel = tableId ? `📍 Table N°${tableId}` : '';

  const itemLines = lines
    .map((line) => {
      const name = `*${line.item.name_fr}*`;
      const price = `${(line.unitPrice * line.quantity).toFixed(2)} ${displayCurrency}`;
      const base = `${line.quantity}x ${name} — ${price}`;
      const mods = line.selectedModifiers
        .map((m) => `   › ${m.option_name_fr}`)
        .join('\n');
      return mods ? `${base}\n${mods}` : base;
    })
    .join('\n\n');

  const footer = [
    `Sous-total : ${subtotal.toFixed(2)} ${displayCurrency}`,
    `Livraison  : ${deliveryFee.toFixed(2)} ${displayCurrency}`,
    `*TOTAL     : ${total.toFixed(2)} ${displayCurrency}*`,
  ].join('\n');

  const parts = [header, tableLabel, sep, itemLines, sep, footer].filter(Boolean);
  const message = parts.join('\n');

  // Airtable stores the number as "+2126XXXXXXXX"; wa.me requires digits only
  const rawNumber = restaurant.whatsapp_number.replace(/\D/g, '');
  return `https://wa.me/${rawNumber}?text=${encodeURIComponent(message)}`;
}

// ─── Zustand store ────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  menuPayload: null,
  isMenuLoading: false,
  menuError: null,
  restaurant: null,
  tableId: null,
  lines: [],
  subtotal: 0,
  deliveryFee: 0,
  total: 0,
  totalItemCount: 0,

  // ── Menu fetch actions ─────────────────────────────────────────────────────

  setMenuPayload: (payload: MenuPayload) =>
    set((state) => ({
      menuPayload: payload,
      restaurant: payload.restaurant,
      menuError: null,
      // Recompute delivery in case a cart survived a hot-reload during dev
      ...calcTotals(state.lines, payload.restaurant.delivery_fee),
    })),

  setMenuLoading: (isMenuLoading: boolean) => set({ isMenuLoading }),

  setMenuError: (menuError: string | null) => set({ menuError }),

  // ── Session actions ────────────────────────────────────────────────────────

  setRestaurant: (restaurant) =>
    set((state) => ({
      restaurant,
      // Recalc delivery if a cart already exists when restaurant loads
      ...calcTotals(state.lines, restaurant.delivery_fee),
    })),

  setTableId: (tableId) => set({ tableId }),

  // ── Cart actions ───────────────────────────────────────────────────────────

  addLine: (item, selectedModifiers) => {
    const { lines, restaurant } = get();
    const deliveryFee = restaurant?.delivery_fee ?? 0;
    const cartLineId = buildCartLineId(item.item_id, selectedModifiers);
    const existing = lines.find((l) => l.cartLineId === cartLineId);

    const nextLines = existing
      ? lines.map((l) =>
          l.cartLineId === cartLineId ? { ...l, quantity: l.quantity + 1 } : l
        )
      : [
          ...lines,
          {
            cartLineId,
            item,
            selectedModifiers,
            quantity: 1,
            unitPrice: calcUnitPrice(item, selectedModifiers),
          },
        ];

    set({ lines: nextLines, ...calcTotals(nextLines, deliveryFee) });
  },

  removeLine: (cartLineId) => {
    const { lines, restaurant } = get();
    const nextLines = lines.filter((l) => l.cartLineId !== cartLineId);
    set({ lines: nextLines, ...calcTotals(nextLines, restaurant?.delivery_fee ?? 0) });
  },

  incrementLine: (cartLineId) => {
    const { lines, restaurant } = get();
    const nextLines = lines.map((l) =>
      l.cartLineId === cartLineId ? { ...l, quantity: l.quantity + 1 } : l
    );
    set({ lines: nextLines, ...calcTotals(nextLines, restaurant?.delivery_fee ?? 0) });
  },

  decrementLine: (cartLineId) => {
    const { lines, restaurant } = get();
    const nextLines = lines
      .map((l) =>
        l.cartLineId === cartLineId ? { ...l, quantity: l.quantity - 1 } : l
      )
      .filter((l) => l.quantity > 0); // auto-remove when quantity hits 0
    set({ lines: nextLines, ...calcTotals(nextLines, restaurant?.delivery_fee ?? 0) });
  },

  clearCart: () => {
    const { restaurant } = get();
    set({ lines: [], ...calcTotals([], restaurant?.delivery_fee ?? 0) });
  },

  // ── WhatsApp checkout engine ───────────────────────────────────────────────

  generateWhatsAppLink: () => {
    const { restaurant, lines, tableId, subtotal, deliveryFee, total } = get();
    if (!restaurant) return null;
    return buildWhatsAppLink(restaurant, lines, tableId, subtotal, deliveryFee, total);
  },
}));
