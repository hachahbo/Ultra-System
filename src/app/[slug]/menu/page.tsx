import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getPublicMenu, getPublicFeatures } from "@/lib/menu";
import { applyStatusGate } from "@/lib/features";
import { MenuBrowser } from "@/components/menu/menu-browser";
import { FormulesSection } from "@/components/menu/formules-section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Menu");
  return { title: t("metaTitle") };
}

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
  const t = await getTranslations("Menu");

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-8 pb-28 md:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#FF6B35]">
        {menu.restaurant.name}
      </p>
      <h1 className="mt-1.5 font-serif text-3xl font-semibold tracking-tight md:text-5xl">
        {t("heading")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {table ? t("subtitleTable", { table }) : t("subtitle")}
      </p>
      <MenuBrowser menu={menu} table={table ?? null} orderingEnabled={features.online_ordering} />
      <FormulesSection
        promotions={menu.promotions}
        categories={menu.categories}
        items={menu.items}
        currency={menu.restaurant.currency}
      />
    </div>
  );
}
