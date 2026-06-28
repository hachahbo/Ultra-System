import { create } from 'zustand';
import type { Restaurant, Item, Modifier, MenuPayload } from '../types/airtable';

// ─── Cart-specific types ──────────────────────────────────────────────────────

/**
 * A modifier choice the customer has selected for one cart line.
 * We snapshot only the data we need so the cart is self-contained.
 */
export interface SelectedModifier {
  modifier_id: string;
  group_name_fr: string;
  option_name_fr: string;
  price_impact: number;
}

/**
 * One line in the cart: an item + the customer's modifier choices + quantity.
 * `cartLineId` is a stable, unique key generated when the line is first added.
 * Two lines for the same item_id can coexist if the modifier selection differs.
 */
export interface CartLine {
  cartLineId: string;
  item: Item;
  selectedModifiers: SelectedModifier[];
  quantity: number;
  lineTotalPrice: number;
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface CartState {
  // ── Restaurant & session context ──────────────────────────────────────────
  restaurant: Restaurant | null;
  menuPayload: MenuPayload | null;
  tableId: string | null;
  isMenuLoading: boolean;
  menuError: string | null;

  // ── Cart lines ────────────────────────────────────────────────────────────
  lines: CartLine[];

  // ── Derived totals (kept in state for O(1) reads in the cart footer) ──────
  subtotal: number;
  deliveryFee: number;
  total: number;
  totalItemCount: number;

  // ── Actions: session ──────────────────────────────────────────────────────
  setTableId: (tableId: string | null) => void;
  setMenuPayload: (payload: MenuPayload) => void;
  setMenuLoading: (loading: boolean) => void;
  setMenuError: (error: string | null) => void;

  // ── Actions: cart ─────────────────────────────────────────────────────────
  addLine: (item: Item, selectedModifiers: SelectedModifier[]) => void;
  removeLine: (cartLineId: string) => void;
  incrementLine: (cartLineId: string) => void;
  decrementLine: (cartLineId: string) => void;
  clearCart: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcLineTotal(item: Item, modifiers: SelectedModifier[]): number {
  const modifierSum = modifiers.reduce((sum, m) => sum + m.price_impact, 0);
  return item.base_price + modifierSum;
}

/**
 * Stable key for a cart line: item_id + sorted modifier ids.
 * Two add() calls with identical selections merge into one line.
 */
function buildCartLineId(itemId: string, modifiers: SelectedModifier[]): string {
  const modKey = modifiers
    .map((m) => m.modifier_id)
    .sort()
    .join('+');
  return modKey ? `${itemId}__${modKey}` : itemId;
}

function recalcTotals(
  lines: CartLine[],
  deliveryFee: number
): Pick<CartState, 'subtotal' | 'deliveryFee' | 'total' | 'totalItemCount'> {
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotalPrice * l.quantity, 0);
  const totalItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  return {
    subtotal,
    deliveryFee: totalItemCount > 0 ? deliveryFee : 0,
    total: subtotal + (totalItemCount > 0 ? deliveryFee : 0),
    totalItemCount,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useCartStore = create<CartState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  restaurant: null,
  menuPayload: null,
  tableId: null,
  isMenuLoading: false,
  menuError: null,

  lines: [],
  subtotal: 0,
  deliveryFee: 0,
  total: 0,
  totalItemCount: 0,

  // ── Session actions ────────────────────────────────────────────────────────

  setTableId: (tableId) => set({ tableId }),

  setMenuPayload: (payload) =>
    set({
      menuPayload: payload,
      restaurant: payload.restaurant,
      menuError: null,
    }),

  setMenuLoading: (isMenuLoading) => set({ isMenuLoading }),

  setMenuError: (menuError) => set({ menuError, isMenuLoading: false }),

  // ── Cart actions ───────────────────────────────────────────────────────────

  addLine: (item, selectedModifiers) => {
    const { lines, restaurant } = get();
    const deliveryFee = restaurant?.delivery_fee ?? 0;
    const cartLineId = buildCartLineId(item.item_id, selectedModifiers);
    const existing = lines.find((l) => l.cartLineId === cartLineId);

    let nextLines: CartLine[];

    if (existing) {
      nextLines = lines.map((l) =>
        l.cartLineId === cartLineId ? { ...l, quantity: l.quantity + 1 } : l
      );
    } else {
      const newLine: CartLine = {
        cartLineId,
        item,
        selectedModifiers,
        quantity: 1,
        lineTotalPrice: calcLineTotal(item, selectedModifiers),
      };
      nextLines = [...lines, newLine];
    }

    set({ lines: nextLines, ...recalcTotals(nextLines, deliveryFee) });
  },

  removeLine: (cartLineId) => {
    const { lines, restaurant } = get();
    const deliveryFee = restaurant?.delivery_fee ?? 0;
    const nextLines = lines.filter((l) => l.cartLineId !== cartLineId);
    set({ lines: nextLines, ...recalcTotals(nextLines, deliveryFee) });
  },

  incrementLine: (cartLineId) => {
    const { lines, restaurant } = get();
    const deliveryFee = restaurant?.delivery_fee ?? 0;
    const nextLines = lines.map((l) =>
      l.cartLineId === cartLineId ? { ...l, quantity: l.quantity + 1 } : l
    );
    set({ lines: nextLines, ...recalcTotals(nextLines, deliveryFee) });
  },

  decrementLine: (cartLineId) => {
    const { lines, restaurant } = get();
    const deliveryFee = restaurant?.delivery_fee ?? 0;
    const nextLines = lines
      .map((l) =>
        l.cartLineId === cartLineId ? { ...l, quantity: l.quantity - 1 } : l
      )
      .filter((l) => l.quantity > 0);
    set({ lines: nextLines, ...recalcTotals(nextLines, deliveryFee) });
  },

  clearCart: () => {
    const { restaurant } = get();
    const deliveryFee = restaurant?.delivery_fee ?? 0;
    set({ lines: [], ...recalcTotals([], deliveryFee) });
  },
}));
