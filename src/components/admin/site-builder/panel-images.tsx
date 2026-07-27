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

const MAX_HERO_IMAGES = 12;
const MAX_WELCOME_IMAGES = 8;
const MAX_ABOUT_IMAGES = 8;

type AssetKind = "logo" | "hero" | "welcome" | "about" | "specials" | "value";

async function uploadAsset(restaurantId: string, file: File, kind: AssetKind): Promise<string> {
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

// Shared list UI for the three image-array fields (hero/welcome/about): grid
// of thumbnails with reorder + remove, plus an add slot gated at `max`.
function ImageListField({
  title,
  images,
  max,
  restaurantId,
  kind,
  emptyHint,
  onChange,
}: {
  title: string;
  images: string[];
  max: number;
  restaurantId: string;
  kind: AssetKind;
  emptyHint: string;
  onChange: (next: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function onAdd(file: File) {
    setUploading(true);
    try {
      const url = await uploadAsset(restaurantId, file, kind);
      onChange([...images, url]);
    } catch {
      toast.error("Échec de l'envoi de l'image");
    } finally {
      setUploading(false);
    }
  }

  function remove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          {title} ({images.length}/{max})
        </p>
        <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
          <ImagePlus className="size-4" />
          {uploading ? "Envoi…" : "Ajouter"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading || images.length >= max}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAdd(file);
              e.target.value = "";
            }}
          />
        </Label>
      </div>
      {images.length === 0 ? (
        <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {emptyHint}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((url, i) => (
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
                    onClick={() => move(i, -1)}
                    aria-label="Monter"
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={i === images.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label="Descendre"
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(i)}
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
  );
}

export function PanelImages({
  form,
  restaurantId,
}: {
  form: UseFormReturn<ThemeDraftInput>;
  restaurantId: string;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSpecials, setUploadingSpecials] = useState(false);
  const logoUrl = form.watch("logo_url") ?? null;
  const heroImages = form.watch("hero_image_urls") ?? [];
  const welcomeImages = form.watch("welcome_gallery_urls") ?? [];
  const aboutImages = form.watch("about_gallery_urls") ?? [];
  const specialsImage = form.watch("specials_image_url") ?? null;

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

  async function onSpecialsChange(file: File) {
    setUploadingSpecials(true);
    try {
      const url = await uploadAsset(restaurantId, file, "specials");
      form.setValue("specials_image_url", url, { shouldDirty: true });
    } catch {
      toast.error("Échec de l'envoi de l'image");
    } finally {
      setUploadingSpecials(false);
    }
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

      <ImageListField
        title="Images hero"
        images={heroImages}
        max={MAX_HERO_IMAGES}
        restaurantId={restaurantId}
        kind="hero"
        emptyHint="Aucune image — le site utilise les visuels par défaut."
        onChange={(next) => form.setValue("hero_image_urls", next, { shouldDirty: true })}
      />

      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">Image — Plats vedettes</p>
        <div className="flex items-center gap-3">
          {specialsImage && (
            <div className="relative h-16 w-24 overflow-hidden rounded-lg border">
              <Image src={specialsImage} alt="" fill sizes="96px" className="object-cover" />
            </div>
          )}
          <Label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <ImagePlus className="size-4" />
            {uploadingSpecials ? "Envoi…" : specialsImage ? "Changer" : "Ajouter"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={uploadingSpecials}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onSpecialsChange(file);
              }}
            />
          </Label>
          {specialsImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => form.setValue("specials_image_url", null, { shouldDirty: true })}
            >
              Retirer
            </Button>
          )}
        </div>
      </Card>

      <ImageListField
        title="Galerie — Bienvenue"
        images={welcomeImages}
        max={MAX_WELCOME_IMAGES}
        restaurantId={restaurantId}
        kind="welcome"
        emptyHint="Aucune image — le site utilise les visuels par défaut (4 minimum requises pour remplacer)."
        onChange={(next) => form.setValue("welcome_gallery_urls", next, { shouldDirty: true })}
      />

      <ImageListField
        title="Galerie — À propos"
        images={aboutImages}
        max={MAX_ABOUT_IMAGES}
        restaurantId={restaurantId}
        kind="about"
        emptyHint="Aucune image — la page À propos n'affichera pas de galerie."
        onChange={(next) => form.setValue("about_gallery_urls", next, { shouldDirty: true })}
      />
    </div>
  );
}
