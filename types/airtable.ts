// ─── Airtable raw API response wrappers ───────────────────────────────────────

export interface AirtableRecord<T> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface AirtableResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

// ─── Table 1: Restaurants ─────────────────────────────────────────────────────

export interface RestaurantFields {
  slug: string;
  restaurant_name: string;
  whatsapp_number: string;
  currency: string;
  delivery_fee: number;
  is_active: boolean;
}

export type RestaurantRecord = AirtableRecord<RestaurantFields>;

// ─── Table 2: Categories ──────────────────────────────────────────────────────

export interface CategoryFields {
  category_id: string;
  restaurant_slug: string;
  name_fr: string;
  name_ar: string;
  sort_order: number;
}

export type CategoryRecord = AirtableRecord<CategoryFields>;

// ─── Table 3: Items ───────────────────────────────────────────────────────────

export interface ItemFields {
  item_id: string;
  category_id: string;
  name_fr: string;
  name_ar: string;
  base_price: number;
  image_url: string;
  in_stock: boolean;
  has_modifiers: boolean;
}

export type ItemRecord = AirtableRecord<ItemFields>;

// ─── Table 4: Modifiers ───────────────────────────────────────────────────────

export interface ModifierFields {
  modifier_id: string;
  item_id: string;
  group_name_fr: string;
  option_name_fr: string;
  price_impact: number;
  is_required: boolean;
}

export type ModifierRecord = AirtableRecord<ModifierFields>;

// ─── Normalised domain models (used throughout the app) ──────────────────────
// These are the clean, flat shapes derived from AirtableRecord.fields.
// All components and the Zustand store consume these, never raw API payloads.

export interface Restaurant extends RestaurantFields {}

export interface Category extends CategoryFields {}

export interface Item extends ItemFields {}

export interface Modifier extends ModifierFields {}

// ─── Composed "menu payload" assembled after all fetches complete ─────────────

export interface CategoryWithItems extends Category {
  items: ItemWithModifiers[];
}

export interface ItemWithModifiers extends Item {
  modifiers: Modifier[];
}

export interface MenuPayload {
  restaurant: Restaurant;
  categories: CategoryWithItems[];
}
