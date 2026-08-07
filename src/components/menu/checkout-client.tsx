"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Minus, Plus, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cartDiscount, cartSubtotal, useCart, useCartHydrated } from "@/store/cart";
import { formatPrice } from "@/lib/format";
import { getDishImage } from "@/lib/image";
import { makePhoneSchema } from "@/lib/schemas";
import { PromoCodeForm } from "@/components/menu/promo-code-form";
import { motion, type Variants } from "framer-motion";
import type { Restaurant } from "@/lib/types";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const blurFadeUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(10px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.45,
      ease: [0.21, 0.47, 0.32, 0.98],
    },
  },
};

// Built per render so validation messages follow the active locale.
function buildDeliverySchema(m: { name: string; phone: string; address: string }) {
  return z.object({
    customer_name: z.string().trim().min(1, m.name).max(100),
    customer_phone: makePhoneSchema(m.phone),
    address: z.string().trim().min(5, m.address).max(300),
    note: z.string().trim().max(500).optional(),
  });
}

type DeliveryForm = z.infer<ReturnType<typeof buildDeliverySchema>>;

// Dine-in: the table number already identifies the order, so name and phone
// are pure convenience — a fully blank submit is valid. A phone that *is*
// typed still has to be dialable, otherwise capturing it is pointless.
function buildDineInSchema(m: { phone: string }) {
  return z.object({
    customer_name: z.string().trim().max(100).optional(),
    customer_phone: z
      .string()
      .optional()
      .superRefine((v, ctx) => {
        if (!v || !v.trim()) return; // blank is the whole point — allow it
        if (!makePhoneSchema(m.phone).safeParse(v).success) {
          ctx.addIssue({ code: "custom", message: m.phone });
        }
      }),
    note: z.string().trim().max(500).optional(),
  });
}

type DineInForm = z.infer<ReturnType<typeof buildDineInSchema>>;

export function CheckoutClient({ restaurant }: { restaurant: Restaurant }) {
  const hydrated = useCartHydrated();
  const { lines, table, promo, increment, decrement, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const t = useTranslations("Cart");
  const tErrors = useTranslations("Errors");

  const deliveryFormSchema = useMemo(
    () =>
      buildDeliverySchema({
        name: t("errorName"),
        phone: t("errorPhone"),
        address: t("errorAddress"),
      }),
    [t],
  );

  const isDineIn = Boolean(table);
  const subtotal = cartSubtotal(lines);
  const deliveryFee = isDineIn ? 0 : Number(restaurant.base_delivery_fee);
  const discount = cartDiscount(subtotal, promo);
  const total = subtotal + deliveryFee - discount;

  const dineInFormSchema = useMemo(
    () => buildDineInSchema({ phone: t("errorPhone") }),
    [t],
  );

  const form = useForm<DeliveryForm>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: { customer_name: "", customer_phone: "", address: "", note: "" },
  });

  const dineInForm = useForm<DineInForm>({
    resolver: zodResolver(dineInFormSchema),
    defaultValues: { customer_name: "", customer_phone: "", note: "" },
  });

  async function submitOrder(values: Partial<DeliveryForm>) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_slug: restaurant.slug,
          type: isDineIn ? "dine_in" : "delivery",
          table_number: table ?? undefined,
          // Blank optional fields are dropped, not sent as "" — the server
          // schema treats absent as "not given" and "" as an invalid phone.
          customer_name: values.customer_name || undefined,
          customer_phone: values.customer_phone || undefined,
          address: values.address || undefined,
          note: values.note || undefined,
          promo_code: promo?.code || undefined,
          lines: lines.map((l) => ({
            item_id: l.item_id,
            quantity: l.quantity,
            options: l.options,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? tErrors("generic"));
        return;
      }
      setOrderId(data.id);
      clear();
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      toast.error(tErrors("network"));
    } finally {
      setSubmitting(false);
    }
  }

  // Don't render anything until Zustand has rehydrated from localStorage.
  // Without this guard a page-refresh briefly shows lines=[] (the Zustand
  // initial state) before the real cart loads, which triggers the blur
  // animation in its "hidden" state and leaves the UI visually blurred.
  if (!hydrated) return null;

  if (orderId) {
    return (
      <motion.div
        variants={blurFadeUp}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center py-16 text-center"
      >
        <CheckCircle2 className="size-16 text-primary" />
        <h2 className="mt-4 font-display text-2xl font-semibold">
          {t("sentTitle")}
        </h2>
        <p className="mt-2 max-w-sm text-muted-foreground">
          {isDineIn ? t("sentDineIn") : t("sentDelivery")}
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href={`/${restaurant.slug}/menu`}>{t("backToMenu")}</Link>
        </Button>
      </motion.div>
    );
  }

  if (lines.length === 0) {
    return (
      <motion.div
        variants={blurFadeUp}
        initial="hidden"
        animate="show"
        className="py-16 text-center"
      >
        <p className="text-muted-foreground">{t("empty")}</p>
        <Button asChild className="mt-6">
          <Link href={`/${restaurant.slug}/menu`}>{t("seeMenu")}</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pb-24 items-start"
    >
      {/* ── Left Column: Form Info (Desktop Left, Mobile Second) ── */}
      <div className="lg:col-span-6 space-y-6 order-2 lg:order-1">
        {isDineIn ? (
          <motion.form
            variants={blurFadeUp}
            onSubmit={dineInForm.handleSubmit((values) => submitOrder(values))}
            className="space-y-6 rounded-[24px] bg-white dark:bg-card p-6 sm:p-8 shadow-sm border border-border/50"
            noValidate
          >
            <div className="space-y-3">
              <Label htmlFor="dine-name" className="text-sm font-semibold text-muted-foreground ml-1">{t("nameOptional")}</Label>
              <Input
                id="dine-name"
                autoComplete="name"
                {...dineInForm.register("customer_name")}
                className="h-14 rounded-2xl bg-white dark:bg-muted/30 px-4 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent shadow-sm transition-all"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="dine-phone" className="text-sm font-semibold text-muted-foreground ml-1">{t("phoneOptional")}</Label>
              <Input
                id="dine-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                aria-invalid={!!dineInForm.formState.errors.customer_phone}
                {...dineInForm.register("customer_phone")}
                className="h-14 rounded-2xl bg-white dark:bg-muted/30 px-4 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent shadow-sm transition-all"
              />
              <FieldError
                message={dineInForm.formState.errors.customer_phone?.message}
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="dine-note" className="text-base font-semibold">{t("kitchenNote")}</Label>
              <Textarea
                id="dine-note"
                placeholder={t("kitchenNotePlaceholder")}
                {...dineInForm.register("note")}
                className="min-h-[120px] rounded-2xl bg-white dark:bg-muted/30 px-4 py-3 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent shadow-sm transition-all"
              />
            </div>
            <Button
              size="lg"
              type="submit"
              className="w-full rounded-full h-14 text-lg font-bold shadow-xl"
              disabled={submitting}
            >
              {submitting ? t("sending") : t("sendToKitchen")}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            variants={blurFadeUp}
            onSubmit={form.handleSubmit((values) => submitOrder(values))}
            className="space-y-6 rounded-[24px] bg-white dark:bg-card p-6 sm:p-8 shadow-sm border border-border/50"
            noValidate
          >
            <div className="space-y-3">
              <Label htmlFor="customer_name" className="text-sm font-semibold text-muted-foreground ml-1">{t("name")}</Label>
              <Input
                id="customer_name"
                autoComplete="name"
                aria-invalid={!!form.formState.errors.customer_name}
                {...form.register("customer_name")}
                className="h-14 rounded-2xl bg-white dark:bg-muted/30 px-4 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent shadow-sm transition-all"
              />
              <FieldError message={form.formState.errors.customer_name?.message} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="customer_phone" className="text-sm font-semibold text-muted-foreground ml-1">{t("phone")}</Label>
              <Input
                id="customer_phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("phonePlaceholder")}
                aria-invalid={!!form.formState.errors.customer_phone}
                {...form.register("customer_phone")}
                className="h-14 rounded-2xl bg-white dark:bg-muted/30 px-4 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent shadow-sm transition-all"
              />
              <FieldError
                message={form.formState.errors.customer_phone?.message}
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="address" className="text-sm font-semibold text-muted-foreground ml-1">{t("address")}</Label>
              <Textarea
                id="address"
                autoComplete="street-address"
                placeholder={t("addressPlaceholder")}
                aria-invalid={!!form.formState.errors.address}
                {...form.register("address")}
                className="min-h-[100px] rounded-2xl bg-white dark:bg-muted/30 px-4 py-3 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent shadow-sm transition-all"
              />
              <FieldError message={form.formState.errors.address?.message} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="note" className="text-sm font-semibold text-muted-foreground ml-1">{t("note")}</Label>
              <Textarea
                id="note"
                {...form.register("note")}
                className="min-h-[100px] rounded-2xl bg-white dark:bg-muted/30 px-4 py-3 text-base border-border/50 focus-visible:ring-primary focus-visible:bg-transparent shadow-sm transition-all"
              />
            </div>

            <div className="pt-2">
              <Button size="lg" className="w-full rounded-full h-14 text-lg font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]" type="submit" disabled={submitting}>
                {submitting
                  ? t("sending")
                  : t("order", { price: formatPrice(total, restaurant.currency) })}
              </Button>
            </div>
          </motion.form>
        )}
      </div>

      {/* ── Right Column: Order Items & Totals (Desktop Right, Mobile First) ── */}
      <div className="lg:col-span-6 space-y-6 order-1 lg:order-2">
        {isDineIn && (
          <motion.p
            variants={blurFadeUp}
            className="rounded-2xl bg-primary/10 text-primary px-6 py-4 text-sm font-medium border border-primary/20 bg-white dark:bg-primary/10"
          >
            {t.rich("dineInNotice", {
              table: table ?? "",
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </motion.p>
        )}

        {/* Lines */}
        <ul className="space-y-3">
          {lines.map((l) => (
            <motion.li
              key={l.key}
              variants={blurFadeUp}
              className="group relative flex items-center gap-4 rounded-[20px] bg-white/70 dark:bg-white/[0.04] backdrop-blur-sm p-3 pr-4 shadow-[0_2px_16px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_0_rgba(0,0,0,0.25)] ring-1 ring-black/[0.06] dark:ring-white/[0.07] transition-all duration-300 hover:shadow-[0_4px_24px_0_rgba(255,107,53,0.10)] hover:ring-[#FF6B35]/20"
            >
              {/* Image medallion */}
              <div className="relative shrink-0 size-[72px]">
                {/* Outer glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FF6B35]/30 to-transparent blur-[6px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {/* Image frame */}
                <div className="relative size-full rounded-full overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                  {(() => {
                    // Resolve image: prefer stored image_url, fall back to
                    // getDishImage which derives a consistent hash-based placeholder
                    // from item_id. This handles stale cart entries that predate
                    // the image_url field, as well as items with no photo uploaded.
                    const imgSrc = getDishImage({ id: l.item_id, image_url: l.image_url });
                    return imgSrc ? (
                      <Image
                        src={imgSrc}
                        alt={l.name}
                        fill
                        sizes="256px"
                        quality={90}
                        className="object-cover scale-[1.24]"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-muted/60">
                        <UtensilsCrossed className="size-5 text-muted-foreground/40" />
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[15px] leading-snug text-foreground">{l.name}</p>
                {l.options.length > 0 && (
                  <p className="line-clamp-1 text-[11px] text-muted-foreground mt-0.5">
                    {l.options.join(" · ")}
                  </p>
                )}
                <p className="mt-1.5 text-sm font-black text-[#FF6B35]">
                  {formatPrice(l.unit_price * l.quantity, restaurant.currency)}
                </p>
              </div>

              {/* Quantity stepper */}
              <div className="flex items-center gap-0.5 rounded-full border border-border/60 bg-background/80 dark:bg-white/5 px-1 py-1 shadow-inner">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label={t("removeOne", { name: l.name })}
                  onClick={() => decrement(l.key)}
                >
                  <Minus className="size-3" />
                </Button>
                <span className="w-5 text-center text-sm font-bold tabular-nums">
                  {l.quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label={t("addOne", { name: l.name })}
                  onClick={() => increment(l.key)}
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </motion.li>
          ))}
        </ul>

        {/* Promo code */}
        <motion.div variants={blurFadeUp}>
          <PromoCodeForm slug={restaurant.slug} currency={restaurant.currency} />
        </motion.div>

        {/* Totals Summary */}
        <motion.div
          variants={blurFadeUp}
          className="rounded-[20px] bg-white/70 dark:bg-white/[0.04] backdrop-blur-sm p-6 ring-1 ring-black/[0.06] dark:ring-white/[0.07] shadow-[0_2px_16px_0_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_0_rgba(0,0,0,0.25)] space-y-3"
        >
          <div className="flex justify-between text-sm text-muted-foreground font-medium">
            <span>{t("subtotal")}</span>
            <span className="tabular-nums">{formatPrice(subtotal, restaurant.currency)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <span>{t("discount", { code: promo?.code ?? "" })}</span>
              <span className="tabular-nums">-{formatPrice(discount, restaurant.currency)}</span>
            </div>
          )}
          {!isDineIn && (
            <div className="flex justify-between text-sm text-muted-foreground font-medium">
              <span>{t("delivery")}</span>
              <span className="tabular-nums">{formatPrice(deliveryFee, restaurant.currency)}</span>
            </div>
          )}
          {/* Gradient separator */}
          <div className="my-3 h-px bg-gradient-to-r from-transparent via-[#FF6B35]/30 to-transparent" />
          {/* Total row — highlighted */}
          <div className="flex justify-between items-center rounded-2xl bg-[#FF6B35]/8 dark:bg-[#FF6B35]/10 px-4 py-3 ring-1 ring-[#FF6B35]/20">
            <span className="text-base font-extrabold tracking-tight">{t("total")}</span>
            <span className="text-xl font-black tabular-nums text-[#FF6B35] drop-shadow-sm">
              {formatPrice(total, restaurant.currency)}
            </span>
          </div>
          {!isDineIn && (
            <p className="pt-1 text-[11px] font-medium text-muted-foreground text-center">
              {t("cashOnDelivery")}
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-destructive">{message}</p>;
}
