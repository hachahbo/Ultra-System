"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { Menu as MenuIcon, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoIcon } from "@/components/site/logo-icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
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
  const base = `/${slug}`;

  return (
    <motion.header 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-40 bg-background/90 backdrop-blur py-4"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <Link href={base} className="flex items-center min-w-0">
          <LogoIcon className="w-32 sm:w-40 md:w-48 h-auto" />
        </Link>

        {/* Center: Navigation Links */}
        <nav className="hidden items-center gap-8 md:flex">
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

        {/* Right: CTA Button */}
        <div className="hidden items-center gap-4 md:flex">
          <ThemeToggle />
          <Button asChild className="rounded-full px-8 py-6 text-base font-semibold shadow-md">
            <Link href={`${base}/reservation`}>Book a table</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button asChild size="sm" className="rounded-md shadow-md">
            <Link href={`${base}/reservation`}>Book</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                <MenuIcon className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="font-display">{name}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 mt-6">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={`${base}${l.href}`}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2.5 text-base hover:bg-muted"
                  >
                    {l.label}
                  </Link>
                ))}
                <Button asChild className="mt-6 rounded-md shadow-md">
                  <Link
                    href={`${base}/reservation`}
                    onClick={() => setOpen(false)}
                  >
                    Book a table
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  );
}
