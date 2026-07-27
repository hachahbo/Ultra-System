"use client";

import { useState } from "react";
import Image from "next/image";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { compressImage } from "@/lib/image";
import { COPY_KEYS, type CopyKey } from "@/lib/types";
import type { ThemeDraftInput } from "@/lib/schemas";

const MAX_VALUES_ITEMS = 6;
const MAX_TESTIMONIALS = 9;

const COPY_LABELS: Record<CopyKey, { label: string; placeholder: string }> = {
  hero_headline: { label: "Titre principal (hero)", placeholder: "We provide the best food for you" },
  hero_sub: { label: "Sous-titre (hero)", placeholder: "Une phrase d'accroche courte…" },
  hero_cta: { label: "Bouton principal (hero)", placeholder: "Menu" },
  specials_heading: { label: "Titre — Plats vedettes", placeholder: "Our Special Dishes" },
  specials_sub: { label: "Sous-titre — Plats vedettes", placeholder: "Une phrase d'accroche courte…" },
  welcome_heading: { label: "Titre — Bienvenue", placeholder: "Welcome to Our Restaurant" },
  about_bento_heading: { label: "À propos — titre carte d'accueil", placeholder: "Bienvenue chez nous !" },
  about_bento_body: { label: "À propos — texte carte d'accueil", placeholder: "Une phrase d'accroche courte…" },
  about_daypart_heading: { label: "À propos — titre carte horaires", placeholder: "Petit déjeuner, déjeuner, café, ..." },
  about_daypart_body: { label: "À propos — texte carte horaires", placeholder: "Une phrase d'accroche courte…" },
  about_promo_heading: { label: "À propos — titre carte privatisation", placeholder: "Privatisation" },
  about_promo_body: { label: "À propos — texte carte privatisation", placeholder: "Une phrase d'accroche courte…" },
};

async function uploadValueImage(restaurantId: string, file: File): Promise<string> {
  const compressed = await compressImage(file, 1200, 0.85);
  const form = new FormData();
  form.set("file", compressed, "value.webp");
  form.set("kind", "value");
  const res = await fetch(`/api/admin/restaurants/${restaurantId}/theme/assets`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("upload failed");
  const body = await res.json();
  return body.url as string;
}

function ValuesItemsEditor({
  form,
  restaurantId,
}: {
  form: UseFormReturn<ThemeDraftInput>;
  restaurantId: string;
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const items = form.watch("values_items") ?? [];

  function update(index: number, patch: Partial<{ image_url: string; title: string; body: string }>) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    form.setValue("values_items", next, { shouldDirty: true });
  }

  function add() {
    if (items.length >= MAX_VALUES_ITEMS) return;
    form.setValue(
      "values_items",
      [...items, { image_url: "", title: "", body: "" }],
      { shouldDirty: true },
    );
  }

  function remove(index: number) {
    form.setValue(
      "values_items",
      items.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  }

  async function onImage(index: number, file: File) {
    setUploadingIndex(index);
    try {
      const url = await uploadValueImage(restaurantId, file);
      update(index, { image_url: url });
    } catch {
      toast.error("Échec de l'envoi de l'image");
    } finally {
      setUploadingIndex(null);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Valeurs / Piliers ({items.length}/{MAX_VALUES_ITEMS})</p>
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={items.length >= MAX_VALUES_ITEMS}>
          <Plus className="size-3.5" /> Ajouter
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun élément — la section n&apos;apparaîtra pas sur le site.</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start gap-3">
            {item.image_url ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border">
                <Image src={item.image_url} alt="" fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <Label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted">
                <ImagePlus className="size-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadingIndex === i}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImage(i, file);
                  }}
                />
              </Label>
            )}
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Titre"
                value={item.title}
                onChange={(e) => update(i, { title: e.target.value })}
              />
              <Textarea
                rows={2}
                placeholder="Texte"
                value={item.body}
                onChange={(e) => update(i, { body: e.target.value })}
              />
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Retirer">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          {item.image_url && (
            <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-muted">
              {uploadingIndex === i ? "Envoi…" : "Changer l'image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadingIndex === i}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImage(i, file);
                }}
              />
            </Label>
          )}
        </div>
      ))}
    </Card>
  );
}

function TestimonialsEditor({ form }: { form: UseFormReturn<ThemeDraftInput> }) {
  const items = form.watch("testimonials") ?? [];

  function update(index: number, patch: Partial<{ text: string; author: string }>) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    form.setValue("testimonials", next, { shouldDirty: true });
  }

  function add() {
    if (items.length >= MAX_TESTIMONIALS) return;
    form.setValue("testimonials", [...items, { text: "" }], { shouldDirty: true });
  }

  function remove(index: number) {
    form.setValue(
      "testimonials",
      items.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Témoignages ({items.length}/{MAX_TESTIMONIALS})</p>
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={items.length >= MAX_TESTIMONIALS}>
          <Plus className="size-3.5" /> Ajouter
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun témoignage — la section n&apos;apparaîtra pas sur le site.</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex-1 space-y-2">
            <Textarea
              rows={2}
              placeholder="Texte du témoignage"
              value={item.text}
              onChange={(e) => update(i, { text: e.target.value })}
            />
            <Input
              placeholder="Auteur (optionnel)"
              value={item.author ?? ""}
              onChange={(e) => update(i, { author: e.target.value })}
            />
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Retirer">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
    </Card>
  );
}

export function PanelContent({
  form,
  restaurantId,
}: {
  form: UseFormReturn<ThemeDraftInput>;
  restaurantId: string;
}) {
  const customCopy = form.watch("custom_copy") ?? {};

  function setCopy(key: CopyKey, value: string) {
    const next = { ...customCopy };
    if (value.trim().length === 0) delete next[key];
    else next[key] = value;
    form.setValue("custom_copy", next, { shouldDirty: true });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4">
        <p className="text-sm font-medium">À propos</p>
        <div className="space-y-1.5">
          <Label htmlFor="about_title">Titre</Label>
          <Input
            id="about_title"
            value={form.watch("about_title") ?? ""}
            onChange={(e) =>
              form.setValue("about_title", e.target.value || null, { shouldDirty: true })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about_body">Texte</Label>
          <Textarea
            id="about_body"
            rows={5}
            value={form.watch("about_body") ?? ""}
            onChange={(e) =>
              form.setValue("about_body", e.target.value || null, { shouldDirty: true })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Adresse</Label>
          <Input
            id="address"
            value={form.watch("address") ?? ""}
            onChange={(e) => form.setValue("address", e.target.value || null, { shouldDirty: true })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="about_rating">Note (0–5)</Label>
            <Input
              id="about_rating"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={form.watch("about_rating") ?? ""}
              onChange={(e) =>
                form.setValue(
                  "about_rating",
                  e.target.value === "" ? null : Number(e.target.value),
                  { shouldDirty: true },
                )
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="about_review_count">Nombre d&apos;avis</Label>
            <Input
              id="about_review_count"
              type="number"
              min={0}
              step={1}
              value={form.watch("about_review_count") ?? ""}
              onChange={(e) =>
                form.setValue(
                  "about_review_count",
                  e.target.value === "" ? null : Number(e.target.value),
                  { shouldDirty: true },
                )
              }
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about_map_url">Lien Google Maps</Label>
          <Input
            id="about_map_url"
            value={form.watch("about_map_url") ?? ""}
            onChange={(e) => form.setValue("about_map_url", e.target.value || null, { shouldDirty: true })}
          />
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <p className="text-sm font-medium">Réseaux sociaux</p>
        <div className="space-y-1.5">
          <Label htmlFor="social_facebook_url">Facebook</Label>
          <Input
            id="social_facebook_url"
            value={form.watch("social_facebook_url") ?? ""}
            onChange={(e) =>
              form.setValue("social_facebook_url", e.target.value || null, { shouldDirty: true })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="social_instagram_url">Instagram</Label>
          <Input
            id="social_instagram_url"
            value={form.watch("social_instagram_url") ?? ""}
            onChange={(e) =>
              form.setValue("social_instagram_url", e.target.value || null, { shouldDirty: true })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="social_twitter_url">X / Twitter</Label>
          <Input
            id="social_twitter_url"
            value={form.watch("social_twitter_url") ?? ""}
            onChange={(e) =>
              form.setValue("social_twitter_url", e.target.value || null, { shouldDirty: true })
            }
          />
        </div>
      </Card>

      <ValuesItemsEditor form={form} restaurantId={restaurantId} />
      <TestimonialsEditor form={form} />

      <Card className="space-y-4 p-4">
        <p className="text-sm font-medium">Textes personnalisés</p>
        <p className="text-xs text-muted-foreground">
          Laisser vide pour utiliser le texte par défaut.
        </p>
        {COPY_KEYS.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{COPY_LABELS[key].label}</Label>
            <Input
              id={key}
              placeholder={COPY_LABELS[key].placeholder}
              value={customCopy[key] ?? ""}
              onChange={(e) => setCopy(key, e.target.value)}
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
