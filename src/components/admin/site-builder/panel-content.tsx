"use client";

import { useState } from "react";
import Image from "next/image";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { ImagePlus, Languages, Plus, Trash2 } from "lucide-react";
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

/** Which language the text fields are editing. French is the base row; English
 * is stored in `i18n.en` and falls back to French wherever it's left blank. */
type EditLang = "fr" | "en";

type ThemeEn = NonNullable<NonNullable<ThemeDraftInput["i18n"]>["en"]>;

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

/** FR | EN switch shown once at the top of the panel. */
function LanguageTabs({
  lang,
  onChange,
  filled,
  total,
}: {
  lang: EditLang;
  onChange: (lang: EditLang) => void;
  filled: number;
  total: number;
}) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="flex items-center gap-2">
        <Languages className="size-4 text-muted-foreground" />
        <div className="inline-flex rounded-lg border p-0.5">
          {(["fr", "en"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChange(value)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                lang === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "fr" ? "Français" : "English"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {lang === "fr"
          ? "Langue de référence du site."
          : `${filled}/${total} champs traduits — les champs vides reprennent le français.`}
      </p>
    </Card>
  );
}

function ValuesItemsEditor({
  form,
  restaurantId,
  lang,
  en,
  setEn,
}: {
  form: UseFormReturn<ThemeDraftInput>;
  restaurantId: string;
  lang: EditLang;
  en: ThemeEn;
  setEn: (patch: Partial<ThemeEn>) => void;
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const items = form.watch("values_items") ?? [];
  const translations = en.values_items ?? [];

  function update(index: number, patch: Partial<{ image_url: string; title: string; body: string }>) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    form.setValue("values_items", next, { shouldDirty: true });
  }

  // Translations are index-aligned with the base array, so the slot has to
  // exist even when earlier cards aren't translated yet.
  function updateEn(index: number, patch: Partial<{ title: string; body: string }>) {
    const next = items.map((_, i) => ({ ...(translations[i] ?? {}), ...(i === index ? patch : {}) }));
    setEn({ values_items: next });
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
    setEn({ values_items: translations.filter((_, i) => i !== index) });
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
        {lang === "fr" && (
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={items.length >= MAX_VALUES_ITEMS}>
            <Plus className="size-3.5" /> Ajouter
          </Button>
        )}
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun élément — la section n&apos;apparaîtra pas sur le site.</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-start gap-3">
            {lang === "fr" &&
              (item.image_url ? (
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
              ))}
            <div className="flex-1 space-y-2">
              <Input
                placeholder={lang === "fr" ? "Titre" : item.title || "Title"}
                value={lang === "fr" ? item.title : translations[i]?.title ?? ""}
                onChange={(e) =>
                  lang === "fr"
                    ? update(i, { title: e.target.value })
                    : updateEn(i, { title: e.target.value })
                }
              />
              <Textarea
                rows={2}
                placeholder={lang === "fr" ? "Texte" : item.body || "Text"}
                value={lang === "fr" ? item.body : translations[i]?.body ?? ""}
                onChange={(e) =>
                  lang === "fr"
                    ? update(i, { body: e.target.value })
                    : updateEn(i, { body: e.target.value })
                }
              />
            </div>
            {lang === "fr" && (
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Retirer">
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
          {lang === "fr" && item.image_url && (
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

function TestimonialsEditor({
  form,
  lang,
  en,
  setEn,
}: {
  form: UseFormReturn<ThemeDraftInput>;
  lang: EditLang;
  en: ThemeEn;
  setEn: (patch: Partial<ThemeEn>) => void;
}) {
  const items = form.watch("testimonials") ?? [];
  const translations = en.testimonials ?? [];

  function update(index: number, patch: Partial<{ text: string; author: string }>) {
    const next = items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    form.setValue("testimonials", next, { shouldDirty: true });
  }

  function updateEn(index: number, patch: Partial<{ text: string; author: string }>) {
    const next = items.map((_, i) => ({ ...(translations[i] ?? {}), ...(i === index ? patch : {}) }));
    setEn({ testimonials: next });
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
    setEn({ testimonials: translations.filter((_, i) => i !== index) });
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Témoignages ({items.length}/{MAX_TESTIMONIALS})</p>
        {lang === "fr" && (
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={items.length >= MAX_TESTIMONIALS}>
            <Plus className="size-3.5" /> Ajouter
          </Button>
        )}
      </div>
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun témoignage — la section n&apos;apparaîtra pas sur le site.</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
          <div className="flex-1 space-y-2">
            <Textarea
              rows={2}
              placeholder={lang === "fr" ? "Texte du témoignage" : item.text || "Testimonial text"}
              value={lang === "fr" ? item.text : translations[i]?.text ?? ""}
              onChange={(e) =>
                lang === "fr"
                  ? update(i, { text: e.target.value })
                  : updateEn(i, { text: e.target.value })
              }
            />
            <Input
              placeholder={lang === "fr" ? "Auteur (optionnel)" : item.author || "Author (optional)"}
              value={lang === "fr" ? item.author ?? "" : translations[i]?.author ?? ""}
              onChange={(e) =>
                lang === "fr"
                  ? update(i, { author: e.target.value })
                  : updateEn(i, { author: e.target.value })
              }
            />
          </div>
          {lang === "fr" && (
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Retirer">
              <Trash2 className="size-3.5" />
            </Button>
          )}
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
  const [lang, setLang] = useState<EditLang>("fr");
  const customCopy = form.watch("custom_copy") ?? {};
  const i18n = form.watch("i18n") ?? {};
  const en: ThemeEn = i18n.en ?? {};
  const enCopy = en.custom_copy ?? {};

  function setEn(patch: Partial<ThemeEn>) {
    form.setValue("i18n", { ...i18n, en: { ...en, ...patch } }, { shouldDirty: true });
  }

  function setCopy(key: CopyKey, value: string) {
    const next = { ...customCopy };
    if (value.trim().length === 0) delete next[key];
    else next[key] = value;
    form.setValue("custom_copy", next, { shouldDirty: true });
  }

  function setEnCopy(key: CopyKey, value: string) {
    const next = { ...enCopy };
    if (value.trim().length === 0) delete next[key];
    else next[key] = value;
    setEn({ custom_copy: next });
  }

  // Progress readout: about title/body plus one slot per custom-copy key.
  const translatableTotal = COPY_KEYS.length + 2;
  const translatedCount =
    COPY_KEYS.filter((k) => (enCopy[k] ?? "").trim().length > 0).length +
    ((en.about_title ?? "").trim() ? 1 : 0) +
    ((en.about_body ?? "").trim() ? 1 : 0);

  const isFr = lang === "fr";

  return (
    <div className="space-y-6">
      <LanguageTabs
        lang={lang}
        onChange={setLang}
        filled={translatedCount}
        total={translatableTotal}
      />

      <Card className="space-y-4 p-4">
        <p className="text-sm font-medium">À propos</p>
        <div className="space-y-1.5">
          <Label htmlFor="about_title">Titre</Label>
          <Input
            id="about_title"
            placeholder={isFr ? undefined : form.watch("about_title") ?? "Title"}
            value={isFr ? form.watch("about_title") ?? "" : en.about_title ?? ""}
            onChange={(e) =>
              isFr
                ? form.setValue("about_title", e.target.value || null, { shouldDirty: true })
                : setEn({ about_title: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about_body">Texte</Label>
          <Textarea
            id="about_body"
            rows={5}
            placeholder={isFr ? undefined : form.watch("about_body") ?? "Text"}
            value={isFr ? form.watch("about_body") ?? "" : en.about_body ?? ""}
            onChange={(e) =>
              isFr
                ? form.setValue("about_body", e.target.value || null, { shouldDirty: true })
                : setEn({ about_body: e.target.value })
            }
          />
        </div>
        {/* Address, rating and links are the same in every language. */}
        {isFr && (
          <>
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
          </>
        )}
      </Card>

      {isFr && (
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
      )}

      <ValuesItemsEditor
        form={form}
        restaurantId={restaurantId}
        lang={lang}
        en={en}
        setEn={setEn}
      />
      <TestimonialsEditor form={form} lang={lang} en={en} setEn={setEn} />

      <Card className="space-y-4 p-4">
        <p className="text-sm font-medium">Textes personnalisés</p>
        <p className="text-xs text-muted-foreground">
          {isFr
            ? "Laisser vide pour utiliser le texte par défaut."
            : "Laisser vide pour reprendre le texte français."}
        </p>
        {COPY_KEYS.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={key}>{COPY_LABELS[key].label}</Label>
            <Input
              id={key}
              placeholder={isFr ? COPY_LABELS[key].placeholder : customCopy[key] || COPY_LABELS[key].placeholder}
              value={isFr ? customCopy[key] ?? "" : enCopy[key] ?? ""}
              onChange={(e) => (isFr ? setCopy(key, e.target.value) : setEnCopy(key, e.target.value))}
            />
          </div>
        ))}
      </Card>
    </div>
  );
}
