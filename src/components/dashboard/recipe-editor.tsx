"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import type { InventoryItem, Item, Recipe } from "@/lib/types";
import { cn } from "@/lib/utils";

async function fetchRecipes(menuItemId: string): Promise<Recipe[]> {
  const res = await fetch(`/api/dashboard/recipes?menu_item_id=${menuItemId}`);
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.recipes ?? [];
}

async function fetchInventory(): Promise<InventoryItem[]> {
  const res = await fetch("/api/dashboard/inventory");
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.items ?? [];
}

export function RecipeEditorDialog({
  item,
  onClose,
}: {
  item: Item;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const recipesQuery = useQuery({
    queryKey: ["recipes", item.id],
    queryFn: () => fetchRecipes(item.id),
  });
  const inventoryQuery = useQuery({
    queryKey: ["inventory-items-for-recipes"],
    queryFn: fetchInventory,
  });

  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["recipes", item.id] });

  const addLine = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dashboard/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_item_id: item.id,
          inventory_item_id: inventoryItemId,
          quantity: Number(quantity),
          unit,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Ajout impossible");
      }
    },
    onSuccess: () => {
      setInventoryItemId("");
      setQuantity("");
      setUnit("");
      refresh();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeLine = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Suppression impossible");
    },
    onSuccess: refresh,
    onError: () => toast.error("Suppression impossible"),
  });

  const recipes = recipesQuery.data ?? [];
  const inventoryItems = inventoryQuery.data ?? [];
  const usedIds = new Set(recipes.map((r) => r.inventory_item.id));
  const availableIngredients = inventoryItems.filter((i) => !usedIds.has(i.id));

  const totalCost = recipes.reduce(
    (sum, r) => sum + r.quantity * r.inventory_item.unit_price_mad,
    0,
  );
  const margin = Number(item.base_price) - totalCost;
  const marginPct = Number(item.base_price) > 0 ? (margin / Number(item.base_price)) * 100 : null;

  function selectIngredient(id: string) {
    setInventoryItemId(id);
    const found = inventoryItems.find((i) => i.id === id);
    if (found) setUnit(found.unit);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card text-foreground shadow-2xl p-0 overflow-hidden rounded-3xl ring-1 ring-border/60 border-none max-h-[88vh] flex flex-col">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-xl font-bold tracking-tight">
            Fiche technique — {item.name_fr}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {recipesQuery.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {recipes.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Aucun ingrédient lié. Ajoutez les ingrédients consommés par cet
                  article — le stock sera déduit automatiquement à chaque
                  commande.
                </p>
              ) : (
                <div className="rounded-2xl border border-border overflow-hidden">
                  {recipes.map((r, idx) => (
                    <div
                      key={r.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3",
                        idx > 0 && "border-t border-border/50",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-foreground truncate">
                          {r.inventory_item.name}
                        </div>
                        <div className="text-[11.5px] text-muted-foreground">
                          {r.quantity} {r.unit} · {formatPrice(r.quantity * r.inventory_item.unit_price_mad)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Retirer ${r.inventory_item.name}`}
                        className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeLine.mutate(r.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Coût</div>
                  <div className="text-[14px] font-extrabold text-foreground mt-0.5">{formatPrice(totalCost)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Marge</div>
                  <div className="text-[14px] font-extrabold text-foreground mt-0.5">{formatPrice(margin)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Marge %</div>
                  <div
                    className={cn(
                      "text-[14px] font-extrabold mt-0.5",
                      marginPct === null
                        ? "text-muted-foreground"
                        : marginPct >= 60
                          ? "text-emerald-600 dark:text-emerald-400"
                          : marginPct >= 35
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-destructive",
                    )}
                  >
                    {marginPct === null ? "—" : `${marginPct.toFixed(0)}%`}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">
                  Ajouter un ingrédient
                </Label>
                <div className="grid grid-cols-[2fr_1fr_1fr] gap-2">
                  <Select value={inventoryItemId} onValueChange={selectIngredient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Ingrédient…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableIngredients.length === 0 ? (
                        <div className="px-2 py-1.5 text-[12.5px] text-muted-foreground">
                          Aucun ingrédient disponible
                        </div>
                      ) : (
                        availableIngredients.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Qté"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <Input
                    placeholder="Unité"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 rounded-xl font-bold"
                  disabled={
                    !inventoryItemId ||
                    !quantity ||
                    Number(quantity) <= 0 ||
                    !unit.trim() ||
                    addLine.isPending
                  }
                  onClick={() => addLine.mutate()}
                >
                  <Plus className="size-4" /> Ajouter
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end shrink-0">
          <Button variant="ghost" className="rounded-xl font-bold hover:bg-muted" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
