"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { dateFnsLocale } from "@/lib/date-locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Moon,
  Sun,
  Settings,
  KeyRound,
  LogOut,
  CheckCheck,
  ShoppingBag,
  CalendarDays,
  PartyPopper,
  Globe,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { notifKey, selectNotificationsToToast } from "@/lib/notifications";
import type { NotificationItem } from "@/app/api/dashboard/notifications/route";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch("/api/dashboard/notifications");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).items as NotificationItem[];
}

// Only the newest few pop; the bell carries any overflow. See
// selectNotificationsToToast for why.
const MAX_TOASTS = 3;

const NOTIF_STYLE: Record<NotificationItem["kind"], { icon: LucideIcon; className: string }> = {
  order: { icon: ShoppingBag, className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20" },
  reservation: { icon: CalendarDays, className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20" },
  event_inquiry: { icon: PartyPopper, className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20" },
};

// The header calls the owner "Gérant" rather than ROLE_LABELS' "Admin".
// Message keys into Labels.*, not display text.
const ROLE_HEADER_LABELS: Record<Role, string> = {
  owner: "roleOwnerHeader",
  manager: "roleManager",
  serveur: "roleServeur",
  cuisine: "roleCuisine",
};

export function DashboardHeader({
  restaurantName,
  logoUrl,
  role,
  email,
  restaurantId,
  restaurantSlug,
}: {
  restaurantName: string;
  logoUrl?: string | null;
  role: Role;
  email: string;
  restaurantId: string;
  restaurantSlug?: string;
}) {
  const locale = useLocale();
  const tl = useTranslations("Labels");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ── Notifications ────────────────────────────────────────────────────────
  // Feed is derived server-side from recent orders + pending reservations.
  // "Read" state is per-device: a lastSeen timestamp in localStorage, keyed by
  // restaurant. Unread = items created after lastSeen.
  const storageKey = `notif-last-seen:${restaurantId}`;
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(stored) ? stored : 0;
  });

  const { data: notifications = [], isSuccess } = useQuery({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30_000,
  });

  // Realtime push: new orders / reservations bump the bell instantly. Also
  // refresh the underlying list views so they stay in sync. Mirrors the KDS
  // subscription pattern (kds-view.tsx). Falls back to the 30s poll above.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["reservations"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_inquiries" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["event-inquiries"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ── Toasts ───────────────────────────────────────────────────────────────
  // The bell badge is easy to miss when staff are heads-down on another view,
  // so anything arriving while the dashboard is open also pops a toast.
  // `null` means the first feed hasn't landed yet: that load only seeds the
  // set, otherwise opening the dashboard would fire a toast per history item.
  const toastedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!isSuccess) return;

    if (toastedRef.current === null) {
      // Seeds from the first successful feed — including an empty one, so the
      // very first order at a brand-new restaurant still toasts.
      toastedRef.current = new Set(notifications.map(notifKey));
      return;
    }

    selectNotificationsToToast(toastedRef.current, notifications, MAX_TOASTS).forEach(
      (n) => {
        const { icon: Icon, className } = NOTIF_STYLE[n.kind];
        toast(n.title, {
          // Keyed so a re-delivery of the same item replaces its toast
          // instead of stacking a duplicate.
          id: notifKey(n),
          description: n.subtitle,
          icon: (
            <span className={cn("flex size-7 items-center justify-center rounded-xl shadow-xs shrink-0", className)}>
              <Icon className="size-4" />
            </span>
          ),
          action: {
            label: tl("viewNotification"),
            onClick: () => router.push(n.href),
          },
        });
      },
    );
  }, [notifications, isSuccess, router, tl]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => new Date(n.created_at).getTime() > lastSeen).length,
    [notifications, lastSeen],
  );

  const markAllRead = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(storageKey, String(now));
    setLastSeen(now);
  }, [storageKey]);

  const isDark = theme === "dark";
  const initialLetter = restaurantName.charAt(0).toUpperCase();
  const roleLabel = tl(ROLE_HEADER_LABELS[role] ?? ROLE_LABELS[role] ?? "roleOwner");

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border/60 bg-background/95 px-4 md:px-8 backdrop-blur transition-colors">
      {/* Left side: Sidebar trigger & title */}
      <div className="flex items-center gap-3 min-w-0">
        <SidebarTrigger className="size-9 rounded-xl border border-border/60 bg-card hover:bg-muted text-foreground transition-colors shadow-sm" />
        <span className="hidden sm:inline-block font-display text-sm font-bold text-foreground truncate max-w-[200px]">
          {restaurantName}
        </span>
      </div>

      {/* Right side navbar items matching user spec */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        
        {/* 1. Notification Bell Button */}
        <DropdownMenu onOpenChange={(open) => !open && markAllRead()}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
              className={cn(
                "relative flex size-10 shrink-0 items-center justify-center rounded-full border transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                unreadCount > 0
                  ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 shadow-primary/10"
                  : "border-border/70 bg-card text-foreground hover:bg-muted"
              )}
            >
              <Bell className={cn("size-4 stroke-[2px] transition-transform group-hover:rotate-12", unreadCount > 0 && "text-primary")} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-0.5 -right-0.5 size-3 animate-ping rounded-full bg-[#e36329] opacity-75" />
                  <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-[#e36329] px-1 text-[10px] font-extrabold text-white ring-2 ring-card shadow-md shadow-orange-500/20">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-84 sm:w-96 rounded-2xl border-border/80 bg-card/98 backdrop-blur-xl p-2.5 shadow-2xl space-y-1.5">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-extrabold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-extrabold text-primary">
                    {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11.5px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 hover:underline"
                >
                  <CheckCheck className="size-3.5" /> Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto py-1 space-y-1.5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/50">
                    <Bell className="size-6 stroke-[1.75]" />
                  </div>
                  <p className="text-[13px] font-bold text-foreground mt-1">Aucune notification</p>
                  <p className="text-[11.5px] text-muted-foreground max-w-[200px]">
                    Vos dernières commandes et réservations apparaîtront ici en temps réel.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isUnread = new Date(n.created_at).getTime() > lastSeen;
                  const style = NOTIF_STYLE[n.kind];
                  const Icon = style.icon;
                  return (
                    <DropdownMenuItem
                      key={notifKey(n)}
                      asChild
                      className="p-0 rounded-xl cursor-pointer focus:bg-transparent"
                    >
                      <Link
                        href={n.href}
                        className={cn(
                          "flex items-start gap-3 p-3 w-full rounded-xl border border-transparent transition-all hover:bg-muted/70 hover:border-border/50",
                          isUnread && "bg-primary/[0.04] border-primary/15 shadow-2xs",
                        )}
                      >
                        <div
                          className={cn(
                            "size-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5",
                            style.className,
                          )}
                        >
                          <Icon className="size-4.5 stroke-[2.25]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-[13px] font-extrabold text-foreground leading-tight truncate">{n.title}</p>
                            <span className="text-[10px] font-medium text-muted-foreground/80 shrink-0">
                              {formatDistanceToNowStrict(new Date(n.created_at), { locale: dateFnsLocale(locale), addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-[12px] font-medium text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{n.subtitle}</p>
                        </div>
                        {isUnread && (
                          <span className="mt-2 size-2 shrink-0 rounded-full bg-[#e36329] shadow-[0_0_8px_rgba(227,99,41,0.7)] animate-pulse" />
                        )}
                      </Link>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 2. Dark / Light Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Changer le thème"
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-colors hover:bg-muted shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-hidden"
        >
          {mounted && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? "dark" : "light"}
                initial={{ opacity: 0, rotate: -45, scale: 0.5 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.5 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex items-center justify-center"
              >
                {isDark ? (
                  <Moon className="size-4 stroke-[2px]" />
                ) : (
                  <Sun className="size-4 stroke-[2px]" />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </button>

        {/* 3. User / Restaurant Profile Pill Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2.5 rounded-full border border-border/80 bg-card p-1 pr-3.5 sm:pr-4 shadow-sm hover:bg-muted/50 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {/* Avatar Circle with Initial or Logo */}
              <div className="flex size-8 sm:size-9 items-center justify-center rounded-full bg-[#e36329] text-white font-extrabold text-sm shadow-sm shrink-0 overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt={restaurantName} className="size-full object-cover" />
                ) : (
                  initialLetter
                )}
              </div>

              {/* Name and Role labels */}
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[13px] font-extrabold text-foreground leading-tight truncate max-w-[110px] sm:max-w-[150px]">
                  {restaurantName}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground leading-tight truncate mt-0.5">
                  {roleLabel}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-2xl border-border bg-card p-2 shadow-2xl">
            <DropdownMenuLabel className="px-3 py-2">
              <p className="text-[13px] font-extrabold text-foreground truncate">{restaurantName}</p>
              <p className="text-[11.5px] font-medium text-muted-foreground truncate mt-0.5">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer font-semibold text-xs py-2.5 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
              <a
                href={`/${restaurantSlug || "orendezvous"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full"
              >
                <span className="flex items-center gap-2 font-bold">
                  <Globe className="size-4 text-primary" /> Visiter le site web
                </span>
                <ExternalLink className="size-3.5 text-primary/70" />
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer font-semibold text-xs py-2.5">
              <Link href="/dashboard/settings" className="flex items-center gap-2">
                <Settings className="size-4 text-muted-foreground" /> Réglages du restaurant
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl cursor-pointer font-semibold text-xs py-2.5">
              <Link href="/change-password" className="flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" /> Changer de mot de passe
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem
              onClick={signOut}
              className="rounded-xl cursor-pointer font-semibold text-xs py-2.5 text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20"
            >
              <LogOut className="size-4 mr-1.5" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
