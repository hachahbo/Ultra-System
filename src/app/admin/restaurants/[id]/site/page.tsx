import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteBuilder } from "@/components/admin/site-builder/site-builder";

export const metadata: Metadata = { title: "Éditeur du site" };

export default async function SiteBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: restaurant } = await admin
    .from("restaurants")
    .select("id, name, slug")
    .eq("id", id)
    .maybeSingle();
  if (!restaurant) notFound();

  return (
    <SiteBuilder
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      slug={restaurant.slug}
    />
  );
}
