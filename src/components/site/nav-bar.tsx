"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

import { Menu as MenuIcon, UtensilsCrossed, CalendarDays, Info, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoIcon } from "@/components/site/logo-icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";

const links = [
  { href: "/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/about", label: "About", icon: Info },
  { href: "/contact", label: "Contact", icon: Phone },
];

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
  const base = `/${slug}`;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header 
      className="sticky top-0 z-40 bg-background/90 backdrop-blur py-4"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 relative">
        {/* Left: Mobile Burger & Desktop Logo */}
        <div className="flex flex-1 items-center justify-start gap-2">
          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ouvrir le menu" className="-ml-2">
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
                        {l.label}
                      </Link>
                    );
                  })}
                  
                  <div className="mt-4 mb-2 flex items-center justify-between px-4 py-3 rounded-xl bg-white/5">
                    <span className="text-base font-medium text-white/80">Apparence</span>
                    <ThemeToggle />
                  </div>

                  <div className="mt-auto pb-4 px-2">
                    <Button asChild className="w-full rounded-xl shadow-md h-12 bg-white text-black hover:bg-white/90">
                      <Link href={`${base}/reservation`}>
                        Book a table
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
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-1 items-center justify-end gap-2 md:gap-4">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          
          {/* Desktop CTA */}
          <Button asChild className="hidden md:inline-flex rounded-full px-8 py-6 text-base font-semibold shadow-md">
            <Link href={`${base}/reservation`}>Book a table</Link>
          </Button>

          {/* Mobile CTA */}
          <Button asChild className="md:hidden rounded-xl px-6 py-5 shadow-md font-bold text-base">
            <Link href={`${base}/reservation`}>Book</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
