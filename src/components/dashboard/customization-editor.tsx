"use client";

import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ItemInput } from "@/lib/schemas";

/**
 * Editor for an item's customization groups (e.g. "Choix de sauce" with
 * options + price modifiers). Nested field array: groups -> options.
 * Must be rendered inside a react-hook-form <FormProvider> for ItemInput.
 */
export function CustomizationEditor() {
  const { control, register } = useFormContext<ItemInput>();
  const groups = useFieldArray({ control, name: "customization_groups" });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Options de personnalisation</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            groups.append({
              title: { fr: "" },
              required: false,
              max_selections: 1,
              options: [{ name: "", price_modifier: 0 }],
            })
          }
        >
          <Plus className="size-4" /> Groupe
        </Button>
      </div>

      {groups.fields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Aucune option (ex. choix de sauce, taille…).
        </p>
      )}

      {groups.fields.map((group, groupIndex) => (
        <div key={group.id} className="space-y-3 rounded-xl border p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Titre du groupe (ex. Choix de sauce)"
                {...register(`customization_groups.${groupIndex}.title.fr`)}
              />
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name={`customization_groups.${groupIndex}.required`}
                    render={({ field }) => (
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                  Obligatoire
                </label>
                <label className="flex items-center gap-2">
                  Max
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    className="w-16"
                    {...register(`customization_groups.${groupIndex}.max_selections`, {
                      valueAsNumber: true,
                    })}
                  />
                </label>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Supprimer ce groupe"
              onClick={() => groups.remove(groupIndex)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>

          <OptionsEditor groupIndex={groupIndex} />
        </div>
      ))}
    </div>
  );
}

function OptionsEditor({ groupIndex }: { groupIndex: number }) {
  const { control, register } = useFormContext<ItemInput>();
  const options = useFieldArray({
    control,
    name: `customization_groups.${groupIndex}.options`,
  });

  return (
    <div className="space-y-2 border-t pt-2">
      {options.fields.map((opt, optIndex) => (
        <div key={opt.id} className="flex items-center gap-2">
          <Input
            placeholder="Nom (ex. Algérienne)"
            className="flex-1"
            {...register(`customization_groups.${groupIndex}.options.${optIndex}.name`)}
          />
          <Input
            type="number"
            step="0.5"
            placeholder="+MAD"
            className="w-20"
            {...register(
              `customization_groups.${groupIndex}.options.${optIndex}.price_modifier`,
              { valueAsNumber: true },
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Supprimer cette option"
            onClick={() => options.remove(optIndex)}
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => options.append({ name: "", price_modifier: 0 })}
      >
        <Plus className="size-3.5" /> Option
      </Button>
    </div>
  );
}
