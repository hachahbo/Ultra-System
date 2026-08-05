"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/format";
import type { PromoCode, PromoDiscountType } from "@/lib/types";

async function fetchPromoCodes(): Promise<PromoCode[]> {
  const res = await fetch("/api/dashboard/promo-codes");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.promo_codes ?? [];
}

export function PromoCodesManager() {
  const t = useTranslations("PromoCodes");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["dashboard-promo-codes"],
    queryFn: fetchPromoCodes,
  });
  const [editing, setEditing] = useState<PromoCode | "new" | null>(null);
  // Snapshot, not a live clock — this list doesn't need to flip an "expired"
  // badge mid-viewing, and calling Date.now() straight from render trips the
  // React Compiler's purity rule.
  const [now] = useState(() => Date.now());

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard-promo-codes"] });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/dashboard/promo-codes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: refresh,
    onError: () => toast.error(t("updateFailed")),
  });

  const deletePromo = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/promo-codes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: refresh,
    onError: () => toast.error(t("deleteFailed")),
  });

  const codes = data ?? [];

  // Postgres `numeric` columns come back from PostgREST as strings (e.g.
  // "20.00") — coerce before display so a percentage reads "20%", not
  // "20.00%".
  const discountLabel = (p: PromoCode) =>
    p.discount_type === "percentage"
      ? t("discountPercentage", { value: Number(p.discount_value) })
      : t("discountFixed", { value: formatPrice(p.discount_value) });

  const isExpired = (p: PromoCode) => !!p.expires_at && new Date(p.expires_at).getTime() < now;
  const isExhausted = (p: PromoCode) => p.max_uses !== null && p.uses_count >= p.max_uses;

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">{t("title")}</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">{t("subtitle")}</p>
        </div>
        <Button
          onClick={() => setEditing("new")}
          className="bg-primary text-primary-foreground font-bold rounded-full px-5 py-5 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm gap-2"
        >
          <Plus className="size-4" /> {t("newCode")}
        </Button>
      </div>

      {!isPending && codes.length === 0 && (
        <div className="flex flex-col items-center justify-center bg-card border border-border border-dashed rounded-2xl h-[160px]">
          <p className="text-center text-[14px] font-bold text-foreground">{t("emptyTitle")}</p>
          <p className="text-center text-[12.5px] text-muted-foreground mt-1">{t("emptyHint")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {codes.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border p-5 shadow-sm transition-all ${
              p.active ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono font-extrabold text-[15px] text-foreground truncate tracking-wide">
                  {p.code}
                </div>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t("usesCount", { count: p.uses_count, max: p.max_uses ?? "∞" })}
                </p>
              </div>
              <div className="font-bold text-[13px] text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 shrink-0">
                {discountLabel(p)}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {Number(p.min_order_amount) > 0 && (
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-2.5 py-1">
                  {t("minOrderTag", { amount: formatPrice(p.min_order_amount) })}
                </span>
              )}
              {p.expires_at && (
                <span
                  className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border ${
                    isExpired(p)
                      ? "text-destructive bg-destructive/10 border-destructive/20"
                      : "text-muted-foreground bg-muted/50 border-border/50"
                  }`}
                >
                  {t("expiresTag", { date: new Date(p.expires_at).toLocaleDateString() })}
                </span>
              )}
              {isExhausted(p) && (
                <span className="text-[11px] font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-full px-2.5 py-1">
                  {t("exhaustedTag")}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={p.active}
                  aria-label={t("activeLabel", { code: p.code })}
                  onCheckedChange={(checked) => toggleActive.mutate({ id: p.id, active: checked })}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <span className="text-[12px] font-semibold text-muted-foreground">
                  {p.active ? t("active") : t("inactive")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("editCode", { code: p.code })}
                  onClick={() => setEditing(p)}
                  className="hover:bg-muted text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="size-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("deleteCode", { code: p.code })}
                      className="hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border shadow-xl rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display text-xl">
                        {t("confirmDeleteCode", { code: p.code })}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-[14px]">
                        {t("deleteCodeText")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                      <AlertDialogCancel className="rounded-xl font-bold hover:bg-muted">
                        {t("cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePromo.mutate(p.id)}
                        className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t("delete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <PromoCodeFormDialog
          promoCode={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </section>
  );
}

function PromoCodeFormDialog({
  promoCode,
  onClose,
  onSaved,
}: {
  promoCode: PromoCode | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("PromoCodes");
  const [code, setCode] = useState(promoCode?.code ?? "");
  const [discountType, setDiscountType] = useState<PromoDiscountType>(
    promoCode?.discount_type ?? "percentage",
  );
  const [discountValue, setDiscountValue] = useState(
    promoCode ? String(promoCode.discount_value) : "",
  );
  const [minOrderAmount, setMinOrderAmount] = useState(
    promoCode ? String(promoCode.min_order_amount) : "0",
  );
  const [maxUses, setMaxUses] = useState(promoCode?.max_uses ? String(promoCode.max_uses) : "");
  const [expiresAt, setExpiresAt] = useState(
    promoCode?.expires_at ? promoCode.expires_at.slice(0, 10) : "",
  );
  const [active, setActive] = useState(promoCode?.active ?? true);
  const [saving, setSaving] = useState(false);

  const value = Number(discountValue);
  const valid =
    code.trim().length >= 3 &&
    discountValue !== "" &&
    value > 0 &&
    (discountType !== "percentage" || value <= 100);

  async function save() {
    setSaving(true);
    const payload = {
      code: code.trim(),
      discount_type: discountType,
      discount_value: value,
      min_order_amount: Number(minOrderAmount) || 0,
      max_uses: maxUses.trim() ? Number(maxUses) : null,
      active,
      expires_at: expiresAt || null,
    };
    const res = await fetch(
      promoCode ? `/api/dashboard/promo-codes/${promoCode.id}` : "/api/dashboard/promo-codes",
      {
        method: promoCode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? t("saveFailed"));
      return;
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card text-foreground shadow-2xl p-0 overflow-hidden rounded-3xl ring-1 ring-border/60 border-none max-h-[88vh] flex flex-col">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-xl font-bold tracking-tight">
            {promoCode ? t("editCodeTitle", { code: promoCode.code }) : t("newCodeTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="promo-code" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("code")}
            </Label>
            <Input
              id="promo-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("codePlaceholder")}
              className="h-12 rounded-xl font-mono tracking-wide"
              maxLength={30}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-4">
            <div className="space-y-2">
              <Label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("discountType")}
              </Label>
              <Select value={discountType} onValueChange={(v) => setDiscountType(v as PromoDiscountType)}>
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{t("typePercentage")}</SelectItem>
                  <SelectItem value="fixed">{t("typeFixed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-value" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                {discountType === "percentage" ? t("valuePercentage") : t("valueFixed")}
              </Label>
              <Input
                id="promo-value"
                type="number"
                min="0"
                max={discountType === "percentage" ? "100" : undefined}
                step="0.01"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr] gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo-min" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("minOrderAmount")}
              </Label>
              <Input
                id="promo-min"
                type="number"
                min="0"
                step="0.01"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-max-uses" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                {t("maxUses")}
              </Label>
              <Input
                id="promo-max-uses"
                type="number"
                min="1"
                step="1"
                placeholder={t("maxUsesPlaceholder")}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-expires" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
              {t("expiresAt")}
            </Label>
            <Input
              id="promo-expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-12 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} className="data-[state=checked]:bg-emerald-500" />
            <span className="text-[13px] font-semibold text-foreground">{t("activeSwitch")}</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" className="rounded-xl font-bold hover:bg-muted" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button className="rounded-xl font-bold gap-2 px-6" onClick={save} disabled={saving || !valid}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
