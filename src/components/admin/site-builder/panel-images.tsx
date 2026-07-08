"use client";

import { useState } from "react";
import Image from "next/image";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { compressImage } from "@/lib/image";
import type { ThemeDraftInput } from "@/lib/schemas";

const MAX_HERO_IMAGES = 5;

async function uploadAsset(restaurantId: string, file: File, kind: "logo" | "hero"): Promise<string> {
  const compressed = await compressImage(file, kind === "logo" ? 512 : 1600, 0.85);
  const form = new FormData();
  form.set("file", compressed, `${kind}.webp`);
  form.set("kind", kind);
  const res = await fetch(`/api/admin/restaurants/${restaurantId}/theme/assets`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("upload failed");
  const body = await res.json();
  return body.url as string;
}

export function PanelImages({
  form,
  restaurantId,
}: {
  form: UseFormReturn<ThemeDraftInput>;
  restaurantId: string;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const logoUrl = form.watch("logo_url") ?? null;
  const heroImages = form.watch("hero_image_urls") ?? [];

  async function onLogoChange(file: File) {
    setUploadingLogo(true);
    try {
      const url = await uploadAsset(restaurantId, file, "logo");
      form.setValue("logo_url", url, { shouldDirty: true });
    } catch {
      toast.error("Échec de l'envoi du logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function onHeroAdd(file: File) {
    if (heroImages.length >= MAX_HERO_IMAGES) {
      toast.error(`Maximum ${MAX_HERO_IMAGES} images`);
      return;
    }
    setUploadingHero(true);
    try {
      const url = await uploadAsset(restaurantId, file, "hero");
      form.setValue("hero_image_urls", [...heroImages, url], { shouldDirty: true });
    } catch {
      toast.error("Échec de l'envoi de l'image");
    } finally {
      setUploadingHero(false);
    }
  }

  function removeHero(index: number) {
    const next = heroImages.filter((_, i) => i !== index);
    form.setValue("hero_image_urls", next, { shouldDirty: true });
  }

  function moveHero(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= heroImages.length) return;
    const next = [...heroImages];
    [next[index], next[target]] = [next[target], next[index]];
    form.setValue("hero_image_urls", next, { shouldDirty: true });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">Logo</p>
        <div className="flex items-center gap-3">
          {logoUrl && (
            <Image src={logoUrl} alt="" width={48} height={48} className="size-12 rounded-lg object-cover" />
          )}
          <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <ImagePlus className="size-4" />
            {uploadingLogo ? "Envoi…" : logoUrl ? "Changer" : "Ajouter"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploadingLogo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onLogoChange(file);
              }}
            />
          </Label>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.setValue("logo_url", null, { shouldDirty: true })}
            >
              Retirer
            </Button>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Images hero ({heroImages.length}/{MAX_HERO_IMAGES})</p>
          <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <ImagePlus className="size-4" />
            {uploadingHero ? "Envoi…" : "Ajouter"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploadingHero || heroImages.length >= MAX_HERO_IMAGES}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onHeroAdd(file);
                e.target.value = "";
              }}
            />
          </Label>
        </div>
        {heroImages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune image — le site utilise les visuels par défaut.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {heroImages.map((url, i) => (
              <div key={url} className="relative overflow-hidden rounded-lg border">
                <div className="relative aspect-video">
                  <Image src={url} alt="" fill sizes="200px" className="object-cover" />
                </div>
                <div className="flex items-center justify-between gap-1 border-t bg-card p-1.5">
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === 0}
                      onClick={() => moveHero(i, -1)}
                      aria-label="Monter"
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={i === heroImages.length - 1}
                      onClick={() => moveHero(i, 1)}
                      aria-label="Descendre"
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeHero(i)}
                    aria-label="Retirer"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
