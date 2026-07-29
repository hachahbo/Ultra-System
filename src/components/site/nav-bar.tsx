"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

import { 
  Menu as MenuIcon, 
  UtensilsCrossed, 
  CalendarDays, 
  Info, 
  Phone, 
  ChevronRight, 
  Moon, 
  Globe 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { LogoIcon } from "@/components/site/logo-icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";

// `key` indexes into the Nav.* messages; icons/href stay static.
const links = [
  { href: "/menu", key: "menu", icon: UtensilsCrossed },
  { href: "/events", key: "events", icon: CalendarDays },
  { href: "/about", key: "about", icon: Info },
  { href: "/contact", key: "contact", icon: Phone },
] as const;

export function NavBar({
  slug,
  name,
  logoUrl,
}: {
  slug: string;
  name: string;
  logoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const base = `/${slug}`;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <motion.header
      initial={{ opacity: 0, y: -45, filter: "blur(20px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, delay: 1, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 bg-background/90 backdrop-blur py-4"
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8 relative">
        {/* Left: Mobile Burger & Desktop Logo */}
        <div className="flex flex-1 items-center justify-start gap-2">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t("openMenu")} className="-ml-2">
                  <MenuIcon className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="left" 
                className="fixed !inset-y-3 !left-3 z-[100] w-[88vw] max-w-[340px] mirror-glass text-foreground !h-[calc(100dvh-1.5rem)] rounded-[30px] p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden"
              >
                <div className="flex flex-col flex-1 justify-between min-h-0 py-1">
                  {/* Sheet Header: Logo & Restaurant info */}
                  <SheetHeader className="text-left pt-1 pb-2 px-1 border-b border-black/10 dark:border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl overflow-hidden bg-[#FF6B35]/10 dark:bg-white/10 flex items-center justify-center p-1.5 shrink-0 border border-[#FF6B35]/20">
                        <LogoIcon className="w-full h-full text-[#FF6B35] dark:text-white" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <SheetTitle className="font-display text-[#1c1712] dark:text-white text-base font-bold leading-tight truncate">{name}</SheetTitle>
                        <SheetDescription className="text-[11px] text-[#1c1712]/60 dark:text-white/60 truncate">Tanger, Maroc</SheetDescription>
                      </div>
                    </div>
                  </SheetHeader>

                  {/* Navigation Section */}
                  <div className="mt-2 mb-1 text-[10px] font-bold tracking-[0.2em] uppercase text-[#1c1712]/50 dark:text-white/40 px-2 shrink-0">
                    Navigation
                  </div>
                  <nav className="flex flex-col gap-1">
                    {links.map((l) => {
                      const Icon = l.icon;
                      const targetPath = `${base}${l.href}`;
                      const isActive = pathname === targetPath || pathname.startsWith(`${targetPath}/`);

                      return (
                        <Link
                          key={l.href}
                          href={targetPath}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                            isActive
                              ? "bg-[#FF6B35]/15 text-[#FF6B35] dark:bg-[#FF6B35]/25 dark:text-[#FF6B35]"
                              : "text-[#1c1712]/85 dark:text-white/90 hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#1c1712] dark:hover:text-white"
                          }`}
                        >
                          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            isActive
                              ? "bg-[#FF6B35] text-white"
                              : "bg-black/5 dark:bg-white/10 text-[#1c1712] dark:text-white"
                          }`}>
                            <Icon className="size-4" />
                          </div>
                          <span className="flex-1 font-medium text-sm sm:text-base">{t(l.key)}</span>
                          {isActive ? (
                            <span className="size-2 rounded-full bg-[#FF6B35] shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 text-[#1c1712]/40 dark:text-white/40 shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </nav>

                  {/* Preferences Section */}
                  <div className="mt-2 mb-1 text-[10px] font-bold tracking-[0.2em] uppercase text-[#1c1712]/50 dark:text-white/40 px-2 shrink-0">
                    Préférences
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {/* Apparence / Theme Switcher */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md">
                      <div className="flex items-center gap-2.5">
                        <Moon className="size-4 text-[#1c1712]/70 dark:text-white/70" />
                        <span className="text-xs sm:text-sm font-semibold text-[#1c1712] dark:text-white">Apparence</span>
                      </div>
                      <ThemeToggle />
                    </div>

                    {/* Langue / Language Switcher */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-md">
                      <div className="flex items-center gap-2.5">
                        <Globe className="size-4 text-[#1c1712]/70 dark:text-white/70" />
                        <span className="text-xs sm:text-sm font-semibold text-[#1c1712] dark:text-white">{t("language")}</span>
                      </div>
                      <LanguageSwitcher />
                    </div>
                  </div>
                </div>

                {/* Footer CTA Button */}
                <div className="pt-2 px-0.5 mt-2 border-t border-black/10 dark:border-white/10 shrink-0">
                  <Button asChild className="liquid-glass liquid-glass--orange w-full rounded-full h-11 text-white font-bold text-sm sm:text-base border-none transition-all duration-300 hover:scale-[1.02]">
                    <Link href={`${base}/reservation`}>
                      {t("reserve")}
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Logo */}
          <div className="hidden md:flex items-center min-w-0">
            <Link href={base} className="flex items-center min-w-0">
              <LogoIcon className="w-28 sm:w-36 md:w-40 h-auto" />
            </Link>
          </div>
        </div>

        {/* Center: Mobile Logo & Desktop Menu */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
          {/* Mobile Logo */}
          <div className="md:hidden pointer-events-auto">
            <Link href={base} className="flex items-center min-w-0">
              <LogoIcon className="w-28 sm:w-36 h-auto" />
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex pointer-events-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={`${base}${l.href}`}
                className="text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Desktop CTA */}
          <Button asChild className="hidden md:inline-flex rounded-full px-8 py-6 text-base font-semibold bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white shadow-[0_8px_20px_rgba(255,107,53,0.35)] hover:shadow-[0_12px_24px_rgba(255,107,53,0.45)] transition-all duration-300">
            <Link href={`${base}/reservation`}>{t("reserve")}</Link>
          </Button>

          {/* Mobile CTA */}
          <Button asChild className="md:hidden rounded-xl px-6 py-5 font-bold text-base bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white shadow-[0_8px_16px_rgba(255,107,53,0.25)] transition-all">
            <Link href={`${base}/reservation`}>{t("reserve")}</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  );
}
