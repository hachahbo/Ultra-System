import { z } from "zod";
import { FEATURE_KEYS } from "@/lib/types";

// Moroccan numbers: accept 06/07 mobile or +2126/+2127, tolerant of spaces.
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^(?:\+?212|0)[5-7]\d{8}$/, "Numéro de téléphone invalide"),
  );

export const orderLineSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  options: z.array(z.string().max(100)).max(10).default([]),
});

export const orderSchema = z
  .object({
    restaurant_slug: z.string().min(1),
    type: z.enum(["dine_in", "delivery"]),
    table_number: z.string().max(10).optional(),
    customer_name: z.string().trim().max(100).optional(),
    customer_phone: phoneSchema.optional(),
    address: z.string().trim().max(300).optional(),
    note: z.string().trim().max(500).optional(),
    lines: z.array(orderLineSchema).min(1).max(50),
  })
  .superRefine((data, ctx) => {
    if (data.type === "delivery") {
      // The capture: delivery requires name + phone + address (plan.md §3C).
      if (!data.customer_name)
        ctx.addIssue({ code: "custom", path: ["customer_name"], message: "Nom requis" });
      if (!data.customer_phone)
        ctx.addIssue({ code: "custom", path: ["customer_phone"], message: "Téléphone requis" });
      if (!data.address)
        ctx.addIssue({ code: "custom", path: ["address"], message: "Adresse requise" });
    }
    if (data.type === "dine_in" && !data.table_number) {
      ctx.addIssue({ code: "custom", path: ["table_number"], message: "Numéro de table requis" });
    }
  });

export type OrderInput = z.infer<typeof orderSchema>;

export const reservationSchema = z.object({
  restaurant_slug: z.string().min(1),
  customer_name: z.string().trim().min(1, "Nom requis").max(100),
  customer_phone: phoneSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide"),
  party_size: z.coerce.number().int().min(1, "Minimum 1 personne").max(50),
  note: z.string().trim().max(500).optional(),
});

export type ReservationInput = z.infer<typeof reservationSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe trop court"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const customizationOptionSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(100),
  price_modifier: z.number({ message: "Prix invalide" }).min(-1000).max(1000),
});

export const customizationGroupSchema = z.object({
  title: z.object({
    fr: z.string().trim().min(1, "Titre requis").max(120),
    ar: z.string().trim().max(120).nullable().optional(),
    es: z.string().trim().max(120).nullable().optional(),
  }),
  required: z.boolean(),
  max_selections: z.number().int().min(1).max(10),
  options: z.array(customizationOptionSchema).min(1).max(20),
});

export const itemSchema = z.object({
  category_id: z.string().uuid("Catégorie requise"),
  name_fr: z.string().trim().min(1, "Nom requis").max(120),
  name_ar: z.string().trim().max(120).optional(),
  name_es: z.string().trim().max(120).optional(),
  description_fr: z.string().trim().max(300).optional(),
  base_price: z.number({ message: "Prix invalide" }).min(0, "Prix invalide").max(10000),
  in_stock: z.boolean(),
  sort_order: z.number().int().min(0).optional(),
  customization_groups: z.array(customizationGroupSchema).max(10).optional(),
});

export type ItemInput = z.infer<typeof itemSchema>;

export const categorySchema = z.object({
  name_fr: z.string().trim().min(1, "Nom requis").max(120),
  name_ar: z.string().trim().max(120).nullable().optional(),
  name_es: z.string().trim().max(120).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const tableSchema = z.object({
  number: z.string().trim().min(1, "Numéro requis").max(10),
  seats: z.number({ message: "Nombre de places invalide" }).int().min(1).max(30),
  pos_x: z.number().min(0).max(1).optional(),
  pos_y: z.number().min(0).max(1).optional(),
});

export type TableInput = z.infer<typeof tableSchema>;

export const restaurantSettingsSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  logo_url: z.string().url().nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  hours: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  whatsapp_number: z.string().trim().max(30).nullable().optional(),
  currency: z.string().trim().min(1).max(10),
  base_delivery_fee: z.number({ message: "Montant invalide" }).min(0).max(1000),
  about_text: z.string().trim().max(2000).nullable().optional(),
  is_dine_in_enabled: z.boolean(),
  is_delivery_enabled: z.boolean(),
});

export type RestaurantSettingsInput = z.infer<typeof restaurantSettingsSchema>;

export const staffSchema = z.object({
  email: z.string().trim().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
  consent: z
    .boolean()
    .refine((v) => v === true, "Le consentement du membre du personnel est requis"),
});

export type StaffInput = z.infer<typeof staffSchema>;

// ---------------------------------------------------------------------------
// Super Admin
// ---------------------------------------------------------------------------

export const planSchema = z.enum(["free", "pro", "enterprise"]);
export const restaurantStatusSchema = z.enum(["active", "trial", "suspended", "expired"]);
export const featureKeySchema = z.enum(FEATURE_KEYS);

export const adminRestaurantPatchSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120).optional(),
  city: z.string().trim().max(120).nullable().optional(),
  plan: planSchema.optional(),
  status: restaurantStatusSchema.optional(),
});
export type AdminRestaurantPatchInput = z.infer<typeof adminRestaurantPatchSchema>;

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug requis")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
  city: z.string().trim().max(120).optional(),
  plan: planSchema.default("free"),
  ownerEmail: z.string().trim().email("Email invalide"),
  ownerPassword: z.string().min(8, "8 caractères minimum"),
});
// z.input, not z.infer: the form works with the pre-default shape (plan
// optional client-side), matching what zodResolver expects for TFieldValues.
export type CreateRestaurantInput = z.input<typeof createRestaurantSchema>;

export const permissionToggleSchema = z.object({
  featureKey: featureKeySchema,
  enabled: z.boolean(),
});
export type PermissionToggleInput = z.infer<typeof permissionToggleSchema>;

export const bulkPermissionsSchema = z.object({
  restaurantIds: z.array(z.string().uuid()).min(1).max(100),
  changes: z
    .array(z.object({ featureKey: featureKeySchema, enabled: z.boolean() }))
    .min(1)
    .max(FEATURE_KEYS.length),
});
export type BulkPermissionsInput = z.infer<typeof bulkPermissionsSchema>;

export const subscriptionPatchSchema = z.object({
  plan_tier: planSchema.optional(),
  status: z.enum(["active", "trialing", "past_due", "canceled"]).optional(),
  billing_cycle: z.enum(["monthly", "yearly"]).optional(),
  price_mad: z.number().min(0).max(1_000_000).optional(),
  trial_ends_at: z.string().nullable().optional(),
  current_period_end: z.string().nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type SubscriptionPatchInput = z.infer<typeof subscriptionPatchSchema>;
