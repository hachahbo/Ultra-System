import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicMenu } from "@/lib/menu";
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-28">
      <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
        Menu
      </h1>
      {table && (
        <p className="mt-1 text-sm text-muted-foreground">
          Table {table} — commandez directement depuis votre téléphone.
        </p>
      )}
      <MenuBrowser menu={menu} table={table ?? null} />
    </div>
  );
}
