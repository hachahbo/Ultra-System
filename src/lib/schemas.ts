import { z } from "zod";

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

export const itemSchema = z.object({
  category_id: z.string().uuid("Catégorie requise"),
  name_fr: z.string().trim().min(1, "Nom requis").max(120),
  name_ar: z.string().trim().max(120).optional(),
  description_fr: z.string().trim().max(300).optional(),
  base_price: z.number({ message: "Prix invalide" }).min(0, "Prix invalide").max(10000),
  in_stock: z.boolean(),
});

export type ItemInput = z.infer<typeof itemSchema>;
