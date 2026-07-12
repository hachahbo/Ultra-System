"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";
import { staffSchema, type StaffInput } from "@/lib/schemas";

type StaffMember = {
  id: string;
  email: string;
  created_at: string;
  consented_at: string | null;
};

async function fetchStaff(): Promise<StaffMember[]> {
  const res = await fetch("/api/dashboard/staff");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).staff;
}

export function StaffManagement() {
  const queryClient = useQueryClient();
  const { data: staff, isPending } = useQuery({ queryKey: ["staff"], queryFn: fetchStaff });
  const [open, setOpen] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: refresh,
    onError: () => toast.error("Suppression impossible"),
  });

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Personnel</h2>
          <p className="text-sm text-muted-foreground">
            Accès limité aux commandes et réservations.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="size-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <AddStaffForm onCreated={() => { setOpen(false); refresh(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 space-y-2">
        {isPending && (
          <p className="py-4 text-center text-sm text-muted-foreground">Chargement…</p>
        )}
        {!isPending && (staff?.length ?? 0) === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aucun membre du personnel pour le moment.
          </p>
        )}
        {staff?.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.email}</p>
              <p className="text-xs text-muted-foreground">
                Ajouté le {formatDateTime(s.created_at)}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Retirer ${s.email}`}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Retirer {s.email} ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette personne perdra immédiatement l&apos;accès au tableau de bord.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removeStaff.mutate(s.id)}>
                    Retirer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddStaffForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const form = useForm<StaffInput>({
    resolver: zodResolver(staffSchema),
    defaultValues: { email: "", password: "", consent: false },
  });
  const errors = form.formState.errors;

  async function onSubmit(values: StaffInput) {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        toast.error(body?.error ?? "Création impossible");
        return;
      }
      toast.success("Membre du personnel ajouté");
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Ajouter un membre</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="staff-email">Email</Label>
          <Input id="staff-email" type="email" {...form.register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-password">Mot de passe temporaire</Label>
          <Input id="staff-password" type="text" {...form.register("password")} />
          <p className="text-xs text-muted-foreground">
            La personne devra le changer à sa première connexion.
          </p>
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox
            checked={form.watch("consent") === true}
            onCheckedChange={(v) => form.setValue("consent", v === true)}
            className="mt-0.5"
          />
          <span>
            Ce membre du personnel a consenti à la création de ce compte.
          </span>
        </label>
        {errors.consent && (
          <p className="-mt-2 text-sm text-destructive">{errors.consent.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={saving}>
          <Plus className="size-4" /> {saving ? "Création…" : "Créer le compte"}
        </Button>
      </form>
    </>
  );
}
