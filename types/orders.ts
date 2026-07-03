// ─── Order & Reservation domain types ────────────────────────────────────────
// Shared between the client (form submission + dashboard) and the serverless
// API. Kept framework-agnostic so both sides import the same contract.

export const ORDER_STATUSES = [
  'nouveau',
  'confirmé',
  'en préparation',
  'en livraison',
  'livré',
  'annulé',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const RESERVATION_STATUSES = ['nouveau', 'confirmé', 'annulé'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** One line of a submitted order (snapshot — prices are frozen at order time). */
export interface OrderLineInput {
  name_fr: string;
  quantity: number;
  unit_price: number;
  modifiers: string[]; // option_name_fr list
}

/** Client → POST /api/orders (delivery-only COD). */
export interface CreateOrderInput {
  restaurant_slug: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  lines: OrderLineInput[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes?: string;
}

/** Client → POST /api/reservations. */
export interface CreateReservationInput {
  restaurant_slug: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  date: string; // ISO yyyy-mm-dd
  time: string; // "20:30"
  notes?: string;
}

/** A row read back from Airtable for the dashboard. */
export interface OrderRecord {
  _recordId: string;
  order_id: string;
  restaurant_slug: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items_summary: string;
  items_json: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string;
  status: OrderStatus;
  notes?: string;
  createdTime: string;
}

export interface ReservationRecord {
  _recordId: string;
  reservation_id: string;
  restaurant_slug: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  date: string;
  time: string;
  status: ReservationStatus;
  notes?: string;
  createdTime: string;
}

/** Response from POST /api/auth. */
export interface AuthResponse {
  token: string;
  slug: string;
  restaurant_name: string;
}
