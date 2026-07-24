"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { QRCodeCanvas } from "qrcode.react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FloorPlanMap } from "@/components/dashboard/floor-plan";
import { QrCards } from "@/components/dashboard/qr-cards";
import { TableTurnoverPanel } from "@/components/dashboard/table-turnover";
import { fetchTables, tablesQueryKey } from "@/lib/tables-query";
import { tableSchema, type TableInput } from "@/lib/schemas";
import type { DiningTable } from "@/lib/types";

export function TablesEditor({ restaurantSlug }: { restaurantSlug: string }) {
  const queryClient = useQueryClient();
  const { data: tables } = useQuery({ queryKey: tablesQueryKey, queryFn: fetchTables });
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<DiningTable | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: tablesQueryKey });

  const move = useMutation({
    mutationFn: async ({ table, x, y }: { table: DiningTable; x: number; y: number }) => {
      const res = await fetch(`/api/dashboard/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pos_x: x, pos_y: y, updated_at: table.updated_at }),
      });
      if (res.status === 409) {
        toast.message("Cette table a été modifiée entre-temps — actualisation");
      } else if (!res.ok) {
        throw new Error("move failed");
      }
    },
    onMutate: async ({ table, x, y }) => {
      await queryClient.cancelQueries({ queryKey: tablesQueryKey });
      const previous = queryClient.getQueryData<DiningTable[]>(tablesQueryKey);
      queryClient.setQueryData<DiningTable[]>(tablesQueryKey, (old) =>
        (old ?? []).map((t) => (t.id === table.id ? { ...t, pos_x: x, pos_y: y } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(tablesQueryKey, context.previous);
      toast.error("Déplacement impossible");
    },
    onSettled: refresh,
  });

  const create = useMutation({
    mutationFn: async (values: TableInput) => {
      const res = await fetch("/api/dashboard/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "create failed");
      }
    },
    onSuccess: () => {
      refresh();
      setAddOpen(false);
    },
    onError: (err: Error) => toast.error(err.message || "Création impossible"),
  });

  const update = useMutation({
    mutationFn: async (values: TableInput & { id: string; updated_at: string }) => {
      const { id, updated_at, ...fields } = values;
      const res = await fetch(`/api/dashboard/tables/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, updated_at }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "update failed");
      }
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message || "Modification impossible"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/tables/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => {
      refresh();
      setEditing(null);
    },
    onError: () => toast.error("Suppression impossible"),
  });

  const list = tables ?? [];
  const totalSeats = list.reduce((sum, t) => sum + t.seats, 0);

  return (
    <div className="w-full space-y-10 pb-20">

      {/* Header section matches Commandes/Menu aesthetic */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Tables & Plan</h1>
          <p className="text-[13.5px] text-muted-foreground mt-1 font-medium">
            Gérez vos tables, générez les QR codes et ajustez le plan de salle.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-primary text-primary-foreground font-bold rounded-full px-6 py-5 hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm gap-2 w-full sm:w-auto"
              >
                <Plus className="size-4" /> Nouvelle table
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card text-foreground shadow-2xl p-0 overflow-hidden rounded-3xl ring-1 ring-border/60 border-none flex flex-col">
              <TableForm
                saving={create.isPending}
                onSubmit={(v) => create.mutate(v)}
                onCancel={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Total Tables</p>
          <p className="text-3xl font-display font-bold text-foreground">{list.length}</p>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <p className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Capacité totale</p>
          <p className="text-3xl font-display font-bold text-primary">{totalSeats} <span className="text-sm text-muted-foreground lowercase tracking-normal font-medium">places</span></p>
        </div>
      </div>

      {/* Rotation des tables (live occupancy + turnover) */}
      <TableTurnoverPanel />

      {/* Floor Plan */}
      <section className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">Plan de salle</h2>
        <div className="rounded-[24px] bg-card border border-border p-2 sm:p-4 shadow-xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
          <div className="relative z-10 w-full overflow-x-auto rounded-xl ring-1 ring-border/50 bg-background/50 backdrop-blur-sm">
            <FloorPlanMap
              tables={list}
              mode="edit"
              onTableTap={(t) => setEditing(t)}
              onTableMove={(id, x, y) => {
                const table = list.find((t) => t.id === id);
                if (table) move.mutate({ table, x, y });
              }}
            />
          </div>
        </div>
      </section>

      {/* Tables List */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">Liste des tables</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((t) => (
            <div
              key={t.id}
              className="group flex flex-col justify-between rounded-[20px] border border-border/60 bg-card p-5 shadow-sm hover:border-border hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary font-display font-bold text-2xl border border-primary/20 shadow-inner">
                  {t.number}
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Modifier la table ${t.number}`}
                    onClick={() => setEditing(t)}
                    className="hover:bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer la table ${t.number}`}
                        className="hover:bg-destructive/10 text-destructive/70 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border shadow-xl rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-xl">Supprimer la table {t.number} ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground text-[14px]">
                          Le QR code de cette table ne fonctionnera plus. Cette action est définitive.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-xl font-bold hover:bg-muted">Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => remove.mutate(t.id)}
                          className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground bg-muted/40 w-fit px-3 py-1.5 rounded-lg border border-border/50">
                <Users className="size-3.5" />
                <span className="text-[13px] font-semibold">{t.seats} places</span>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl bg-card/50">
              <p className="text-[15px] font-bold text-foreground">Aucune table</p>
              <p className="text-[13px] text-muted-foreground mt-1">Créez votre première table pour l'ajouter au plan.</p>
            </div>
          )}
        </div>
      </section>

      {/* QR Codes Section */}
      <section className="animate-in fade-in slide-in-from-bottom-5 duration-500 delay-300">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">Générateur de QR Codes</h2>
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
          <QrCards tables={list} restaurantSlug={restaurantSlug} />
        </div>
      </section>

      {/* Edit Table Modal */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md bg-card text-foreground shadow-2xl p-0 overflow-hidden rounded-3xl ring-1 ring-border/60 border-none flex flex-col">
          {editing && (
            <TableForm
              table={editing}
              restaurantSlug={restaurantSlug}
              saving={update.isPending}
              onSubmit={(v) => update.mutate({ ...v, id: editing.id, updated_at: editing.updated_at })}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TableForm({
  table,
  restaurantSlug,
  saving,
  onSubmit,
  onCancel,
}: {
  table?: DiningTable;
  restaurantSlug?: string;
  saving: boolean;
  onSubmit: (values: TableInput) => void;
  onCancel: () => void;
}) {
  const form = useForm<TableInput>({
    resolver: zodResolver(tableSchema),
    defaultValues: table ? { number: table.number, seats: table.seats } : { number: "", seats: 2 },
  });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
        <DialogTitle className="font-display text-xl font-bold tracking-tight">
          {table ? `Paramètres de la table` : "Nouvelle table"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden" noValidate>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/80 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50">
          
          {table && restaurantSlug && (
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-5 bg-card border border-border shadow-sm rounded-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:12px_12px] pointer-events-none" />
              <div className="shrink-0 bg-white p-2 rounded-xl border shadow-sm relative z-10">
                <QRCodeCanvas
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${restaurantSlug}/menu?table=${encodeURIComponent(table.number)}`}
                  size={512}
                  level="H"
                  style={{ width: "96px", height: "96px" }}
                />
              </div>
              <div className="flex flex-col text-center sm:text-left gap-1.5 relative z-10 w-full justify-center h-[112px]">
                <h3 className="font-display font-bold text-2xl text-foreground mt-1">Table {table.number}</h3>
                <p className="text-[13px] text-muted-foreground font-medium">QR Code de commande pour cette table</p>
                <div className="mt-2 text-[12px] bg-primary/10 text-primary border border-primary/20 font-bold px-3 py-1 rounded-full w-fit mx-auto sm:mx-0">
                  {table.seats} places
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {table && <h4 className="font-display text-sm font-bold text-foreground">Paramètres</h4>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="table-number" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Numéro de table</Label>
                <Input
                  id="table-number"
                  placeholder="Ex: 12, Terasse 1..."
                  className="border-border bg-background h-12 rounded-xl shadow-sm text-[14px] font-medium"
                  {...form.register("number")}
                />
                {errors.number && (
                  <p className="text-[13px] font-medium text-destructive">{errors.number.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="table-seats" className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Nombre de places</Label>
                <Input
                  id="table-seats"
                  type="number"
                  min={1}
                  max={30}
                  className="border-border bg-background h-12 rounded-xl shadow-sm text-[14px] font-medium"
                  {...form.register("seats", { valueAsNumber: true })}
                />
                {errors.seats && (
                  <p className="text-[13px] font-medium text-destructive">{errors.seats.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border/40 bg-card/95 px-6 pb-6 pt-4 backdrop-blur-md flex justify-end gap-3 mt-2">
          <Button type="button" variant="ghost" className="rounded-full font-bold hover:bg-muted" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" className="rounded-full font-bold px-6 bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </>
  );
}
