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

function initialsOf(email: string) {
  return email.slice(0, 2).toUpperCase();
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
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-[15px] font-extrabold text-foreground">Personnel</div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">
              Accès limité aux commandes et réservations.
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl font-bold">
                <UserPlus className="size-4" /> Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="overflow-hidden rounded-2xl border-border bg-card p-0 text-foreground shadow-2xl sm:max-w-sm">
              <AddStaffForm onCreated={() => { setOpen(false); refresh(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-[15px] font-extrabold text-foreground">Membres de l&apos;équipe</div>
          {!isPending && <span className="text-[12px] font-bold text-muted-foreground">{staff?.length ?? 0} membre{(staff?.length ?? 0) === 1 ? "" : "s"}</span>}
        </div>
        <div className="flex flex-col">
          {isPending && (
            <p className="py-6 text-center text-[13px] text-muted-foreground">Chargement…</p>
          )}
          {!isPending && (staff?.length ?? 0) === 0 && (
            <p className="py-6 text-center text-[13px] text-muted-foreground">
              Aucun membre du personnel pour le moment.
            </p>
          )}
          {staff?.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3.5 border-t border-border py-3.5 first:border-t-0"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-extrabold text-primary">
                {initialsOf(s.email)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-bold text-foreground">{s.email}</p>
                <p className="text-[12px] text-muted-foreground">
                  Ajouté le {formatDateTime(s.created_at)}
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Retirer ${s.email}`}
                    className="flex size-9 items-center justify-center rounded-[9px] border border-border bg-muted/40 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl border-border bg-card shadow-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-xl">
                      Retirer {s.email} ?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[14px] text-muted-foreground">
                      Cette personne perdra immédiatement l&apos;accès au tableau de bord.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-4">
                    <AlertDialogCancel className="rounded-xl font-bold hover:bg-muted">
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => removeStaff.mutate(s.id)}
                      className="rounded-xl bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90"
                    >
                      Retirer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
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
      <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5">
        <DialogTitle className="font-display text-xl font-bold">Ajouter un membre</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6" noValidate>
        <div className="space-y-2">
          <Label htmlFor="staff-email" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            Email
          </Label>
          <Input
            id="staff-email"
            type="email"
            className="h-11 rounded-[11px] border-border bg-background text-[13.5px]"
            {...form.register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="staff-password" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            Mot de passe temporaire
          </Label>
          <Input
            id="staff-password"
            type="text"
            className="h-11 rounded-[11px] border-border bg-background text-[13.5px]"
            {...form.register("password")}
          />
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
        <Button type="submit" className="w-full rounded-xl font-bold" disabled={saving}>
          <Plus className="size-4" /> {saving ? "Création…" : "Créer le compte"}
        </Button>
      </form>
    </>
  );
}
