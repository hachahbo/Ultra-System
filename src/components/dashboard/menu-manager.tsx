"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ItemFormDialog } from "@/components/dashboard/item-form";
import { RecipeEditorDialog } from "@/components/dashboard/recipe-editor";
import { PromotionsManager } from "@/components/dashboard/promotions-manager";
import { PromoCodesManager } from "@/components/dashboard/promo-codes-manager";
import { MenuTranslationsDialog } from "@/components/dashboard/menu-translations";
import { formatPrice } from "@/lib/format";
import type { Category, FeatureKey, Item, MenuItemCost } from "@/lib/types";
import { canWrite, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { getDishImage } from "@/lib/image";

type MenuData = {
  restaurant_id: string;
  role: Role;
  features: Record<FeatureKey, boolean>;
  categories: Category[];
  items: Item[];
  costs: MenuItemCost[];
};

async function fetchMenu(): Promise<MenuData> {
  const res = await fetch("/api/dashboard/menu");
  if (!res.ok) throw new Error("fetch failed");
  return res.json();
}

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res;
}

export function MenuManager() {
  const t = useTranslations("MenuManager");
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["dashboard-menu"],
    queryFn: fetchMenu,
  });
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Item | null>(null);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["dashboard-menu"] });

  const toggleStock = useMutation({
    mutationFn: async ({ id, in_stock }: { id: string; in_stock: boolean }) => {
      const res = await patchJson(`/api/dashboard/items/${id}`, { in_stock });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: refresh,
    onError: () => toast.error(t("updateFailed")),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: refresh,
    onError: () => toast.error(t("deleteFailed")),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "delete failed");
      }
    },
    onSuccess: refresh,
    onError: (err: Error) =>
      toast.error(err.message || t("deleteFailed")),
  });

  const reorder = useMutation({
    mutationFn: async (pairs: { url: string; sort_order: number }[]) => {
      await Promise.all(
        pairs.map((p) => patchJson(p.url, { sort_order: p.sort_order })),
      );
    },
    onSuccess: refresh,
    onError: () => toast.error(t("reorderFailed")),
  });

  if (isPending || !data) {
    return (
      <div className="mt-6 space-y-4" aria-busy="true">
        <Skeleton className="h-[200px] w-full rounded-2xl" />
        <Skeleton className="h-[200px] w-full rounded-2xl" />
      </div>
    );
  }

  const isOwner = canWrite(data.role, "menu");
  const showCosts = data.features.recipes;
  const costByItem = new Map(data.costs.map((c) => [c.menu_item_id, c]));
  const sortedCategories = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);

  function moveCategory(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sortedCategories.length) return;
    const a = sortedCategories[index];
    const b = sortedCategories[target];
    reorder.mutate([
      { url: `/api/dashboard/categories/${a.id}`, sort_order: b.sort_order },
      { url: `/api/dashboard/categories/${b.id}`, sort_order: a.sort_order },
    ]);
  }

  function moveItem(items: Item[], index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    reorder.mutate([
      { url: `/api/dashboard/items/${a.id}`, sort_order: b.sort_order },
      { url: `/api/dashboard/items/${b.id}`, sort_order: a.sort_order },
    ]);
  }

  return (
    <div className="w-full space-y-8">
      {/* Header section matches Commandes aesthetic */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-[13.5px] text-muted-foreground mt-1 font-medium">
            {t("subtitle")}
          </p>
        </div>
        {isOwner && (
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {data.categories.length > 0 && (
              <MenuTranslationsDialog
                categories={data.categories}
                items={data.items}
                onSaved={refresh}
              />
            )}
            <AddCategoryDialog onCreated={refresh} />
            <Button 
              onClick={() => setCreating(true)} 
              disabled={data.categories.length === 0}
              className="bg-primary text-primary-foreground font-bold rounded-full px-6 py-5 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm gap-2 w-full sm:w-auto"
            >
              <Plus className="size-4" /> {t("newArticle")}
            </Button>
          </div>
        )}
      </div>

      {data.categories.length === 0 && (
        <div className="flex flex-col items-center justify-center bg-card border border-border border-dashed rounded-2xl h-[300px]">
          <UtensilsCrossed className="size-10 text-muted-foreground/50 mb-4" />
          <p className="text-center text-[15px] font-bold text-foreground">
            {t("noArticlesTitle")}
          </p>
          <p className="text-center text-[13px] text-muted-foreground mt-1">
            {t("noArticlesHint")}
          </p>
        </div>
      )}

      {sortedCategories.map((cat, catIndex) => {
        const items = data.items
          .filter((i) => i.category_id === cat.id)
          .sort((a, b) => a.sort_order - b.sort_order);
        
        return (
          <section key={cat.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Category Header */}
            <div className="flex items-center justify-between gap-2 mb-4 bg-muted/40 px-4 py-3 rounded-xl border border-border/50">
              <h2 className="font-display text-lg font-extrabold text-foreground tracking-tight">
                {cat.name_fr}
              </h2>
              {isOwner && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("moveUpCategory")}
                    disabled={catIndex === 0}
                    onClick={() => moveCategory(catIndex, -1)}
                    className="hover:bg-muted"
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("moveDownCategory")}
                    disabled={catIndex === sortedCategories.length - 1}
                    onClick={() => moveCategory(catIndex, 1)}
                    className="hover:bg-muted"
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <EditCategoryDialog category={cat} onSaved={refresh} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("deleteCategoryName", { name: cat.name_fr })}
                        className="hover:bg-destructive/10 hover:text-destructive text-destructive/70"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border shadow-xl rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-xl">
                          {t("confirmDeleteCategory", { name: cat.name_fr })}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-[14px]">
                          {items.length > 0
                            ? t("deleteCategoryBlocked")
                            : t("deleteCategoryConfirmText")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-xl font-bold hover:bg-muted">{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={items.length > 0}
                          onClick={() => deleteCategory.mutate(cat.id)}
                          className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t("delete")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>

            {/* Items Datatable */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-w-0">
              {/* Mobile: card list */}
              <div className="flex flex-col gap-3 p-3.5 md:hidden">
                {items.length === 0 ? (
                  <div className="py-8 text-center text-[13px] text-muted-foreground">
                    {t("noArticlesInCategory")}
                  </div>
                ) : (
                  items.map((item, itemIndex) => {
                    const cost = showCosts ? costByItem.get(item.id) : undefined;
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-xl border border-border bg-card p-4 shadow-sm",
                          !item.in_stock && "opacity-60 grayscale-[0.2]",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border/50 bg-background shadow-sm">
                            <Image src={getDishImage(item)} alt={item.name_fr} fill sizes="200px" className="object-cover rounded-full scale-120" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-extrabold text-foreground">{item.name_fr}</div>
                            {item.description_fr && (
                              <div className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{item.description_fr}</div>
                            )}
                          </div>
                          <Switch
                            checked={item.in_stock}
                            aria-label={t("inStockLabel", { name: item.name_fr })}
                            disabled={!isOwner}
                            onCheckedChange={(checked) => toggleStock.mutate({ id: item.id, in_stock: checked })}
                            className="shrink-0 data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-[12.5px]">
                          <span className="rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 font-bold text-primary">
                            {formatPrice(item.base_price)}
                          </span>
                          {showCosts && (
                            <>
                              <span className="text-muted-foreground">
                                {t("cost")} {cost ? formatPrice(cost.computed_cost) : "—"}
                              </span>
                              <span
                                className={cn(
                                  "font-bold",
                                  cost?.margin_pct === null || cost?.margin_pct === undefined
                                    ? "text-muted-foreground"
                                    : cost.margin_pct >= 60
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : cost.margin_pct >= 35
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-destructive",
                                )}
                              >
                                {cost?.margin_pct === null || cost?.margin_pct === undefined
                                  ? "—"
                                  : t("marginPct", { pct: cost.margin_pct.toFixed(0) })}
                              </span>
                            </>
                          )}
                          {isOwner && (
                            <div className="ml-auto flex items-center gap-0.5">
                              <Button variant="ghost" size="icon-sm" aria-label={t("moveUp")} disabled={itemIndex === 0} onClick={() => moveItem(items, itemIndex, -1)} className="hover:bg-muted">
                                <ChevronUp className="size-4 text-muted-foreground" />
                              </Button>
                              <Button variant="ghost" size="icon-sm" aria-label={t("moveDown")} disabled={itemIndex === items.length - 1} onClick={() => moveItem(items, itemIndex, 1)} className="hover:bg-muted">
                                <ChevronDown className="size-4 text-muted-foreground" />
                              </Button>
                              {showCosts && (
                                <Button variant="ghost" size="icon-sm" aria-label={t("recipeSheetOf", { name: item.name_fr })} onClick={() => setEditingRecipe(item)} className="text-muted-foreground hover:bg-muted hover:text-foreground">
                                  <ClipboardList className="size-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon-sm" aria-label={t("edit")} onClick={() => setEditing(item)} className="text-muted-foreground hover:bg-muted hover:text-foreground">
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("delete")}
                                className="text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => {
                                  if (confirm(t("confirmDeleteItem", { name: item.name_fr }))) deleteItem.mutate(item.id);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block w-full min-w-0 overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border">
                    <TableHead className="w-[70px] pl-5">{t("colImage")}</TableHead>
                    <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colArticle")}</TableHead>
                    <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colPrice")}</TableHead>
                    {showCosts && (
                      <>
                        <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colCost")}</TableHead>
                        <TableHead className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colMargin")}</TableHead>
                      </>
                    )}
                    <TableHead className="w-[120px] text-center font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colInStock")}</TableHead>
                    {isOwner && <TableHead className="w-[200px] text-right pr-5 font-bold text-[11px] text-muted-foreground uppercase tracking-wider">{t("colActions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, itemIndex) => (
                    <TableRow 
                      key={item.id} 
                      className={`border-border transition-colors hover:bg-muted/50 ${item.in_stock ? "" : "opacity-60 grayscale-[0.2]"}`}
                    >
                      <TableCell className="pl-5 py-4">
                        <div className="relative size-[46px] shrink-0 overflow-hidden rounded-full border border-border/50 shadow-sm bg-background flex items-center justify-center">
                          <Image
                            src={getDishImage(item)}
                            alt={item.name_fr}
                            fill
                            sizes="200px"
                            className="object-cover rounded-full scale-120"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[13.5px] text-foreground">
                            {item.name_fr}
                          </span>
                          {item.description_fr && (
                            <span className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                              {item.description_fr}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-[13px] text-primary bg-primary/10 w-fit px-3 py-1.5 rounded-lg border border-primary/20">
                          {formatPrice(item.base_price)}
                        </div>
                      </TableCell>
                      {showCosts && (() => {
                        const cost = costByItem.get(item.id);
                        return (
                          <>
                            <TableCell className="text-[12.5px] font-semibold text-muted-foreground">
                              {cost ? formatPrice(cost.computed_cost) : "—"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={cn(
                                  "text-[12.5px] font-bold",
                                  cost?.margin_pct === null || cost?.margin_pct === undefined
                                    ? "text-muted-foreground"
                                    : cost.margin_pct >= 60
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : cost.margin_pct >= 35
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-destructive",
                                )}
                              >
                                {cost?.margin_pct === null || cost?.margin_pct === undefined
                                  ? "—"
                                  : t("pctOnly", { pct: cost.margin_pct.toFixed(0) })}
                              </span>
                            </TableCell>
                          </>
                        );
                      })()}
                      <TableCell className="text-center">
                        <Switch
                          checked={item.in_stock}
                          aria-label={t("inStockLabel", { name: item.name_fr })}
                          disabled={!isOwner}
                          onCheckedChange={(checked) =>
                            toggleStock.mutate({ id: item.id, in_stock: checked })
                          }
                          className="data-[state=checked]:bg-emerald-500"
                        />
                      </TableCell>
                      {isOwner && (
                        <TableCell className="pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("moveUp")}
                              disabled={itemIndex === 0}
                              onClick={() => moveItem(items, itemIndex, -1)}
                              className="hover:bg-muted"
                            >
                              <ChevronUp className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("moveDown")}
                              disabled={itemIndex === items.length - 1}
                              onClick={() => moveItem(items, itemIndex, 1)}
                              className="hover:bg-muted"
                            >
                              <ChevronDown className="size-4 text-muted-foreground" />
                            </Button>
                            <div className="w-px h-4 bg-border mx-1" />
                            {showCosts && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={t("recipeSheetOf", { name: item.name_fr })}
                                onClick={() => setEditingRecipe(item)}
                                className="hover:bg-muted hover:text-foreground text-muted-foreground"
                              >
                                <ClipboardList className="size-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("edit")}
                              onClick={() => setEditing(item)}
                              className="hover:bg-muted hover:text-foreground text-muted-foreground"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={t("delete")}
                              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(t("confirmDeleteItem", { name: item.name_fr }))) {
                                  deleteItem.mutate(item.id);
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {items.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={4 + (showCosts ? 2 : 0) + (isOwner ? 1 : 0)}
                        className="h-24 text-center text-muted-foreground text-[13px]"
                      >
                        {t("noArticlesInCategory")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </div>
            </div>
          </section>
        );
      })}

      {data.role === "owner" && data.features.promotions && (
        <PromotionsManager categories={sortedCategories} items={data.items} />
      )}

      {data.role === "owner" && <PromoCodesManager />}

      {(creating || editing) && (
        <ItemFormDialog
          item={editing}
          categories={sortedCategories}
          restaurantId={data.restaurant_id}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            refresh();
          }}
        />
      )}

      {editingRecipe && (
        <RecipeEditorDialog
          item={editingRecipe}
          onClose={() => {
            setEditingRecipe(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function AddCategoryDialog({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("MenuManager");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/dashboard/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name_fr: name.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(t("createFailed"));
      return;
    }
    setName("");
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-card text-foreground border border-border font-bold rounded-xl px-5 py-5 hover:bg-muted transition-colors shadow-sm gap-2 w-full sm:w-auto">
          <Plus className="size-4" /> {t("newCategory")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-foreground border-border shadow-2xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
          <DialogTitle className="font-display text-xl font-bold">{t("newCategory")}</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{t("categoryName")}</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("categoryNamePlaceholder")}
              className="border-border bg-background h-12 rounded-xl shadow-sm text-[14px] font-medium placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <Button variant="ghost" className="rounded-xl font-bold hover:bg-muted" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button className="rounded-xl font-bold gap-2 px-6" onClick={save} disabled={saving || !name.trim()}>
            {saving ? t("creating") : t("createCategory")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditCategoryDialog({
  category,
  onSaved,
}: {
  category: Category;
  onSaved: () => void;
}) {
  const t = useTranslations("MenuManager");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name_fr);
  const [nameEn, setNameEn] = useState(category.i18n?.en?.name ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await patchJson(`/api/dashboard/categories/${category.id}`, {
      name_fr: name.trim(),
      i18n: { en: { name: nameEn.trim() } },
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(t("updateFailed"));
      return;
    }
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("renameCategory", { name: category.name_fr })} className="hover:bg-muted hover:text-foreground text-muted-foreground">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card text-foreground border-border shadow-2xl p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
          <DialogTitle className="font-display text-xl font-bold">{t("renameCategoryTitle")}</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-edit-name" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{t("name")}</Label>
            <Input
              id="cat-edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-border bg-background h-12 rounded-xl shadow-sm text-[14px] font-medium"
            />
          </div>
          {/* Shown on the public site when a visitor switches to English;
              blank falls back to the French name. */}
          <div className="space-y-2">
            <Label htmlFor="cat-edit-name-en" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{t("nameEn")}</Label>
            <Input
              id="cat-edit-name-en"
              value={nameEn}
              placeholder={name || t("nameEnPlaceholder")}
              onChange={(e) => setNameEn(e.target.value)}
              className="border-border bg-background h-12 rounded-xl shadow-sm text-[14px] font-medium"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <Button variant="ghost" className="rounded-xl font-bold hover:bg-muted" onClick={() => setOpen(false)}>{t("cancel")}</Button>
          <Button className="rounded-xl font-bold gap-2 px-6" onClick={save} disabled={saving || !name.trim()}>
            {saving ? t("saving") : t("save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
