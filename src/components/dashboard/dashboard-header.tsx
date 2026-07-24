"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
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
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ROLE_FRENCH: Record<Role, string> = {
  owner: "Gérant",
  manager: "Manager",
  serveur: "Serveur",
  cuisine: "Cuisine",
};

export function DashboardHeader({
  restaurantName,
  logoUrl,
  role,
  email,
}: {
  restaurantName: string;
  logoUrl?: string | null;
  role: Role;
  email: string;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";
  const initialLetter = restaurantName.charAt(0).toUpperCase();
  const roleLabel = ROLE_FRENCH[role] || ROLE_LABELS[role] || role;

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Notifications"
              className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-colors hover:bg-muted shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Bell className="size-4 stroke-[2px]" />
              {unreadNotifications > 0 && (
                <span className="absolute top-2.5 right-2.5 size-2.5 rounded-full bg-[#e36329] ring-2 ring-card shadow-sm animate-pulse" />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-2xl border-border bg-card p-2 shadow-2xl">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
              <span className="font-display text-sm font-extrabold text-foreground">Notifications</span>
              {unreadNotifications > 0 && (
                <button
                  onClick={() => setUnreadNotifications(0)}
                  className="text-[11.5px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="size-3.5" /> Tout marquer comme lu
                </button>
              )}
            </div>
            <div className="py-1 space-y-1">
              <DropdownMenuItem className="p-2.5 rounded-xl cursor-pointer flex items-start gap-3 hover:bg-muted">
                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <ShoppingBag className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground leading-snug">Nouvelle commande CMD-4810</p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">Sur place · Table 3 (185 MAD)</p>
                  <span className="text-[10px] text-muted-foreground/80 mt-1 block">Il y a 2 min</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="p-2.5 rounded-xl cursor-pointer flex items-start gap-3 hover:bg-muted">
                <div className="size-8 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground leading-snug">Nouvelle réservation</p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">Client Amine · 4 personnes à 20h00</p>
                  <span className="text-[10px] text-muted-foreground/80 mt-1 block">Il y a 15 min</span>
                </div>
              </DropdownMenuItem>
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
