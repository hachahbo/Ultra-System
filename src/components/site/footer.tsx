import Link from "next/link";
import type { Restaurant } from "@/lib/types";

export function Footer({ restaurant }: { restaurant: Restaurant }) {
  const base = `/${restaurant.slug}`;
  return (
    <footer className="mt-auto border-t bg-secondary text-secondary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold">
            {restaurant.name}
          </p>
          {restaurant.about_text && (
            <p className="mt-2 line-clamp-3 text-sm text-secondary-foreground/70">
              {restaurant.about_text}
            </p>
          )}
        </div>
        <div className="text-sm">
          <p className="mb-3 font-medium uppercase tracking-wide text-secondary-foreground/60">
            Navigation
          </p>
          <ul className="space-y-2">
            <li>
              <Link href={`${base}/menu`} className="hover:text-primary">
                Menu
              </Link>
            </li>
            <li>
              <Link href={`${base}/reservation`} className="hover:text-primary">
                Réserver une table
              </Link>
            </li>
            <li>
              <Link href={`${base}/about`} className="hover:text-primary">
                Qui sommes-nous
              </Link>
            </li>
            <li>
              <Link href={`${base}/contact`} className="hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-medium uppercase tracking-wide text-secondary-foreground/60">
            Horaires & contact
          </p>
          {restaurant.hours && <p>{restaurant.hours}</p>}
          {restaurant.address && (
            <p className="mt-2 text-secondary-foreground/70">
              {restaurant.address}
            </p>
          )}
          {restaurant.phone && (
            <a
              href={`tel:${restaurant.phone.replace(/\s/g, "")}`}
              className="mt-2 block hover:text-primary"
            >
              {restaurant.phone}
            </a>
          )}
        </div>
      </div>
      <div className="border-t border-secondary-foreground/10 py-4 text-center text-xs text-secondary-foreground/50">
        © {new Date().getFullYear()} {restaurant.name} · Propulsé par Darna
      </div>
    </footer>
  );
}
