"use client";

import { useMemo, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Item } from "@/lib/types";

// Bulk FR → EN editor for the whole carte.
//
// The per-item form already has English fields, but keeping a menu translated
// one dialog at a time gives no answer to "what is still missing?" — and this
// restaurant's carte changes every two weeks. This view lists every category
// and dish side by side with its English counterpart, shows how much is done,
// and saves only the rows that actually changed.

type Draft = { name: string; description: string };

/** The English text currently stored for a row. */
function draftOf(row: { i18n?: { en?: { name?: string; description?: string } } }): Draft {
  return {
    name: row.i18n?.en?.name ?? "",
    description: row.i18n?.en?.description ?? "",
  };
}

export function MenuTranslationsDialog({
  categories,
  items,
  onSaved,
}: {
  categories: Category[];
  items: Item[];
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  // Re-seeded every time the dialog opens so it always reflects the server.
  function handleOpenChange(next: boolean) {
    if (next) {
      const seeded: Record<string, Draft> = {};
      for (const c of categories) seeded[`c:${c.id}`] = draftOf(c);
      for (const i of items) seeded[`i:${i.id}`] = draftOf(i);
      setDrafts(seeded);
    }
    setOpen(next);
  }

  function setDraft(key: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  // Progress counts every field that *can* be translated: one per category
  // name, one per dish name, and one per dish that has a French description.
  const { filled, total } = useMemo(() => {
    let f = 0;
    let t = categories.length + items.length;
    for (const c of categories) if (drafts[`c:${c.id}`]?.name.trim()) f++;
    for (const i of items) {
      if (drafts[`i:${i.id}`]?.name.trim()) f++;
      if (i.description_fr?.trim()) {
        t++;
        if (drafts[`i:${i.id}`]?.description.trim()) f++;
      }
    }
    return { filled: f, total: t };
  }, [categories, items, drafts]);

  async function save() {
    setSaving(true);
    try {
      const requests: Promise<Response>[] = [];

      for (const c of categories) {
        const next = drafts[`c:${c.id}`];
        const current = draftOf(c);
        if (!next || next.name === current.name) continue;
        requests.push(
          fetch(`/api/dashboard/categories/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ i18n: { en: { name: next.name.trim() } } }),
          }),
        );
      }

      for (const i of items) {
        const next = drafts[`i:${i.id}`];
        const current = draftOf(i);
        if (!next || (next.name === current.name && next.description === current.description)) {
          continue;
        }
        requests.push(
          fetch(`/api/dashboard/items/${i.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              i18n: {
                en: { name: next.name.trim(), description: next.description.trim() },
              },
            }),
          }),
        );
      }

      if (requests.length === 0) {
        toast.info("Aucune modification");
        setOpen(false);
        return;
      }

      const results = await Promise.all(requests);
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast.error(`${failed} enregistrement(s) ont échoué`);
        return;
      }

      toast.success(`${results.length} traduction(s) enregistrée(s)`);
      onSaved();
      setOpen(false);
    } catch {
      toast.error("Connexion impossible. Vérifiez votre réseau.");
    } finally {
      setSaving(false);
    }
  }

  const itemsByCategory = categories.map((c) => ({
    category: c,
    items: items.filter((i) => i.category_id === c.id),
  }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-full px-6 py-5 font-bold gap-2 w-full sm:w-auto"
        >
          <Languages className="size-4" /> Traductions
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[88vh] overflow-hidden flex flex-col min-h-0 p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20 shrink-0">
          <DialogTitle className="font-display text-xl font-bold">
            Traductions du menu — Anglais
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            Les champs laissés vides affichent le texte français aux visiteurs.
          </DialogDescription>
          <div className="flex items-center gap-3 pt-2">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={filled}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label="Champs traduits"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${total === 0 ? 0 : (filled / total) * 100}%` }}
              />
            </div>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground shrink-0">
              {filled}/{total}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-8">
          {itemsByCategory.map(({ category, items: categoryItems }) => (
            <section key={category.id} className="space-y-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 rounded-xl bg-muted/40 p-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Catégorie
                  </p>
                  <p className="font-bold text-[15px]">{category.name_fr}</p>
                </div>
                <Input
                  aria-label={`Nom anglais de la catégorie ${category.name_fr}`}
                  placeholder={category.name_fr}
                  value={drafts[`c:${category.id}`]?.name ?? ""}
                  onChange={(e) => setDraft(`c:${category.id}`, { name: e.target.value })}
                  className="h-10 rounded-lg"
                />
              </div>

              {categoryItems.length === 0 && (
                <p className="text-sm text-muted-foreground pl-3">Aucun article.</p>
              )}

              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 border-b border-border/50 pb-4 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-[14px]">{item.name_fr}</p>
                    {item.description_fr && (
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {item.description_fr}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      aria-label={`Nom anglais de ${item.name_fr}`}
                      placeholder={item.name_fr}
                      value={drafts[`i:${item.id}`]?.name ?? ""}
                      onChange={(e) => setDraft(`i:${item.id}`, { name: e.target.value })}
                      className="h-10 rounded-lg"
                    />
                    {/* Only dishes that have a French description need one in
                        English — otherwise there is nothing to translate. */}
                    {item.description_fr && (
                      <Textarea
                        aria-label={`Description anglaise de ${item.name_fr}`}
                        rows={2}
                        placeholder={item.description_fr}
                        value={drafts[`i:${item.id}`]?.description ?? ""}
                        onChange={(e) =>
                          setDraft(`i:${item.id}`, { description: e.target.value })
                        }
                        className="rounded-lg resize-none text-[13px]"
                      />
                    )}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0">
          <Button
            variant="ghost"
            className="rounded-xl font-bold hover:bg-muted"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button className="rounded-xl font-bold gap-2 px-6" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
