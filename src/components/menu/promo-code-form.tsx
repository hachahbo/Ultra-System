"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cartDiscount, cartSubtotal, useCart } from "@/store/cart";
import { formatPrice } from "@/lib/format";

// Shared by the checkout page's totals card and the standalone /[slug]/gifts
// redemption page — both just read/write the same cart.promo, so applying a
// code on either one carries over to the other.
export function PromoCodeForm({
  slug,
  currency,
}: {
  slug: string;
  currency: string;
}) {
  const t = useTranslations("PromoForm");
  const tErrors = useTranslations("Errors");
  const { lines, promo, applyPromo, clearPromo } = useCart();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const subtotal = cartSubtotal(lines);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_slug: slug, code: code.trim(), subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? tErrors("generic"));
        return;
      }
      applyPromo({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
      });
      setCode("");
      toast.success(t("applied", { code: data.code }));
    } catch {
      toast.error(tErrors("network"));
    } finally {
      setLoading(false);
    }
  }

  if (promo) {
    const discount = cartDiscount(subtotal, promo);
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Tag className="size-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{promo.code}</p>
            <p className="text-xs text-muted-foreground">
              {promo.discount_type === "percentage"
                ? t("discountPercentage", { value: promo.discount_value })
                : t("discountFixed", { value: formatPrice(promo.discount_value, currency) })}
              {discount > 0 && ` · -${formatPrice(discount, currency)}`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t("remove")}
          onClick={() => {
            clearPromo();
            toast.success(t("removed"));
          }}
          className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleApply} className="flex items-center gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("placeholder")}
        aria-label={t("placeholder")}
        className="h-11 flex-1 rounded-xl bg-white dark:bg-muted/30 uppercase placeholder:normal-case"
        maxLength={30}
      />
      <Button
        type="submit"
        variant="outline"
        disabled={loading || !code.trim()}
        className="h-11 shrink-0 rounded-xl font-bold"
      >
        {loading ? t("applying") : t("apply")}
      </Button>
    </form>
  );
}
