"use client";

import type { UseFormReturn } from "react-hook-form";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SECTION_KEYS, type SectionKey } from "@/lib/types";
import type { ThemeDraftInput } from "@/lib/schemas";

const SECTION_LABELS: Record<SectionKey, string> = {
  hero: "Hero",
  specials: "Plats vedettes",
  welcome: "Bienvenue",
  chef: "Chef",
  testimonials: "Témoignages",
  gallery: "Galerie",
};

export function PanelSections({ form }: { form: UseFormReturn<ThemeDraftInput> }) {
  const sections = form.watch("sections") ?? [];
  const configuredKeys = new Set(sections.map((s) => s.key));
  const reservedKeys = SECTION_KEYS.filter((k) => !configuredKeys.has(k));

  function toggle(index: number, enabled: boolean) {
    const next = sections.map((s, i) => (i === index ? { ...s, enabled } : s));
    form.setValue("sections", next, { shouldDirty: true });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    form.setValue("sections", next, { shouldDirty: true });
  }

  return (
    <Card className="space-y-2 p-4">
      <p className="text-sm font-medium">Sections de la page d&apos;accueil</p>
      <p className="text-xs text-muted-foreground">
        Activez, désactivez et réordonnez les sections affichées.
      </p>
      <div className="mt-2 space-y-2">
        {sections.map((section, i) => (
          <div
            key={section.key}
            className="flex items-center justify-between gap-2 rounded-lg border p-2.5"
          >
            <p className="text-sm">{SECTION_LABELS[section.key]}</p>
            <div className="flex items-center gap-1.5">
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
                disabled={i === sections.length - 1}
                onClick={() => move(i, 1)}
                aria-label="Descendre"
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Switch checked={section.enabled} onCheckedChange={(v) => toggle(i, v)} />
            </div>
          </div>
        ))}
        {reservedKeys.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between gap-2 rounded-lg border border-dashed p-2.5 opacity-60"
          >
            <p className="text-sm">{SECTION_LABELS[key]}</p>
            <Badge variant="secondary">Bientôt disponible</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}
