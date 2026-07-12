"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
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
import { ItemFormDialog } from "@/components/dashboard/item-form";
import { formatPrice } from "@/lib/format";
import type { Category, Item } from "@/lib/types";

type MenuData = {
  restaurant_id: string;
  role: "owner" | "staff";
  categories: Category[];
  items: Item[];
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
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["dashboard-menu"],
    queryFn: fetchMenu,
  });
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["dashboard-menu"] });

  const toggleStock = useMutation({
    mutationFn: async ({ id, in_stock }: { id: string; in_stock: boolean }) => {
      const res = await patchJson(`/api/dashboard/items/${id}`, { in_stock });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Modification impossible"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Suppression impossible"),
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
      toast.error(err.message || "Suppression impossible"),
  });

  const reorder = useMutation({
    mutationFn: async (pairs: { url: string; sort_order: number }[]) => {
      await Promise.all(
        pairs.map((p) => patchJson(p.url, { sort_order: p.sort_order })),
      );
    },
    onSuccess: refresh,
    onError: () => toast.error("Réorganisation impossible"),
  });

  if (isPending || !data) {
    return (
      <div className="mt-6 space-y-2" aria-busy="true">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  const isOwner = data.role === "owner";
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
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Menu</h1>
        {isOwner && (
          <div className="flex gap-2">
            <AddCategoryDialog onCreated={refresh} />
            <Button onClick={() => setCreating(true)} disabled={data.categories.length === 0}>
              <Plus className="size-4" /> Article
            </Button>
          </div>
        )}
      </div>
      {data.categories.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Commencez par créer une catégorie (ex. « Tacos », « Boissons »).
        </p>
      )}

      {sortedCategories.map((cat, catIndex) => {
        const items = data.items
          .filter((i) => i.category_id === cat.id)
          .sort((a, b) => a.sort_order - b.sort_order);
        return (
          <section key={cat.id} className="mt-8">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium text-muted-foreground">{cat.name_fr}</h2>
              {isOwner && (
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Monter la catégorie"
                    disabled={catIndex === 0}
                    onClick={() => moveCategory(catIndex, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Descendre la catégorie"
                    disabled={catIndex === sortedCategories.length - 1}
                    onClick={() => moveCategory(catIndex, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <EditCategoryDialog category={cat} onSaved={refresh} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer ${cat.name_fr}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Supprimer « {cat.name_fr} » ?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {items.length > 0
                            ? "Déplacez d'abord les articles de cette catégorie."
                            : "Cette action est irréversible."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          disabled={items.length > 0}
                          onClick={() => deleteCategory.mutate(cat.id)}
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
            <ul className="mt-2 space-y-2">
              {items.map((item, itemIndex) => (
                <li
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border/60 transition-all hover:shadow-md ${item.in_stock ? "opacity-100" : "opacity-60"}`}
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-accent text-accent-foreground">
                        <UtensilsCrossed className="size-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate font-medium ${item.in_stock ? "" : "text-muted-foreground line-through"}`}>
                      {item.name_fr}
                    </p>
                    <p className="text-sm text-primary">
                      {formatPrice(item.base_price)}
                    </p>
                  </div>
                  {isOwner && (
                    <>
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Monter l'article"
                          disabled={itemIndex === 0}
                          onClick={() => moveItem(items, itemIndex, -1)}
                        >
                          <ChevronUp className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Descendre l'article"
                          disabled={itemIndex === items.length - 1}
                          onClick={() => moveItem(items, itemIndex, 1)}
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                      </div>
                      <Switch
                        checked={item.in_stock}
                        aria-label={`${item.name_fr} en stock`}
                        onCheckedChange={(checked) =>
                          toggleStock.mutate({ id: item.id, in_stock: checked })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Modifier ${item.name_fr}`}
                        onClick={() => setEditing(item)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Supprimer ${item.name_fr}`}
                        onClick={() => {
                          if (confirm(`Supprimer « ${item.name_fr} » ?`)) {
                            deleteItem.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </li>
              ))}
              {items.length === 0 && (
                <li className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  Aucun article.
                </li>
              )}
            </ul>
          </section>
        );
      })}

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
    </div>
  );
}

function AddCategoryDialog({ onCreated }: { onCreated: () => void }) {
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
      toast.error("Création impossible");
      return;
    }
    setName("");
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" /> Catégorie
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nouvelle catégorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cat-name">Nom</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tacos, Burgers, Boissons…"
          />
        </div>
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Création…" : "Créer"}
        </Button>
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
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name_fr);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await patchJson(`/api/dashboard/categories/${category.id}`, {
      name_fr: name.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Modification impossible");
      return;
    }
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Renommer ${category.name_fr}`}>
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Renommer la catégorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cat-edit-name">Nom</Label>
          <Input
            id="cat-edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
