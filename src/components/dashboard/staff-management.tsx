"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreVertical, Plus, Search, Trash2, UserPlus, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LaborPanel } from "@/components/dashboard/labor-panel";
import { initialsOf } from "@/lib/avatar";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { staffSchema, type StaffInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

// Roles an owner may assign — never 'owner' itself.
const ASSIGNABLE_ROLES: Extract<Role, "manager" | "serveur" | "cuisine">[] = [
  "manager",
  "serveur",
  "cuisine",
];

const ROLE_COLORS: Record<Role, { text: string; bg: string; dot: string; ring: string }> = {
  owner: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    dot: "bg-red-500",
    ring: "ring-red-500",
  },
  manager: {
    text: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10",
    dot: "bg-purple-500",
    ring: "ring-purple-500",
  },
  serveur: {
    text: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500",
  },
  cuisine: {
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-500/10",
    dot: "bg-orange-500",
    ring: "ring-orange-500",
  },
};

type TeamMember = {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
  consented_at: string | null;
  hourly_rate_mad: number | null;
};

async function fetchStaff(): Promise<TeamMember[]> {
  const res = await fetch("/api/dashboard/staff");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).staff;
}

// We only store email, not a display name — derive one the way the invite
// form does ("prenom.nom@..." -> "Prenom Nom") for the avatar/name column.
function displayNameOf(email: string) {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StaffManagement() {
  const queryClient = useQueryClient();
  const { data: staff, isPending } = useQuery({ queryKey: ["staff"], queryFn: fetchStaff });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [removing, setRemoving] = useState<TeamMember | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const patchStaff = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; role?: Role; active?: boolean }) => {
      const res = await fetch(`/api/dashboard/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Mise à jour impossible");
      }
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeStaff = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dashboard/staff/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Suppression impossible");
      }
    },
    onSuccess: () => {
      refresh();
      setRemoving(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (staff ?? []).filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!q) return true;
      return m.email.toLowerCase().includes(q) || displayNameOf(m.email).toLowerCase().includes(q);
    });
  }, [staff, query, roleFilter]);

  const roleTally = useMemo(() => {
    const counts: Partial<Record<Role, number>> = {};
    for (const m of staff ?? []) counts[m.role] = (counts[m.role] ?? 0) + 1;
    return ASSIGNABLE_ROLES.filter((r) => counts[r]).map((r) => ({
      role: r,
      count: counts[r]!,
    }));
  }, [staff]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-[15px] font-extrabold text-foreground">Équipe</div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">
              Manager, Serveur, Cuisine — accès limité selon le rôle.
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl font-bold">
                <UserPlus className="size-4" /> Inviter un membre
              </Button>
            </DialogTrigger>
            <DialogContent className="overflow-hidden rounded-2xl border-border bg-card p-0 text-foreground shadow-2xl sm:max-w-sm">
              <AddStaffForm onCreated={() => { setOpen(false); refresh(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + role filter chips */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-[320px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un membre…"
            className="h-10 rounded-[11px] border-border bg-card pl-10 text-[13px]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={cn(
              "rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold transition-colors",
              roleFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            Tous
          </button>
          {ASSIGNABLE_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={cn(
                "rounded-[10px] px-3.5 py-2 text-[12.5px] font-bold transition-colors",
                roleFilter === r
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Datatable */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-[2.4fr_1.1fr_1fr_1.3fr_44px] gap-4 border-b border-border bg-muted/30 px-6 py-3.5">
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground">UTILISATEUR</div>
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground">RÔLE</div>
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground">STATUT</div>
          <div className="text-[11px] font-bold tracking-wider text-muted-foreground">AJOUTÉ LE</div>
          <div className="text-right text-[11px] font-bold tracking-wider text-muted-foreground">ACTIONS</div>
        </div>

        {isPending && (
          <p className="py-10 text-center text-[13px] text-muted-foreground">Chargement…</p>
        )}
        {!isPending && (staff?.length ?? 0) === 0 && (
          <p className="py-12 text-center text-[13.5px] text-muted-foreground">
            Aucun membre du personnel pour le moment.
          </p>
        )}
        {!isPending && (staff?.length ?? 0) > 0 && filtered.length === 0 && (
          <p className="py-12 text-center text-[13.5px] text-muted-foreground">
            Aucun membre ne correspond à votre recherche.
          </p>
        )}

        {filtered.map((s) => {
          const name = displayNameOf(s.email);
          const colors = ROLE_COLORS[s.role];
          return (
            <div
              key={s.id}
              className={cn(
                "grid grid-cols-[2.4fr_1.1fr_1fr_1.3fr_44px] items-center gap-4 border-b border-border px-6 py-3.5 last:border-b-0",
                !s.active && "opacity-60",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold",
                    colors.bg,
                    colors.text,
                  )}
                >
                  {initialsOf(name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-bold text-foreground">{name}</p>
                  <p className="truncate text-[12.5px] text-muted-foreground">{s.email}</p>
                </div>
              </div>

              <div>
                <Badge className={cn("rounded-full font-bold", colors.bg, colors.text)}>
                  {ROLE_LABELS[s.role]}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-2 rounded-full ring-3",
                    s.active ? "bg-emerald-500 ring-emerald-500/20" : "bg-muted-foreground ring-muted-foreground/20",
                  )}
                />
                <span className={cn("text-[13px] font-semibold", s.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                  {s.active ? "Actif" : "Inactif"}
                </span>
              </div>

              <div className="text-[13px] text-muted-foreground">{formatDateTime(s.created_at)}</div>

              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Actions pour ${s.email}`}
                      className="flex size-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-[11px] font-bold tracking-wider text-muted-foreground">
                      RÔLE
                    </DropdownMenuLabel>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <DropdownMenuItem
                        key={r}
                        disabled={s.role === r}
                        onClick={() => patchStaff.mutate({ id: s.id, role: r })}
                        className="gap-2.5 text-[13px] font-semibold"
                      >
                        <span className={cn("size-2 rounded-full", ROLE_COLORS[r].dot)} />
                        {ROLE_LABELS[r]}
                        {s.role === r && <span className="ml-auto text-[11px] text-muted-foreground">Actuel</span>}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => patchStaff.mutate({ id: s.id, active: !s.active })}
                      className="gap-2.5 text-[13px] font-semibold"
                    >
                      {s.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                      {s.active ? "Désactiver" : "Activer"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setRemoving(s)}
                      className="gap-2.5 text-[13px] font-semibold"
                    >
                      <Trash2 className="size-4" />
                      Retirer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {!isPending && (staff?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 text-[12.5px] text-muted-foreground">
            <div>
              {staff!.length} membre{staff!.length > 1 ? "s" : ""} au total
            </div>
            <div className="flex flex-wrap gap-4">
              {roleTally.map((t) => (
                <div key={t.role} className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", ROLE_COLORS[t.role].dot)} />
                  {t.count} {ROLE_LABELS[t.role]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <LaborPanel staff={staff ?? []} />

      <AlertDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <AlertDialogContent className="rounded-2xl border-border bg-card shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">
              Retirer {removing?.email} ?
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
              onClick={() => removing && removeStaff.mutate(removing.id)}
              className="rounded-xl bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddStaffForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const form = useForm<StaffInput>({
    resolver: zodResolver(staffSchema),
    defaultValues: { email: "", password: "", role: "serveur", consent: false },
  });
  const errors = form.formState.errors;
  const role = form.watch("role");

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
        <DialogTitle className="font-display text-xl font-bold">Inviter un membre</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6" noValidate>
        <div className="space-y-2">
          <Label htmlFor="staff-email" className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            Email
          </Label>
          <Input
            id="staff-email"
            type="email"
            placeholder="prenom@votre-restaurant.ma"
            className="h-11 rounded-[11px] border-border bg-background text-[13.5px]"
            {...form.register("email")}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
            Rôle
          </Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ASSIGNABLE_ROLES.map((r) => {
              const colors = ROLE_COLORS[r];
              const active = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => form.setValue("role", r)}
                  className={cn(
                    "flex items-center gap-2 rounded-[11px] border px-3 py-2.5 text-[12.5px] font-bold transition-colors",
                    active
                      ? cn("border-transparent ring-1", colors.bg, colors.text, colors.ring)
                      : "border-border bg-background text-muted-foreground",
                  )}
                >
                  <span className={cn("size-2 shrink-0 rounded-full", colors.dot)} />
                  {ROLE_LABELS[r]}
                </button>
              );
            })}
          </div>
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
          <Plus className="size-4" /> {saving ? "Création…" : "Envoyer l'invitation"}
        </Button>
      </form>
    </>
  );
}
