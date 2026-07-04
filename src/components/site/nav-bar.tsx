"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu as MenuIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { href: "", label: "Accueil" },
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "Qui sommes-nous" },
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href={base} className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt=""
              width={36}
              height={36}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
              {name.charAt(0)}
            </span>
          )}
          <span className="truncate font-display text-lg font-semibold">
            {name}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={`${base}${l.href}`}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <Button asChild size="sm">
            <Link href={`${base}/reservation`}>Réserver une table</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <Button asChild size="sm">
            <Link href={`${base}/reservation`}>Réserver</Link>
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
              <nav className="flex flex-col gap-1 px-4">
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
                <Button asChild className="mt-3">
                  <Link
                    href={`${base}/reservation`}
                    onClick={() => setOpen(false)}
                  >
                    Réserver une table
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
