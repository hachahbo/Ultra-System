"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
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
import type { Category, Item, Promotion, PromotionRule } from "@/lib/types";

async function fetchPromotions(): Promise<Promotion[]> {
  const res = await fetch("/api/dashboard/promotions");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.promotions ?? [];
}

export function PromotionsManager({
  categories,
  items,
}: {
  categories: Category[];
  items: Item[];
}) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["dashboard-promotions"],
    queryFn: fetchPromotions,
  });
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard-promotions"] });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/dashboard/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Modification impossible"),
  });

  const deletePromo = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/promotions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Suppression impossible"),
  });

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name_fr ?? "—";
  const eligibleCount = (categoryId: string) =>
    items.filter((i) => i.category_id === categoryId && i.is_smart_menu_eligible).length;

  const promotions = data ?? [];

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Nos formules</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Menus combo affichés sur le site public — prix fixe pour un choix d&apos;articles.
          </p>
        </div>
        <Button
          onClick={() => setEditing("new")}
          disabled={categories.length === 0}
          className="bg-primary text-primary-foreground font-bold rounded-full px-5 py-5 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm gap-2"
        >
          <Plus className="size-4" /> Nouvelle formule
        </Button>
      </div>

      {!isPending && promotions.length === 0 && (
        <div className="flex flex-col items-center justify-center bg-card border border-border border-dashed rounded-2xl h-[160px]">
          <p className="text-center text-[14px] font-bold text-foreground">Aucune formule pour le moment.</p>
          <p className="text-center text-[12.5px] text-muted-foreground mt-1">
            Créez un menu combo, ex. « Menu Smart » : 1 plat + 1 boisson à prix fixe.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {promotions.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border p-5 shadow-sm transition-all ${
              p.active ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-70"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-extrabold text-[14px] text-foreground truncate">{p.name}</div>
                {p.description && (
                  <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                )}
              </div>
              <div className="font-bold text-[13px] text-primary bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 shrink-0">
                {formatPrice(p.price)}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.rules.map((r: PromotionRule, idx: number) => (
                <span
                  key={idx}
                  className="text-[11px] font-semibold text-muted-foreground bg-muted/50 border border-border/50 rounded-full px-2.5 py-1"
                >
                  {r.count}× {categoryName(r.category_id)}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={p.active}
                  aria-label={`${p.name} active`}
                  onCheckedChange={(checked) => toggleActive.mutate({ id: p.id, active: checked })}
                  className="data-[state=checked]:bg-emerald-500"
                />
                <span className="text-[12px] font-semibold text-muted-foreground">
                  {p.active ? "Visible" : "Masquée"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Modifier ${p.name}`}
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
                      aria-label={`Supprimer ${p.name}`}
                      className="hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border shadow-xl rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-display text-xl">Supprimer « {p.name} » ?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground text-[14px]">
                        Cette formule ne sera plus proposée sur le site. Action définitive.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6">
                      <AlertDialogCancel className="rounded-xl font-bold hover:bg-muted">Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePromo.mutate(p.id)}
                        className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Supprimer
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
        <PromotionFormDialog
          promotion={editing === "new" ? null : editing}
          categories={categories}
          eligibleCount={eligibleCount}
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

function PromotionFormDialog({
  promotion,
  categories,
  eligibleCount,
  onClose,
  onSaved,
}: {
  promotion: Promotion | null;
  categories: Category[];
  eligibleCount: (categoryId: string) => number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(promotion?.name ?? "");
  const [description, setDescription] = useState(promotion?.description ?? "");
  const [price, setPrice] = useState(promotion ? String(promotion.price) : "");
  const [active, setActive] = useState(promotion?.active ?? true);
  const [rules, setRules] = useState<PromotionRule[]>(
    promotion?.rules ?? [{ category_id: categories[0]?.id ?? "", count: 1 }],
  );
  const [saving, setSaving] = useState(false);

  function updateRule(idx: number, patch: Partial<PromotionRule>) {
    setRules((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRule() {
    setRules((prev) => [...prev, { category_id: categories[0]?.id ?? "", count: 1 }]);
  }
  function removeRule(idx: number) {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  }

  const valid =
    name.trim().length > 0 &&
    Number(price) >= 0 &&
    price !== "" &&
    rules.length > 0 &&
    rules.every((r) => r.category_id && r.count >= 1);

  async function save() {
    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: Number(price),
      active,
      rules,
    };
    const res = await fetch(
      promotion ? `/api/dashboard/promotions/${promotion.id}` : "/api/dashboard/promotions",
      {
        method: promotion ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);
    if (!res.ok) {
      toast.error("Enregistrement impossible");
      return;
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card text-foreground shadow-2xl p-0 overflow-hidden rounded-3xl ring-1 ring-border/60 border-none max-h-[88vh] flex flex-col">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-xl font-bold tracking-tight">
            {promotion ? `Modifier « ${promotion.name} »` : "Nouvelle formule"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
            <div className="space-y-2">
              <Label htmlFor="promo-name" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Nom</Label>
              <Input
                id="promo-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Menu Smart"
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-price" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Prix fixe (MAD)</Label>
              <Input
                id="promo-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="promo-desc" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Description (optionnel)</Label>
            <Input
              id="promo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: 1 plat au choix + 1 boisson"
              className="h-12 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} className="data-[state=checked]:bg-emerald-500" />
            <span className="text-[13px] font-semibold text-foreground">Visible sur le site public</span>
          </div>

          <div className="space-y-3">
            <Label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
              Composition — le client choisit parmi les articles éligibles de chaque catégorie
            </Label>
            <div className="space-y-2">
              {rules.map((rule, idx) => {
                const count = eligibleCount(rule.category_id);
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <Select value={rule.category_id} onValueChange={(v) => updateRule(idx, { category_id: v })}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Catégorie…" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name_fr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={rule.count}
                      onChange={(e) => updateRule(idx, { count: Number(e.target.value) })}
                      className="w-20 h-10 rounded-xl text-center"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Retirer cette règle"
                      onClick={() => removeRule(idx)}
                      disabled={rules.length === 1}
                      className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 shrink-0"
                    >
                      <X className="size-4" />
                    </Button>
                    {rule.category_id && count === 0 && (
                      <span className="text-[11px] text-destructive shrink-0">0 article éligible</span>
                    )}
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 rounded-xl font-bold"
              onClick={addRule}
              disabled={categories.length === 0}
            >
              <Plus className="size-4" /> Ajouter une règle
            </Button>
            <p className="text-[11.5px] text-muted-foreground">
              Seuls les articles marqués « éligible Menu Smart » dans leur fiche comptent. Une catégorie à 0 article éligible n&apos;affichera aucun choix pour cette règle.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0">
          <Button variant="ghost" className="rounded-xl font-bold hover:bg-muted" onClick={onClose}>Annuler</Button>
          <Button className="rounded-xl font-bold gap-2 px-6" onClick={save} disabled={saving || !valid}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
