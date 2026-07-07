import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicMenu, getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { MenuBrowser } from "@/components/menu/menu-browser";

export const metadata: Metadata = { title: "Menu" };

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const [{ slug }, { table }] = await Promise.all([params, searchParams]);
  const menu = await getPublicMenu(slug);
  if (!menu) notFound();
  const features = applyStatusGate(
    menu.restaurant.status,
    await getPublicFeatures(menu.restaurant.id, menu.restaurant.plan),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
        {menu.restaurant.name}
      </p>
      <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight md:text-4xl">
        Notre carte
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {table
          ? `Table ${table} — commandez directement depuis votre téléphone.`
          : "Une sélection de plats préparés avec soin. Touchez un plat pour l’ajouter."}
      </p>
      <MenuBrowser menu={menu} table={table ?? null} orderingEnabled={features.online_ordering} />
    </div>
  );
}
