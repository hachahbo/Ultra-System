"use client";

import type { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FONT_PAIRS } from "@/lib/fonts";
import { hasLowContrast } from "@/lib/theme";
import { FONT_PAIR_KEYS, type FontPairKey } from "@/lib/types";
import type { ThemeDraftInput } from "@/lib/schemas";

const COLOR_FIELDS = [
  { key: "color_primary", label: "Primaire (boutons, accents)" },
  { key: "color_secondary", label: "Secondaire" },
  { key: "color_background", label: "Fond" },
  { key: "color_text", label: "Texte" },
] as const;

function ColorField({
  form,
  fieldKey,
  label,
}: {
  form: UseFormReturn<ThemeDraftInput>;
  fieldKey: (typeof COLOR_FIELDS)[number]["key"];
  label: string;
}) {
  const value = form.watch(fieldKey) ?? null;

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? "#ffffff"}
          onChange={(e) => form.setValue(fieldKey, e.target.value, { shouldDirty: true })}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-md border"
          aria-label={label}
        />
        <Input
          value={value ?? ""}
          placeholder="Par défaut (plateforme)"
          onChange={(e) => {
            const v = e.target.value.trim();
            form.setValue(fieldKey, v.length > 0 ? v : null, { shouldDirty: true });
          }}
        />
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => form.setValue(fieldKey, null, { shouldDirty: true })}
          >
            Défaut
          </Button>
        )}
      </div>
    </div>
  );
}

export function PanelDesign({ form }: { form: UseFormReturn<ThemeDraftInput> }) {
  const background = form.watch("color_background") ?? null;
  const text = form.watch("color_text") ?? null;
  const fontPair = form.watch("font_pair") ?? "darna-classic";
  const lowContrast = hasLowContrast(background, text);

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-4">
        <p className="text-sm font-medium">Couleurs</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {COLOR_FIELDS.map((f) => (
            <ColorField key={f.key} form={form} fieldKey={f.key} label={f.label} />
          ))}
        </div>
        {lowContrast && (
          <p className="text-xs text-destructive">
            Contraste faible entre le fond et le texte — la lisibilité pourrait en souffrir.
          </p>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <p className="text-sm font-medium">Police</p>
        <Select
          value={fontPair}
          onValueChange={(v) => form.setValue("font_pair", v as FontPairKey, { shouldDirty: true })}
        >
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_PAIR_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {FONT_PAIRS[key].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          className="text-2xl"
          style={{ fontFamily: FONT_PAIRS[fontPair].displayVar }}
        >
          Aa — {FONT_PAIRS[fontPair].label}
        </p>
      </Card>
    </div>
  );
}
