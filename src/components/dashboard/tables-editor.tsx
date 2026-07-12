"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
    // Optimistic: write the dropped position into the cache immediately so
    // the marker doesn't flash back to its old spot while the request is in
    // flight — refresh() below reconciles with the server's real updated_at
    // once it lands (or rolls back on a 409 conflict).
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

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tables</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Glissez une table pour la repositionner sur le plan.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Table
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <TableForm onSubmit={(v) => create.mutate(v)} saving={create.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 rounded-2xl bg-neutral-50 p-2 shadow-inner dark:bg-neutral-900">
        <FloorPlanMap
          tables={list}
          mode="edit"
          onTableMove={(id, x, y) => {
            const table = list.find((t) => t.id === id);
            if (table) move.mutate({ table, x, y });
          }}
        />
      </div>

      <div className="mt-4 space-y-2">
        {list.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
          >
            <p className="text-sm font-medium">
              Table {t.number} <span className="text-muted-foreground">— {t.seats} places</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Modifier la table ${t.number}`}
                onClick={() => setEditing(t)}
              >
                <Pencil className="size-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Supprimer la table ${t.number}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer la table {t.number} ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le QR code de cette table ne fonctionnera plus.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutate(t.id)}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune table configurée.
          </p>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          {editing && (
            <TableForm
              defaultValues={{ number: editing.number, seats: editing.seats }}
              saving={update.isPending}
              onSubmit={(v) => update.mutate({ ...v, id: editing.id, updated_at: editing.updated_at })}
            />
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-10">
        <QrCards tables={list} restaurantSlug={restaurantSlug} />
      </div>
    </div>
  );
}

function TableForm({
  defaultValues,
  saving,
  onSubmit,
}: {
  defaultValues?: TableInput;
  saving: boolean;
  onSubmit: (values: TableInput) => void;
}) {
  const form = useForm<TableInput>({
    resolver: zodResolver(tableSchema),
    defaultValues: defaultValues ?? { number: "", seats: 2 },
  });
  const errors = form.formState.errors;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{defaultValues ? "Modifier la table" : "Nouvelle table"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="table-number">Numéro</Label>
          <Input id="table-number" {...form.register("number")} />
          {errors.number && (
            <p className="text-sm text-destructive">{errors.number.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="table-seats">Places</Label>
          <Input
            id="table-seats"
            type="number"
            min={1}
            max={30}
            {...form.register("seats", { valueAsNumber: true })}
          />
          {errors.seats && (
            <p className="text-sm text-destructive">{errors.seats.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </>
  );
}
