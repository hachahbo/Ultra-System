// ─── Raw Airtable REST API envelope ──────────────────────────────────────────
// Every row Airtable returns is wrapped in this shape.
// The app never works with these directly — use the domain models below.

export interface AirtableRecord<TFields> {
  id: string;
  createdTime: string;
  fields: TFields;
}

export interface AirtableListResponse<TFields> {
  records: AirtableRecord<TFields>[];
  offset?: string; // present when the result set is paginated
}

// ─── Raw field shapes (1-to-1 with Airtable column names) ────────────────────

export interface RestaurantFields {
  slug: string;              // primary key, e.g. "tacos-al-amin"
  restaurant_name: string;
  whatsapp_number: string;   // e.g. "+2126XXXXXXXX"
  currency: string;          // e.g. "MAD"
  delivery_fee: number;
  is_active: boolean;
}

export interface CategoryFields {
  category_id: string;       // e.g. "cat_1"
  restaurant_slug: string;   // FK → Restaurants.slug
  name_fr: string;
  name_ar: string;
  sort_order: number;
}

export interface ItemFields {
  item_id: string;           // e.g. "item_101"
  category_id: string;       // FK → Categories.category_id
  name_fr: string;
  name_ar: string;
  base_price: number;
  image_url: string;
  in_stock: boolean;
  has_modifiers: boolean;
}

export interface ModifierFields {
  modifier_id: string;       // e.g. "mod_1"
  item_id: string;           // FK → Items.item_id
  group_name_fr: string;     // e.g. "Choix de Sauce"
  option_name_fr: string;    // e.g. "Algérienne"
  price_impact: number;      // 0.00 for free, positive for upsells
  is_required: boolean;
}

// ─── Clean domain models ──────────────────────────────────────────────────────
// Derived from AirtableRecord by mappers in the data-fetching hook.
// All components and the Zustand store consume these shapes exclusively.

export interface Restaurant extends RestaurantFields {
  _recordId: string;
}

export interface Category extends CategoryFields {
  _recordId: string;
}

export interface Item extends ItemFields {
  _recordId: string;
}

export interface Modifier extends ModifierFields {
  _recordId: string;
}

// ─── Composed types assembled after all four tables are fetched ───────────────

export interface ItemWithModifiers extends Item {
  modifiers: Modifier[];
}

export interface CategoryWithItems extends Category {
  items: ItemWithModifiers[];
}

export interface MenuPayload {
  restaurant: Restaurant;
  categories: CategoryWithItems[]; // pre-sorted by sort_order
}
