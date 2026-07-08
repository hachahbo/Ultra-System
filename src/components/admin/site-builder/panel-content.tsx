"use client";

import type { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { COPY_KEYS, type CopyKey } from "@/lib/types";
import type { ThemeDraftInput } from "@/lib/schemas";

const COPY_LABELS: Record<CopyKey, { label: string; placeholder: string }> = {
  hero_headline: { label: "Titre principal (hero)", placeholder: "We provide the best food for you" },
  hero_sub: { label: "Sous-titre (hero)", placeholder: "Une phrase d'accroche courte…" },
  hero_cta: { label: "Bouton principal (hero)", placeholder: "Menu" },
  specials_heading: { label: "Titre — Plats vedettes", placeholder: "Our Special Dishes" },
  specials_sub: { label: "Sous-titre — Plats vedettes", placeholder: "Une phrase d'accroche courte…" },
  welcome_heading: { label: "Titre — Bienvenue", placeholder: "Welcome to Our Restaurant" },
};

export function PanelContent({ form }: { form: UseFormReturn<ThemeDraftInput> }) {
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
      </Card>

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
