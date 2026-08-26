"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  BellRing,
  CalendarDays,
  PartyPopper,
  Globe,
  ExternalLink,
  Volume2,
  VolumeX,
  ChevronRight,
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
import {
  isNotificationSoundEnabled,
  playNotificationChime,
  setNotificationSoundEnabled,
} from "@/lib/notification-sound";
import type { NotificationItem } from "@/app/api/dashboard/notifications/route";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { markOrderSeen, markMultipleOrdersSeen, useSeenOrders } from "@/lib/seen-orders";

async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch("/api/dashboard/notifications");
  if (!res.ok) throw new Error("fetch failed");
  return (await res.json()).items as NotificationItem[];
}

// Only the newest few pop; the bell carries any overflow. See
// selectNotificationsToToast for why.
const MAX_TOASTS = 3;

const NOTIF_STYLE: Record<
  NotificationItem["kind"],
  { icon: LucideIcon; className: string; bar: string }
> = {
  order: {
    icon: ShoppingBag,
    className: "bg-[var(--success-bg)] text-[var(--success)]",
    bar: "bg-[var(--success)]",
  },
  // Food is plated and going cold — the most time-critical alert in the feed,
  // so it keeps the loudest colour. That is --warning, not the accent: orange
  // on a decorative icon chip is exactly the rule-1 misuse the system bans.
  order_ready: {
    icon: BellRing,
    className: "bg-[var(--warning-bg)] text-[var(--warning)]",
    bar: "bg-[var(--warning)]",
  },
  reservation: {
    icon: CalendarDays,
    className: "bg-[var(--info-bg)] text-[var(--info)]",
    bar: "bg-[var(--info)]",
  },
  event_inquiry: {
    icon: PartyPopper,
    className: "bg-[var(--surface-3)] text-[var(--text-muted)]",
    bar: "bg-[var(--border-ctrl)]",
  },
};

// Topbar breadcrumb labels, keyed off the second path segment. Same
// Dashboard.nav* messages the sidebar uses, so the crumb and the active nav
// item always read identically.
const CRUMB_KEYS: Record<string, string> = {
  kds: "navKds",
  orders: "navOrders",
  reservations: "navReservations",
  menu: "navMenu",
  events: "navEvents",
  tables: "navTables",
  inventory: "navInventory",
  customers: "navCustomers",
  analytics: "navAnalytics",
  team: "navTeam",
  settings: "navSettings",
  variances: "navVariances",
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
  const t = useTranslations("Dashboard");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Breadcrumb tail. Only the section segment is shown — deeper routes
  // (/orders/reconciliation, /inventory/variances) resolve to the deepest
  // segment we have a label for, so the crumb never renders a raw slug or an
  // id. Falls back to no tail on /dashboard itself.
  // Not memoised on purpose: a useMemo here makes React Compiler bail out of
  // optimizing this whole component (useTranslations' `t` is not a stable dep),
  // and the work is a two-segment string split.
  const crumb = (() => {
    const segments = pathname.split("/").filter(Boolean).slice(1);
    for (let i = segments.length - 1; i >= 0; i--) {
      const key = CRUMB_KEYS[segments[i]];
      if (key) return t(key);
    }
    return null;
  })();

  // ── Notifications ────────────────────────────────────────────────────────
  // Feed is derived server-side from recent orders + pending reservations.
  // "Read" state is per-device: a lastSeen timestamp in localStorage, keyed by
  // restaurant. Unread = items created after lastSeen.
  const storageKey = `notif-last-seen:${restaurantId}`;
  const [lastSeen, setLastSeen] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const stored = Number(window.localStorage.getItem(storageKey));
    const now = Date.now();
    // Sanitize any corrupt/future timestamps stored previously
    if (Number.isFinite(stored) && stored > now + 5000) {
      window.localStorage.setItem(storageKey, String(now));
      return now;
    }
    return Number.isFinite(stored) ? stored : 0;
  });

  const [soundEnabled, setSoundEnabled] = useState(() => isNotificationSoundEnabled());
  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      setNotificationSoundEnabled(next);
      if (next) {
        playNotificationChime(0.25);
      }
      return next;
    });
  }, []);

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

    const toToast = selectNotificationsToToast(toastedRef.current, notifications, MAX_TOASTS);
    if (toToast.length === 0) return;

    // One chime per batch, not one per item — a burst of 3 orders arriving
    // together should sound like a single alert, not a machine-gun of dings.
    if (soundEnabled) playNotificationChime();

    toToast.forEach((n) => {
      const { icon: Icon, className, bar } = NOTIF_STYLE[n.kind];
      toast.custom(
        (id) => (
          <div
            className={cn(
              "pointer-events-auto relative flex w-full max-w-sm items-center justify-between gap-3.5 overflow-hidden rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--surface-2)] p-3.5 shadow-[var(--shadow-pop)] sm:max-w-md sm:p-4"
            )}
          >
            {/* 3px semantic bar — the toast's only colour carrier besides the chip */}
            <span className={cn("absolute inset-y-0 left-0 w-[3px]", bar)} aria-hidden />
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-[var(--r-sm)]",
                  className
                )}
              >
                <Icon className="size-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium leading-tight text-[var(--text)]">
                  {n.title}
                </div>
                <div className="mt-0.5 truncate text-xs text-[var(--text-subtle)]">
                  {n.subtitle}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                toast.dismiss(id);
                markOrderSeen(n.id);
                router.push(n.href);
              }}
              className="inline-flex h-[var(--h-btn-sm)] shrink-0 cursor-pointer items-center gap-1 rounded-[var(--r-sm)] bg-[var(--accent-fill)] px-2.5 text-xs font-semibold text-[var(--on-accent)] transition-colors hover:bg-[var(--accent-hover)]"
            >
              <span>Voir</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        ),
        {
          id: notifKey(n),
          duration: 6000,
          className: "!bg-transparent !border-0 !shadow-none !p-0 !ring-0 !outline-none w-full",
          unstyled: true,
        }
      );
    });
  }, [notifications, isSuccess, router, tl, soundEnabled]);

  const seenOrders = useSeenOrders();

  const isNotifUnread = useCallback(
    (n: NotificationItem) => {
      if (n.kind === "order" && seenOrders.has(n.id)) {
        return false;
      }
      return new Date(n.created_at).getTime() > lastSeen;
    },
    [lastSeen, seenOrders],
  );

  const unreadCount = useMemo(
    () => notifications.filter(isNotifUnread).length,
    [notifications, isNotifUnread],
  );

  const markAllRead = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(storageKey, String(now));
    setLastSeen(now);
    const orderIds = notifications.filter((n) => n.kind === "order").map((n) => n.id);
    if (orderIds.length > 0) markMultipleOrdersSeen(orderIds);
  }, [storageKey, notifications]);

  const isDark = theme === "dark";
  const initialLetter = restaurantName.charAt(0).toUpperCase();
  const roleLabel = tl(ROLE_HEADER_LABELS[role] ?? ROLE_LABELS[role] ?? "roleOwner");

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex h-[var(--topbar-h)] w-full items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-4 backdrop-blur-[8px] md:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="size-[30px] rounded-[var(--r-sm)] text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]" />
        {/* Breadcrumb, not a title — the page owns its own <h1>. */}
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-[13px] text-[var(--text-subtle)] sm:flex">
          <Link href="/dashboard" className="truncate transition-colors hover:text-[var(--text)]">
            {t("navDashboard")}
          </Link>
          {crumb && (
            <>
              <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
              <span className="truncate font-medium text-[var(--text)]">{crumb}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        
        <DropdownMenu onOpenChange={(open) => !open && markAllRead()}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
              className={cn(
                "relative flex size-[30px] shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-subtle)] transition-colors",
                "hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
                unreadCount > 0 && "text-[var(--text)]"
              )}
            >
              <Bell className="size-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--danger-fill)] px-1 text-[10px] font-semibold text-white ring-2 ring-[var(--bg)]">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-84 space-y-1.5 p-1.5 sm:w-96">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-semibold text-[var(--text)]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-[var(--r-pill)] bg-[var(--surface-3)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
                    {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                >
                  <CheckCheck className="size-3.5" /> Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto py-1 space-y-1.5">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                  <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-[var(--surface-3)] text-[var(--text-subtle)]">
                    <Bell className="size-5" />
                  </div>
                  <p className="mt-1 text-[14px] font-semibold text-[var(--text)]">Aucune notification</p>
                  <p className="max-w-[320px] text-[13px] text-[var(--text-subtle)]">
                    Vos dernières commandes et réservations apparaîtront ici en temps réel.
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const isUnread = isNotifUnread(n);
                  const style = NOTIF_STYLE[n.kind];
                  const Icon = style.icon;
                  return (
                    <DropdownMenuItem
                      key={notifKey(n)}
                      asChild
                      className="cursor-pointer p-0 focus:bg-transparent"
                    >
                      <Link
                        href={n.href}
                        onClick={() => markOrderSeen(n.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-[var(--r-sm)] border border-transparent p-3 transition-colors hover:bg-[var(--surface-3)]",
                          isUnread && "bg-[var(--surface-3)] border-[var(--border-strong)]",
                        )}
                      >
                        <div
                          className={cn(
                            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--r-sm)]",
                            style.className,
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-[13px] font-medium leading-tight text-[var(--text)]">{n.title}</p>
                            <span className="shrink-0 text-[10px] text-[var(--text-subtle)]">
                              {formatDistanceToNowStrict(new Date(n.created_at), { locale: dateFnsLocale(locale), addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[var(--text-muted)]">{n.subtitle}</p>
                        </div>
                        {isUnread && (
                          <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--danger)]" aria-label="Non lue" />
                        )}
                      </Link>
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 2. Notification Sound Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundEnabled ? tl("soundOff") : tl("soundOn")}
          aria-pressed={soundEnabled}
          className="relative hidden size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] sm:flex"
        >
          {soundEnabled ? (
            <Volume2 className="size-4 stroke-[2px]" />
          ) : (
            <VolumeX className="size-4 stroke-[2px] text-muted-foreground" />
          )}
        </button>

        {/* 3. Dark / Light Theme Toggle Button */}
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Changer le thème"
          className="relative flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-sm)] text-[var(--text-subtle)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
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

        {/* 4. User / Restaurant Profile Pill Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex cursor-pointer items-center gap-2.5 rounded-[var(--r-pill)] border border-[var(--border)] bg-[var(--surface)] p-1 pr-3.5 transition-colors hover:bg-[var(--surface-2)] sm:pr-4"
            >
              {/* Avatar Circle with Initial or Logo */}
              <div className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-pill)] border border-[var(--border-strong)] bg-[var(--surface-3)] text-[11px] font-semibold text-[var(--text-muted)]">
                {logoUrl ? (
                  <img src={logoUrl} alt={restaurantName} className="size-full object-cover" />
                ) : (
                  initialLetter
                )}
              </div>

              {/* Name and Role labels */}
              <div className="flex flex-col text-left min-w-0">
                <span className="max-w-[110px] truncate text-[12.5px] font-medium leading-tight text-[var(--text)] sm:max-w-[150px]">
                  {restaurantName}
                </span>
                <span className="mt-0.5 truncate text-[11px] leading-tight text-[var(--text-subtle)]">
                  {roleLabel}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 p-1">
            <DropdownMenuLabel className="px-3 py-2">
              <p className="truncate text-[12.5px] font-medium text-[var(--text)]">{restaurantName}</p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--text-subtle)]">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem asChild className="cursor-pointer text-xs">
              <a
                href={`/${restaurantSlug || "orendezvous"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Globe className="size-4 opacity-75" /> Visiter le site web
                </span>
                <ExternalLink className="size-3.5 opacity-60" />
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
