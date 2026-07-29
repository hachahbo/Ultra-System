"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

import { Menu as MenuIcon, UtensilsCrossed, CalendarDays, Info, Phone } from "lucide-react";
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
              <SheetContent side="left" className="w-[80vw] sm:w-80 bg-[#333333] border-none text-white !inset-y-4 !left-4 !h-[calc(100vh-2rem)] rounded-3xl shadow-2xl p-2 flex flex-col">
                <SheetHeader className="text-left pt-6 pb-4 px-4">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center p-2 shrink-0">
                      <LogoIcon className="w-full h-full text-white" />
                    </div>
                    <div>
                      <SheetTitle className="font-display text-white text-lg leading-none mb-1">{name}</SheetTitle>
                      <SheetDescription className="text-xs text-white/50">Casablanca, Maroc</SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
                <nav className="flex flex-col gap-2 px-2 mt-4 flex-1">
                  {links.map((l) => {
                    const Icon = l.icon;
                    return (
                      <Link
                        key={l.href}
                        href={`${base}${l.href}`}
                        className="flex items-center gap-4 rounded-xl px-4 py-3 text-base font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Icon className="size-5 text-white/60" />
                        {t(l.key)}
                      </Link>
                    );
                  })}

                  <div className="mt-4 mb-2 flex items-center justify-between px-4 py-3 rounded-xl bg-white/5">
                    <span className="text-base font-medium text-white/80">Apparence</span>
                    <ThemeToggle />
                  </div>

                  <div className="mb-2 flex items-center justify-between px-4 py-3 rounded-xl bg-white/5">
                    <span className="text-base font-medium text-white/80">{t("language")}</span>
                    <LanguageSwitcher />
                  </div>

                  <div className="mt-auto pb-4 px-2">
                    <Button asChild className="w-full rounded-xl shadow-md h-12 bg-white text-black hover:bg-white/90">
                      <Link href={`${base}/reservation`}>
                        {t("reserve")}
                      </Link>
                    </Button>
                  </div>
                </nav>
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
