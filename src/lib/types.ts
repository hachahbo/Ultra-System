// Database row types + the public menu JSON shape (plan.md §8).
// Names stay as language objects so the trilingual option remains free later.

import type { Role } from "@/lib/permissions";

export type LocalizedName = { fr: string; ar?: string | null; es?: string | null };

export type CustomizationOption = { name: string; price_modifier: number };

export type CustomizationGroup = {
  title: LocalizedName;
  required: boolean;
  max_selections: number;
  options: CustomizationOption[];
};

export type Plan = "free" | "pro" | "enterprise";
export type RestaurantStatus = "active" | "trial" | "suspended" | "expired";

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  whatsapp_number: string | null;
  phone: string | null;
  hours: string | null;
  currency: string;
  base_delivery_fee: number;
  is_dine_in_enabled: boolean;
  is_delivery_enabled: boolean;
  plan: Plan;
  status: RestaurantStatus;
  city: string | null;
  parent_restaurant_id: string | null;
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Bespoke Website Model — restaurant_theme (0005_bespoke_website_model.sql)
// The operator (Super Admin) owns everything here; owners never touch it.
// ---------------------------------------------------------------------------

export const FONT_PAIR_KEYS = [
  "darna-classic",
  "playfair-inter",
  "fraunces-work-sans",
  "cormorant-karla",
  "libre-source",
  "marcellus-nunito",
  "lora-open-sans",
  "bebas-barlow",
  "josefin-lato",
] as const;
export type FontPairKey = (typeof FONT_PAIR_KEYS)[number];

// The 5 sections that actually render today. "gallery" is still reserved —
// no renderer yet — so the builder's toggle/reorder machinery stays
// future-proof for it.
export const SECTION_KEYS = [
  "hero",
  "specials",
  "welcome",
  "values",
  "chef",
  "testimonials",
  "gallery",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const COPY_KEYS = [
  "hero_headline",
  "hero_sub",
  "hero_cta",
  "specials_heading",
  "specials_sub",
  "welcome_heading",
  "about_bento_heading",
  "about_bento_body",
  "about_daypart_heading",
  "about_daypart_body",
  "about_promo_heading",
  "about_promo_body",
] as const;
export type CopyKey = (typeof COPY_KEYS)[number];

export type ThemeSection = { key: SectionKey; enabled: boolean };

// One card in the homepage Values section (0019). Rendered only while
// non-empty — see ValuesSection.
export type ValueItem = { image_url: string; title: string; body: string };

// One card in the homepage Testimonials section (0019). `author` is
// optional — the original hardcoded copy this replaces had none.
export type Testimonial = { text: string; author?: string };

// Raw DB row (service-role reads only — draft is never exposed publicly).
export type RestaurantTheme = {
  restaurant_id: string;
  color_primary: string | null;
  color_secondary: string | null;
  color_background: string | null;
  color_text: string | null;
  font_pair: FontPairKey;
  logo_url: string | null;
  hero_image_urls: string[];
  about_title: string | null;
  about_body: string | null;
  address: string | null;
  sections: ThemeSection[];
  custom_copy: Partial<Record<CopyKey, string>>;
  // 0019 — storefront de-hardcoding. All empty/null by default; every
  // component consuming these treats "no data" as "render nothing", never
  // as "fall back to another restaurant's demo content".
  welcome_gallery_urls: string[];
  values_items: ValueItem[];
  testimonials: Testimonial[];
  about_gallery_urls: string[];
  about_rating: number | null;
  about_review_count: number | null;
  about_map_url: string | null;
  specials_image_url: string | null;
  social_facebook_url: string | null;
  social_instagram_url: string | null;
  social_twitter_url: string | null;
  draft: Partial<ThemeDraftFields> | null;
  updated_at: string;
};

// The subset of restaurant_theme columns the draft/publish flow writes.
export type ThemeDraftFields = Omit<RestaurantTheme, "restaurant_id" | "draft" | "updated_at">;

// A theme with every default applied and no draft — what the public site
// (non-preview) renders.
export type ResolvedTheme = Omit<RestaurantTheme, "draft">;

// Single source of truth for feature keys — mirrored by the
// restaurant_features.feature_key check constraint in 0003_super_admin.sql.
export const FEATURE_KEYS = [
  "online_ordering",
  "reservations",
  "analytics",
  "staff_management",
  "menu_editor",
  "floor_plan",
  "promotions",
  "inventory",
  "recipes",
  "kds",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type Subscription = {
  id: string;
  restaurant_id: string;
  plan_tier: Plan;
  status: "active" | "trialing" | "past_due" | "canceled";
  billing_cycle: "monthly" | "yearly";
  price_mad: number;
  trial_ends_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  provider: "manual" | "stripe";
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantFeature = {
  id: string;
  restaurant_id: string;
  feature_key: FeatureKey;
  enabled: boolean;
  updated_at: string;
};

export type AdminRestaurantRow = Restaurant & {
  monthlyRevenue: number;
  monthlyOrders: number;
  ownerLastActiveAt: string | null;
};

export type AuditLog = {
  id: string;
  admin_id: string;
  action: string;
  target_restaurant_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name_fr: string;
  name_ar: string | null;
  name_es: string | null;
  sort_order: number;
};

export type Item = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name_fr: string;
  name_ar: string | null;
  name_es: string | null;
  description_fr: string | null;
  base_price: number;
  image_url: string | null;
  in_stock: boolean;
  sort_order: number;
  is_smart_menu_eligible: boolean;
  customization_groups: CustomizationGroup[];
};

export type MenuItemCost = {
  menu_item_id: string;
  computed_cost: number;
  margin_mad: number;
  margin_pct: number | null;
};

export type Recipe = {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit: string;
  notes: string | null;
  inventory_item: {
    id: string;
    name: string;
    unit: string;
    stock: number;
    unit_price_mad: number;
  };
};

export type PromotionRule = { category_id: string; count: number };

export type Promotion = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  sort_order: number;
  rules: PromotionRule[];
  created_at: string;
};

export type OrderLine = {
  item_id: string;
  name: string;
  quantity: number;
  unit_price: number; // base price + selected option modifiers
  options: string[]; // selected option names, e.g. ["Algérienne", "Fromagère"]
};

export type Order = {
  id: string;
  restaurant_id: string;
  type: "dine_in" | "delivery";
  table_number: string | null;
  customer_id: string | null;
  customer_name: string | null;
  address: string | null;
  note: string | null;
  items: OrderLine[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: "new" | "preparing" | "done";
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  restaurant_id: string;
  name: string;
  phone: string;
  first_seen: string;
  order_count: number;
  last_order: string | null;
};

export type Reservation = {
  id: string;
  restaurant_id: string;
  customer_name: string;
  customer_phone: string;
  date: string;
  time: string;
  party_size: number;
  note: string | null;
  assigned_table_number: string | null;
  status: "new" | "confirmed" | "declined";
  created_at: string;
};

export type PublicMenu = {
  restaurant: Restaurant;
  categories: Category[];
  items: Item[];
  promotions: Promotion[];
};

export type Profile = {
  id: string;
  restaurant_id: string;
  role: Role;
  active?: boolean;
  must_change_password?: boolean;
  consented_at?: string | null;
};

export type DiningTable = {
  id: string;
  restaurant_id: string;
  number: string;
  seats: number;
  pos_x: number;
  pos_y: number;
  updated_at: string;
};

export type InventoryCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
};

export type InventoryItem = {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  unit: string;
  stock: number;
  min_threshold: number;
  unit_price_mad: number;
  created_at: string;
};

export type Supplier = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  status: "active" | "follow_up";
  created_at: string;
};

export type Delivery = {
  id: string;
  restaurant_id: string;
  supplier_id: string | null;
  label: string;
  eta_at: string;
  urgent: boolean;
  created_at: string;
};
