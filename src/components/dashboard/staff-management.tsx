"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreVertical, Plus, Search, Trash2, UserPlus, UserX, UserCheck, Mail, Lock, RefreshCw, Eye, EyeOff, ShieldCheck, Shield, Coffee, ChefHat, Check, Users } from "lucide-react";
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
  const t = useTranslations("Staff");
  const tl = useTranslations("Labels");
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
        throw new Error(body?.error ?? t("updateFailed"));
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
        throw new Error(body?.error ?? t("deleteFailed"));
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
    <div className="flex flex-col gap-5">
      {/* Top Header Card */}
      <div className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shadow-2xs shrink-0">
              <Users className="size-6 stroke-[2.25]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground leading-tight">{t("title")}</h2>
              <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                {t("subtitle")}
              </p>
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto gap-2 rounded-2xl bg-primary px-5 py-2.5 h-11 text-xs font-extrabold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary/90 cursor-pointer active:scale-[0.98]">
                <UserPlus className="size-4 stroke-[2.5]" /> {t("invite")}
              </Button>
            </DialogTrigger>
            <DialogContent className="overflow-hidden rounded-3xl border-border/80 bg-card/98 backdrop-blur-2xl p-0 text-foreground shadow-2xl sm:max-w-md md:max-w-lg">
              <AddStaffForm onCreated={() => { setOpen(false); refresh(); }} />
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border/60">
          <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 shrink-0">
              <Users className="size-5" />
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Total Membres</span>
              <span className="text-lg font-black text-foreground tabular-nums">{staff?.length ?? 0}</span>
            </div>
          </div>

          <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
              <Shield className="size-5" />
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Managers</span>
              <span className="text-lg font-black text-foreground tabular-nums">
                {staff?.filter((m) => m.role === "manager").length ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <Coffee className="size-5" />
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Serveurs</span>
              <span className="text-lg font-black text-foreground tabular-nums">
                {staff?.filter((m) => m.role === "serveur").length ?? 0}
              </span>
            </div>
          </div>

          <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/20 shrink-0">
              <ChefHat className="size-5" />
            </div>
            <div>
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">Cuisine</span>
              <span className="text-lg font-black text-foreground tabular-nums">
                {staff?.filter((m) => m.role === "cuisine").length ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Role Filter Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10.5 rounded-2xl border-border/80 bg-card pl-10 text-xs font-medium focus-visible:ring-primary/30 shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRoleFilter("all")}
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
              roleFilter === "all"
                ? "border-primary/50 bg-primary/15 text-primary ring-2 ring-primary/20"
                : "border-border/80 bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            <span>{t("all")}</span>
            <Badge variant="outline" className="text-[9.5px] font-extrabold px-1.5 py-0 bg-muted/60">{staff?.length ?? 0}</Badge>
          </button>

          {ASSIGNABLE_ROLES.map((r) => {
            const count = staff?.filter((m) => m.role === r).length ?? 0;
            const RoleIcon = r === "manager" ? Shield : r === "serveur" ? Coffee : ChefHat;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs",
                  roleFilter === r && r === "manager" && "border-purple-500/50 bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/20",
                  roleFilter === r && r === "serveur" && "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20",
                  roleFilter === r && r === "cuisine" && "border-orange-500/50 bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/20",
                  roleFilter !== r && "border-border/80 bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                <RoleIcon className="size-3.5" />
                <span>{tl(ROLE_LABELS[r])}</span>
                <Badge variant="outline" className="text-[9.5px] font-extrabold px-1.5 py-0 bg-muted/60">{count}</Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Datatable */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card/95 shadow-sm">
        <div className="hidden grid-cols-[2.4fr_1.2fr_1fr_1.3fr_44px] gap-4 border-b border-border/60 bg-muted/30 px-6 py-3.5 md:grid">
          <div className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colUser")}</div>
          <div className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colRole")}</div>
          <div className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colStatus")}</div>
          <div className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colAddedOn")}</div>
          <div className="text-right text-[10.5px] font-black uppercase tracking-wider text-muted-foreground">{t("colActions")}</div>
        </div>

        {isPending && (
          <p className="py-12 text-center text-xs font-semibold text-muted-foreground">{t("loading")}</p>
        )}
        {!isPending && (staff?.length ?? 0) === 0 && (
          <p className="py-14 text-center text-xs font-semibold text-muted-foreground">
            {t("noStaff")}
          </p>
        )}
        {!isPending && (staff?.length ?? 0) > 0 && filtered.length === 0 && (
          <p className="py-14 text-center text-xs font-semibold text-muted-foreground">
            {t("noMatch")}
          </p>
        )}

        {filtered.map((s) => {
          const name = displayNameOf(s.email);
          const colors = ROLE_COLORS[s.role];
          const RoleIcon = s.role === "manager" ? Shield : s.role === "serveur" ? Coffee : ChefHat;

          return (
            <div
              key={s.id}
              className={cn(
                "relative flex flex-col gap-3 border-b border-border/60 p-4.5 last:border-b-0 transition-colors hover:bg-muted/20",
                "md:grid md:grid-cols-[2.4fr_1.2fr_1fr_1.3fr_44px] md:items-center md:gap-4 md:p-0 md:px-6 md:py-3.5",
                !s.active && "opacity-60",
              )}
            >
              <div className="flex min-w-0 items-center gap-3.5 pr-10 md:pr-0">
                <div
                  className={cn(
                    "flex size-10.5 shrink-0 items-center justify-center rounded-2xl text-xs font-black border shadow-2xs",
                    colors.bg,
                    colors.text,
                    "border-current/20"
                  )}
                >
                  {initialsOf(name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-extrabold text-foreground">{name}</p>
                  <p className="truncate text-[11.5px] font-semibold text-muted-foreground">{s.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground md:hidden">{t("colRole")}</span>
                <Badge className={cn("rounded-xl font-extrabold text-[11px] gap-1 px-2.5 py-1 border shadow-2xs", colors.bg, colors.text, "border-current/20")}>
                  <RoleIcon className="size-3" />
                  {tl(ROLE_LABELS[s.role])}
                </Badge>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground md:hidden">{t("colStatus")}</span>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-extrabold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      s.active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                    )}
                  />
                  <span>{s.active ? t("active") : t("inactive")}</span>
                </div>
              </div>

              <div className="flex items-center justify-between md:block">
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-muted-foreground md:hidden">{t("colAddedOn")}</span>
                <span className="text-xs font-semibold text-muted-foreground">{formatDateTime(s.created_at)}</span>
              </div>

              <div className="absolute right-3.5 top-3.5 flex justify-end md:static md:right-auto md:top-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={t("actionsFor", { email: s.email })}
                      className="flex size-8 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-2xl border-border/80 p-1.5 shadow-xl">
                    <DropdownMenuLabel className="text-[10.5px] font-black uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                      {t("colRole")}
                    </DropdownMenuLabel>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <DropdownMenuItem
                        key={r}
                        disabled={s.role === r}
                        onClick={() => patchStaff.mutate({ id: s.id, role: r })}
                        className="gap-2.5 text-xs font-bold rounded-xl cursor-pointer py-2"
                      >
                        <span className={cn("size-2 rounded-full", ROLE_COLORS[r].dot)} />
                        {tl(ROLE_LABELS[r])}
                        {s.role === r && <span className="ml-auto text-[10px] font-extrabold text-muted-foreground">{t("current")}</span>}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => patchStaff.mutate({ id: s.id, active: !s.active })}
                      className="gap-2.5 text-xs font-bold rounded-xl cursor-pointer py-2"
                    >
                      {s.active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                      {s.active ? t("deactivate") : t("activate")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setRemoving(s)}
                      className="gap-2.5 text-xs font-bold rounded-xl cursor-pointer py-2 text-destructive focus:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                      {t("remove")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}

        {!isPending && (staff?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-muted/20 border-t border-border/60 text-xs font-bold text-muted-foreground">
            <div>
              {t("memberCount", { count: staff!.length })}
            </div>
            <div className="flex flex-wrap gap-4">
              {roleTally.map((rt) => (
                <div key={rt.role} className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", ROLE_COLORS[rt.role].dot)} />
                  {rt.count} {tl(ROLE_LABELS[rt.role])}
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
              {t("confirmRemove", { email: removing?.email ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px] text-muted-foreground">
              {t("removeText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl font-bold hover:bg-muted">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removing && removeStaff.mutate(removing.id)}
              className="rounded-xl bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90"
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddStaffForm({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations("Staff");
  const tl = useTranslations("Labels");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<StaffInput>({
    resolver: zodResolver(staffSchema),
    defaultValues: { email: "", password: "", role: "serveur", consent: false },
  });
  const errors = form.formState.errors;
  const role = form.watch("role");

  const generatePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "";
    for (let i = 0; i < 9; i++) pass += chars[Math.floor(Math.random() * chars.length)];
    form.setValue("password", pass, { shouldValidate: true });
    toast.success("Mot de passe temporaire généré !");
  };

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
        toast.error(body?.error ?? t("createFailed"));
        return;
      }
      toast.success(t("staffAdded"));
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader className="border-b border-border/60 bg-muted/20 px-6 py-5">
        <DialogTitle className="flex items-center gap-3 font-display">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shadow-xs shrink-0">
            <UserPlus className="size-5.5 stroke-[2.25]" />
          </div>
          <div>
            <h3 className="text-xl font-black text-foreground leading-none">{t("invite")}</h3>
            <p className="text-xs font-semibold text-muted-foreground mt-1.5">
              Ajoutez un membre du personnel et attribuez son rôle d&apos;accès.
            </p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4.5 p-6 sm:p-7" noValidate>
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="staff-email" className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            {t("email")}
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="staff-email"
              type="email"
              placeholder={t("emailPlaceholder")}
              className="h-11.5 rounded-2xl border-border/80 bg-background/50 pl-10 text-[13.5px] font-semibold focus-visible:ring-primary/30 shadow-2xs"
              {...form.register("email")}
            />
          </div>
          {errors.email && (
            <p className="text-xs font-bold text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Role Selector Cards */}
        <div className="space-y-2">
          <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
            {t("role")}
          </Label>
          <div className="grid grid-cols-3 gap-2.5">
            {ASSIGNABLE_ROLES.map((r) => {
              const active = role === r;
              const RoleIcon = r === "manager" ? Shield : r === "serveur" ? Coffee : ChefHat;

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => form.setValue("role", r)}
                  className={cn(
                    "relative flex flex-col items-center justify-between gap-2.5 rounded-2xl border p-3.5 text-xs font-extrabold transition-all cursor-pointer shadow-2xs hover:shadow-xs group",
                    active && r === "manager" && "border-purple-500/50 bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-2 ring-purple-500/25",
                    active && r === "serveur" && "border-emerald-500/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/25",
                    active && r === "cuisine" && "border-orange-500/50 bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500/25",
                    !active && "border-border/80 bg-card/60 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex size-9 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                      r === "manager" && (active ? "bg-purple-500/25 text-purple-500" : "bg-purple-500/10 text-purple-500/80"),
                      r === "serveur" && (active ? "bg-emerald-500/25 text-emerald-500" : "bg-emerald-500/10 text-emerald-500/80"),
                      r === "cuisine" && (active ? "bg-orange-500/25 text-orange-500" : "bg-orange-500/10 text-orange-500/80")
                    )}
                  >
                    <RoleIcon className="size-4.5 stroke-[2.25]" />
                  </div>
                  <span className="font-extrabold text-[12.5px]">{tl(ROLE_LABELS[r])}</span>
                  {active && (
                    <span className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-foreground text-background">
                      <Check className="size-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Temporary Password Field with Generator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="staff-password" className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              {t("tempPassword")}
            </Label>
            <button
              type="button"
              onClick={generatePassword}
              className="text-[11px] font-extrabold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="size-3" /> Générer
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="staff-password"
              type={showPassword ? "text" : "password"}
              className="h-11.5 rounded-2xl border-border/80 bg-background/50 pl-10 pr-10 text-[13.5px] font-semibold focus-visible:ring-primary/30 shadow-2xs"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-[11.5px] font-medium text-muted-foreground">
            {t("tempPasswordHint")}
          </p>
          {errors.password && (
            <p className="text-xs font-bold text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Consent Card */}
        <div className="bg-muted/30 border border-border/60 rounded-2xl p-3.5 space-y-1 transition-all">
          <label className="flex items-start gap-3 text-xs font-semibold text-foreground cursor-pointer">
            <Checkbox
              checked={form.watch("consent") === true}
              onCheckedChange={(v) => form.setValue("consent", v === true)}
              className="mt-0.5"
            />
            <span className="leading-relaxed flex-1">
              {t("consentText")}
            </span>
          </label>
        </div>
        {errors.consent && (
          <p className="text-xs font-bold text-destructive">{errors.consent.message}</p>
        )}

        <Button
          type="submit"
          className="w-full rounded-2xl font-extrabold h-11.5 text-sm gap-2 bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 transition-all cursor-pointer active:scale-[0.98]"
          disabled={saving}
        >
          <Plus className="size-4 stroke-[2.5]" /> {saving ? t("creating") : t("sendInvite")}
        </Button>
      </form>
    </>
  );
}
