// Database row types + the public menu JSON shape (plan.md §8).
// Names stay as language objects so the trilingual option remains free later.

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
  logo_url: string | null;
  whatsapp_number: string | null;
  phone: string | null;
  address: string | null;
  hours: string | null;
  currency: string;
  base_delivery_fee: number;
  is_dine_in_enabled: boolean;
  is_delivery_enabled: boolean;
  about_text: string | null;
  plan: Plan;
  status: RestaurantStatus;
  city: string | null;
  updated_at: string;
};

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
  customization_groups: CustomizationGroup[];
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
};

export type Profile = {
  id: string;
  restaurant_id: string;
  role: "owner" | "staff";
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
