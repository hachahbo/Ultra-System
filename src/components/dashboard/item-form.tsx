"use client";

import { useState } from "react";
import Image from "next/image";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CustomizationEditor } from "@/components/dashboard/customization-editor";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/image";
import { itemSchema, type ItemInput } from "@/lib/schemas";
import type { Category, Item } from "@/lib/types";

export function ItemFormDialog({
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
      name_es: item?.name_es ?? "",
      description_fr: item?.description_fr ?? "",
      base_price: item ? Number(item.base_price) : 0,
      in_stock: item?.in_stock ?? true,
      customization_groups: item?.customization_groups ?? [],
    },
  });

  // Photo upload: compress client-side first, then go straight to Supabase
  // Storage (RLS: only the owner's restaurant folder is writable).
  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const supabase = createClient();
      const path = `${restaurantId}/${crypto.randomUUID()}-${compressed.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("menu-images")
        .upload(path, compressed, { cacheControl: "3600" });
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
      <DialogContent className="sm:max-w-xl bg-card text-foreground shadow-2xl p-0 overflow-hidden rounded-3xl ring-1 ring-border/60 border-none max-h-[88vh] flex flex-col">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-xl font-bold tracking-tight">
            {item ? `Modifier « ${item.name_fr} »` : "Nouvel article"}
          </DialogTitle>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden" noValidate>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
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
              <Label htmlFor="name_es">Nom (espagnol, optionnel)</Label>
              <Input id="name_es" {...form.register("name_es")} />
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

            <CustomizationEditor />

            </div>
            
            <div className="shrink-0 border-t border-border/40 bg-card/95 px-6 pb-6 pt-4 backdrop-blur-md flex justify-end gap-3">
              <Button type="button" variant="ghost" className="rounded-full font-bold hover:bg-muted" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" className="rounded-full font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]" disabled={saving || uploading}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
