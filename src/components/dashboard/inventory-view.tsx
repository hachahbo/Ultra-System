"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronRight,
  Coins,
  Minus,
  Package,
  Plus,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatPrice } from "@/lib/format";
import {
  fetchInventory,
  formatEta,
  inventoryQueryKey,
  lowStockCount,
  statusOf,
  stockValue,
  STOCK_STATUS_LABEL,
  type InventoryData,
  type StockStatus,
} from "@/lib/inventory-query";
import type { InventoryCategory, InventoryItem } from "@/lib/types";
import { canWrite } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<StockStatus, string> = {
  in: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  low: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  out: "bg-destructive/10 text-destructive",
};

const STATUS_DOT: Record<StockStatus, string> = {
  in: "bg-emerald-500",
  low: "bg-amber-500",
  out: "bg-destructive",
};

async function postJson(url: string, body: unknown) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function patchJson(url: string, body: unknown) {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function InventoryView() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: inventoryQueryKey,
    queryFn: fetchInventory,
  });
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [creatingItem, setCreatingItem] = useState(false);
  const [purchaseOrderOpen, setPurchaseOrderOpen] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: inventoryQueryKey });

  const adjustStock = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const res = await patchJson(`/api/dashboard/inventory/${id}`, { delta });
      if (!res.ok) throw new Error("update failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Modification impossible"),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/inventory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Suppression impossible"),
  });

  if (isPending || !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[110px] rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
    );
  }

  return (
    <InventoryContent
      data={data}
      openCategories={openCategories}
      onToggleCategory={(id) =>
        setOpenCategories((s) => ({ ...s, [id]: !(s[id] ?? true) }))
      }
      onAdjust={(id, delta) => adjustStock.mutate({ id, delta })}
      onDelete={(id) => {
        if (confirm("Supprimer cet article ?")) deleteItem.mutate(id);
      }}
      onCreateItem={() => setCreatingItem(true)}
      onOpenPurchaseOrder={() => setPurchaseOrderOpen(true)}
      onRefresh={refresh}
    >
      {creatingItem && (
        <ItemFormDialog
          categories={data.categories}
          onClose={() => setCreatingItem(false)}
          onSaved={() => {
            setCreatingItem(false);
            refresh();
          }}
        />
      )}
      <PurchaseOrderDialog
        open={purchaseOrderOpen}
        onOpenChange={setPurchaseOrderOpen}
        items={data.items}
        categories={data.categories}
      />
    </InventoryContent>
  );
}

function InventoryContent({
  data,
  openCategories,
  onToggleCategory,
  onAdjust,
  onDelete,
  onCreateItem,
  onOpenPurchaseOrder,
  onRefresh,
  children,
}: {
  data: InventoryData;
  openCategories: Record<string, boolean>;
  onToggleCategory: (categoryId: string) => void;
  onAdjust: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
  onCreateItem: () => void;
  onOpenPurchaseOrder: () => void;
  onRefresh: () => void;
  children?: React.ReactNode;
}) {
  const isOwner = canWrite(data.role, "inventory");
  const sortedCategories = [...data.categories].sort((a, b) => a.sort_order - b.sort_order);
  const lowCount = lowStockCount(data.items);
  const value = stockValue(data.items);
  const activeSuppliers = data.suppliers.filter((s) => s.status === "active").length;

  const stats = [
    {
      label: "Alertes stock bas",
      value: String(lowCount),
      sub: "à réapprovisionner",
      icon: AlertTriangle,
      tone: "text-destructive bg-destructive/10",
    },
    {
      label: "Valeur du stock",
      value: formatPrice(Math.round(value)),
      sub: "stock actuel",
      icon: Coins,
      tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400",
    },
    {
      label: "Livraisons en attente",
      value: String(data.deliveries.length),
      sub: "en route",
      icon: Truck,
      tone: "text-primary bg-primary/10",
    },
    {
      label: "Fournisseurs actifs",
      value: String(activeSuppliers),
      sub: `sur ${data.suppliers.length} au total`,
      icon: Users,
      tone: "text-blue-600 bg-blue-500/10 dark:text-blue-400",
    },
  ];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Inventaire</h1>
          <p className="mt-1 text-[13.5px] font-medium text-muted-foreground">
            Suivez vos stocks, seuils d&apos;alerte et fournisseurs en temps réel.
          </p>
        </div>
        {isOwner && (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={onOpenPurchaseOrder}
              className="w-full gap-2 rounded-xl border-border font-bold sm:w-auto"
            >
              <Truck className="size-4" /> Bon de commande
            </Button>
            <Button
              onClick={onCreateItem}
              disabled={sortedCategories.length === 0}
              className="w-full gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
            >
              <Plus className="size-4" /> Article
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm md:p-5"
          >
            <div className="flex items-center gap-2.5">
              <div className={cn("flex size-9 items-center justify-center rounded-[10px]", s.tone)}>
                <s.icon className="size-4" />
              </div>
              <div className="text-[12px] font-bold text-muted-foreground">{s.label}</div>
            </div>
            <div className="mt-2.5 text-[22px] font-extrabold tracking-tight text-foreground">
              {s.value}
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      {sortedCategories.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucune catégorie d'inventaire pour le moment."
          hint="Commencez par créer une catégorie (ex. « Boissons », « Viandes & Protéines »)."
          cta={isOwner ? <AddCategoryDialog onCreated={onRefresh} /> : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="text-[14px] font-extrabold text-foreground">Gestion des stocks</div>
              <div className="flex items-center gap-4">
                {(["in", "low", "out"] as StockStatus[]).map((s) => (
                  <div key={s} className="flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground">
                    <span className={cn("size-2 rounded-full", STATUS_DOT[s])} />
                    {STOCK_STATUS_LABEL[s]}
                  </div>
                ))}
                {isOwner && <AddCategoryDialog onCreated={onRefresh} compact />}
              </div>
            </div>

            <div className="grid grid-cols-[2fr_1fr_1.2fr_1fr_1.1fr] gap-2.5 border-b border-border/70 px-5 py-2.5 text-[10.5px] font-bold tracking-wide text-muted-foreground">
              <div>ARTICLE</div>
              <div>UNITÉ</div>
              <div>STOCK ACTUEL</div>
              <div>SEUIL MIN</div>
              <div className="text-right">STATUT / ACTIONS</div>
            </div>

            {sortedCategories.map((cat) => {
              const items = data.items
                .filter((i) => i.category_id === cat.id)
                .sort((a, b) => a.name.localeCompare(b.name));
              const isOpen = openCategories[cat.id] ?? true;
              return (
                <div key={cat.id}>
                  <div
                    className="grid cursor-pointer grid-cols-[2fr_1fr_1.2fr_1fr_1.1fr] items-center gap-2.5 bg-muted/40 px-5 py-3 border-b border-border/70"
                    onClick={() => onToggleCategory(cat.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex size-5 items-center justify-center text-muted-foreground transition-transform"
                        style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                      >
                        <ChevronRight className="size-3.5" />
                      </span>
                      <span className="text-[13.5px] font-extrabold text-foreground">{cat.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">
                        {items.length} article{items.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>
                  {isOpen &&
                    items.map((item, i) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        isLast={i === items.length - 1}
                        canEdit={isOwner}
                        onAdjust={onAdjust}
                        onDelete={onDelete}
                      />
                    ))}
                  {isOpen && items.length === 0 && (
                    <div className="px-5 py-4 text-center text-[12.5px] text-muted-foreground">
                      Aucun article dans cette catégorie.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-5">
            <SuppliersPanel data={data} onRefresh={onRefresh} isOwner={isOwner} />
            <DeliveriesPanel data={data} />
            <RecipeLinkCard />
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

function ItemRow({
  item,
  isLast,
  canEdit,
  onAdjust,
  onDelete,
}: {
  item: InventoryItem;
  isLast: boolean;
  canEdit: boolean;
  onAdjust: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
}) {
  const status = statusOf(item);
  return (
    <div
      className={cn(
        "grid grid-cols-[2fr_1fr_1.2fr_1fr_1.1fr] items-center gap-2.5 px-5 py-3",
        !isLast && "border-b border-border/50",
      )}
    >
      <div className="pl-7 text-[13.5px] font-semibold text-foreground">{item.name}</div>
      <div className="text-[12.5px] text-muted-foreground">{item.unit}</div>
      <div
        className={cn(
          "text-[13px] font-bold",
          status === "in" && "text-foreground",
          status === "low" && "text-amber-600 dark:text-amber-400",
          status === "out" && "text-destructive",
        )}
      >
        {item.stock} {item.unit}
      </div>
      <div className="text-[12.5px] text-muted-foreground">
        {item.min_threshold} {item.unit}
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", STATUS_CLASSES[status])}>
          {STOCK_STATUS_LABEL[status]}
        </span>
        {canEdit && (
          <>
            <button
              type="button"
              aria-label={`Diminuer le stock de ${item.name}`}
              onClick={() => onAdjust(item.id, -1)}
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
            >
              <Minus className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Augmenter le stock de ${item.name}`}
              onClick={() => onAdjust(item.id, 1)}
              className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
            >
              <Plus className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Supprimer ${item.name}`}
              onClick={() => onDelete(item.id)}
              className="flex size-7 items-center justify-center rounded-lg text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SuppliersPanel({
  data,
  onRefresh,
  isOwner,
}: {
  data: InventoryData;
  onRefresh: () => void;
  isOwner: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[14px] font-extrabold text-foreground">Fournisseurs</div>
        {isOwner && <AddSupplierDialog onCreated={onRefresh} />}
      </div>
      <div className="flex flex-col gap-3">
        {data.suppliers.length === 0 && (
          <p className="text-[12.5px] text-muted-foreground">Aucun fournisseur enregistré.</p>
        )}
        {data.suppliers.map((v) => {
          const initials = v.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const good = v.status === "active";
          return (
            <div key={v.id} className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary/10 text-[13px] font-extrabold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-foreground">{v.name}</div>
                <div className="text-[11.5px] text-muted-foreground">{v.category}</div>
              </div>
              <span
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold",
                  good
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                )}
              >
                {good ? "Actif" : "À relancer"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeliveriesPanel({ data }: { data: InventoryData }) {
  const supplierName = (id: string | null) =>
    data.suppliers.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[14px] font-extrabold text-foreground">Livraisons à venir</div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
          {data.deliveries.length} en cours
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {data.deliveries.length === 0 && (
          <p className="text-[12.5px] text-muted-foreground">Aucune livraison prévue.</p>
        )}
        {data.deliveries.map((d) => (
          <div key={d.id} className="flex items-center gap-3">
            <span className={cn("size-2 shrink-0 rounded-full", d.urgent ? "bg-destructive" : "bg-primary")} />
            <div className="flex-1">
              <div className="text-[12.5px] font-bold text-foreground">{d.label}</div>
              <div className="text-[11px] text-muted-foreground">{supplierName(d.supplier_id)}</div>
            </div>
            <div className="text-[11.5px] font-bold text-muted-foreground">{formatEta(d.eta_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecipeLinkCard() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-5">
      <div className="text-[13px] font-extrabold text-primary">Liaison recettes</div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
        Chaque commande déduit automatiquement les ingrédients. Ex : 1 Taco Al Pastor = 120g porc, 2
        tortillas, 30g oignon.
      </p>
      <Link
        href="/dashboard/menu"
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary"
      >
        Configurer <ChevronRight className="size-3.5" />
      </Link>
      <Link
        href="/dashboard/inventory/variances"
        className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-foreground hover:text-foreground"
      >
        Voir les écarts de stock <ChevronRight className="size-3" />
      </Link>
    </div>
  );
}

function AddCategoryDialog({
  onCreated,
  compact,
}: {
  onCreated: () => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await postJson("/api/dashboard/inventory/categories", { name: name.trim() });
    setSaving(false);
    if (!res.ok) {
      toast.error("Création impossible");
      return;
    }
    setName("");
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {compact ? (
          <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg font-bold text-muted-foreground hover:bg-muted">
            <Plus className="size-3.5" /> Catégorie
          </Button>
        ) : (
          <Button className="w-full gap-2 rounded-xl border border-border bg-card font-bold text-foreground shadow-sm hover:bg-muted sm:w-auto">
            <Plus className="size-4" /> Nouvelle catégorie
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="overflow-hidden rounded-2xl border-border bg-card p-0 text-foreground shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5">
          <DialogTitle className="font-display text-xl font-bold">Nouvelle catégorie</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="inv-cat-name" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              Nom de la catégorie
            </Label>
            <Input
              id="inv-cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Boissons, Viandes & Protéines…"
              className="h-12 rounded-xl border-border bg-background text-[14px] font-medium shadow-sm placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
          <Button variant="ghost" className="rounded-xl font-bold hover:bg-muted" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button className="rounded-xl px-6 font-bold" onClick={save} disabled={saving || !name.trim()}>
            {saving ? "Création…" : "Créer la catégorie"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddSupplierDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !category.trim()) return;
    setSaving(true);
    const res = await postJson("/api/dashboard/inventory/suppliers", {
      name: name.trim(),
      category: category.trim(),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Création impossible");
      return;
    }
    setName("");
    setCategory("");
    setOpen(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 rounded-lg font-bold text-muted-foreground hover:bg-muted">
          <Plus className="size-3.5" /> Ajouter
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden rounded-2xl border-border bg-card p-0 text-foreground shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5">
          <DialogTitle className="font-display text-xl font-bold">Nouveau fournisseur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="sup-name" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              Nom
            </Label>
            <Input
              id="sup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Ferme Bellevue"
              className="h-12 rounded-xl border-border bg-background text-[14px] font-medium shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-cat" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              Catégorie fournie
            </Label>
            <Input
              id="sup-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Légumes & frais"
              className="h-12 rounded-xl border-border bg-background text-[14px] font-medium shadow-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
          <Button variant="ghost" className="rounded-xl font-bold hover:bg-muted" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button
            className="rounded-xl px-6 font-bold"
            onClick={save}
            disabled={saving || !name.trim() || !category.trim()}
          >
            {saving ? "Création…" : "Créer le fournisseur"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ItemFormDialog({
  categories,
  onClose,
  onSaved,
}: {
  categories: InventoryCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sort_order - b.sort_order),
    [categories],
  );
  const [categoryId, setCategoryId] = useState(sorted[0]?.id ?? "");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [stock, setStock] = useState("0");
  const [minThreshold, setMinThreshold] = useState("0");
  const [unitPrice, setUnitPrice] = useState("0");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !unit.trim() || !categoryId) return;
    setSaving(true);
    const res = await postJson("/api/dashboard/inventory", {
      category_id: categoryId,
      name: name.trim(),
      unit: unit.trim(),
      stock: Number(stock) || 0,
      min_threshold: Number(minThreshold) || 0,
      unit_price_mad: Number(unitPrice) || 0,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Création impossible");
      return;
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="overflow-hidden rounded-2xl border-border bg-card p-0 text-foreground shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5">
          <DialogTitle className="font-display text-xl font-bold">Nouvel article</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-6">
          <div className="space-y-2">
            <Label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              Catégorie
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-12 w-full rounded-xl border-border bg-background text-[14px] font-medium">
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {sorted.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-name" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
              Nom de l&apos;article
            </Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Tomates"
              className="h-12 rounded-xl border-border bg-background text-[14px] font-medium shadow-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-unit" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Unité
              </Label>
              <Input
                id="item-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, Litres…"
                className="h-12 rounded-xl border-border bg-background text-[14px] font-medium shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Prix unitaire (MAD)
              </Label>
              <Input
                id="item-price"
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="h-12 rounded-xl border-border bg-background text-[14px] font-medium shadow-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-stock" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Stock initial
              </Label>
              <Input
                id="item-stock"
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="h-12 rounded-xl border-border bg-background text-[14px] font-medium shadow-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-min" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                Seuil minimum
              </Label>
              <Input
                id="item-min"
                type="number"
                min={0}
                value={minThreshold}
                onChange={(e) => setMinThreshold(e.target.value)}
                className="h-12 rounded-xl border-border bg-background text-[14px] font-medium shadow-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
          <Button variant="ghost" className="rounded-xl font-bold hover:bg-muted" onClick={onClose}>
            Annuler
          </Button>
          <Button
            className="rounded-xl px-6 font-bold"
            onClick={save}
            disabled={saving || !name.trim() || !unit.trim() || !categoryId}
          >
            {saving ? "Création…" : "Créer l'article"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseOrderDialog({
  open,
  onOpenChange,
  items,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  categories: InventoryCategory[];
}) {
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";
  const toReorder = items.filter((i) => statusOf(i) !== "in");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-2xl border-border bg-card p-0 text-foreground shadow-2xl sm:max-w-lg">
        <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5">
          <DialogTitle className="font-display text-xl font-bold">Bon de commande</DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-y-auto p-6">
          {toReorder.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Tous les articles sont au-dessus de leur seuil minimum.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {toReorder.map((item) => {
                const status = statusOf(item);
                const toBuy = Math.max(item.min_threshold - item.stock, item.min_threshold);
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-4 py-3"
                  >
                    <div>
                      <div className="text-[13px] font-bold text-foreground">{item.name}</div>
                      <div className="text-[11.5px] text-muted-foreground">{categoryName(item.category_id)}</div>
                    </div>
                    <div className="text-right">
                      <span className={cn("rounded-full px-2.5 py-1 text-[10.5px] font-bold", STATUS_CLASSES[status])}>
                        {STOCK_STATUS_LABEL[status]}
                      </span>
                      <div className="mt-1 text-[11.5px] font-semibold text-muted-foreground">
                        Suggéré : {toBuy} {item.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 border-t border-border bg-muted/20 px-6 py-4">
          <Button className="rounded-xl px-6 font-bold" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
