"use client";

import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import { itemSchema, type ItemInput } from "@/lib/schemas";
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
      const res = await fetch(`/api/dashboard/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ in_stock }),
      });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Modification impossible"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/items/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Suppression impossible"),
  });

  if (isPending || !data) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Chargement…
      </p>
    );
  }

  const isOwner = data.role === "owner";

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

      {data.categories.map((cat) => {
        const items = data.items.filter((i) => i.category_id === cat.id);
        return (
          <section key={cat.id} className="mt-8">
            <h2 className="font-medium text-muted-foreground">{cat.name_fr}</h2>
            <ul className="mt-2 space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-border/60"
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
          categories={data.categories}
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

function ItemFormDialog({
  item,
  categories,
  restaurantId,
  onClose,
  onSaved,
}: {
  item: Item | null;
  categories: Category[];
  restaurantId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url ?? null);

  const form = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      category_id: item?.category_id ?? categories[0]?.id ?? "",
      name_fr: item?.name_fr ?? "",
      name_ar: item?.name_ar ?? "",
      description_fr: item?.description_fr ?? "",
      base_price: item ? Number(item.base_price) : 0,
      in_stock: item?.in_stock ?? true,
    },
  });

  // Photo upload goes straight to Supabase Storage (RLS: only the owner's
  // restaurant folder is writable), then the public URL is saved on the item.
  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${restaurantId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("menu-images")
        .upload(path, file, { cacheControl: "3600" });
      if (error) throw error;
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    } catch {
      toast.error("Échec de l'envoi de la photo");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: ItemInput) {
    setSaving(true);
    try {
      const payload = { ...values, image_url: imageUrl };
      const res = await fetch(
        item ? `/api/dashboard/items/${item.id}` : "/api/dashboard/items",
        {
          method: item ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        toast.error("Enregistrement impossible");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const errors = form.formState.errors;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {item ? `Modifier « ${item.name_fr} »` : "Nouvel article"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <Select
              value={form.watch("category_id")}
              onValueChange={(v) => form.setValue("category_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_fr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name_fr">Nom (français)</Label>
            <Input id="name_fr" {...form.register("name_fr")} />
            {errors.name_fr && (
              <p className="text-sm text-destructive">{errors.name_fr.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name_ar">Nom (arabe, optionnel)</Label>
            <Input id="name_ar" dir="rtl" {...form.register("name_ar")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description_fr">Description (optionnel)</Label>
            <Textarea id="description_fr" {...form.register("description_fr")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base_price">Prix (MAD)</Label>
            <Input
              id="base_price"
              type="number"
              step="0.5"
              min="0"
              inputMode="decimal"
              {...form.register("base_price", { valueAsNumber: true })}
            />
            {errors.base_price && (
              <p className="text-sm text-destructive">
                {errors.base_price.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo">Photo</Label>
            <div className="flex items-center gap-3">
              {imageUrl && (
                <Image
                  src={imageUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-lg object-cover"
                />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                <ImagePlus className="size-4" />
                {uploading ? "Envoi…" : imageUrl ? "Changer" : "Ajouter"}
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPhoto(file);
                  }}
                />
              </label>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <Label htmlFor="in_stock">En stock</Label>
            <Switch
              id="in_stock"
              checked={form.watch("in_stock")}
              onCheckedChange={(v) => form.setValue("in_stock", v)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={saving || uploading}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
