"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { themeDraftSchema, type ThemeDraftInput } from "@/lib/schemas";
import { mergeDraft } from "@/lib/theme";
import type { RestaurantTheme } from "@/lib/types";
import { PanelDesign } from "@/components/admin/site-builder/panel-design";
import { PanelImages } from "@/components/admin/site-builder/panel-images";
import { PanelContent } from "@/components/admin/site-builder/panel-content";
import { PanelSections } from "@/components/admin/site-builder/panel-sections";
import { PreviewFrame } from "@/components/admin/site-builder/preview-frame";
import { siteFontClassNames } from "@/lib/fonts-site";

async function fetchTheme(restaurantId: string): Promise<RestaurantTheme> {
  const res = await fetch(`/api/admin/restaurants/${restaurantId}/theme`);
  if (!res.ok) throw new Error("fetch failed");
  const body = await res.json();
  return body.theme as RestaurantTheme;
}

function themeToFormValues(theme: RestaurantTheme): ThemeDraftInput {
  const resolved = mergeDraft(theme);
  return {
    color_primary: resolved.color_primary,
    color_secondary: resolved.color_secondary,
    color_background: resolved.color_background,
    color_text: resolved.color_text,
    font_pair: resolved.font_pair,
    logo_url: resolved.logo_url,
    hero_image_urls: resolved.hero_image_urls,
    about_title: resolved.about_title,
    about_body: resolved.about_body,
    address: resolved.address,
    sections: resolved.sections,
    custom_copy: resolved.custom_copy,
  };
}

export function SiteBuilder({
  restaurantId,
  restaurantName,
  slug,
}: {
  restaurantId: string;
  restaurantName: string;
  slug: string;
}) {
  const queryClient = useQueryClient();
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const { data: theme, isPending } = useQuery({
    queryKey: ["admin-theme", restaurantId],
    queryFn: () => fetchTheme(restaurantId),
  });

  const form = useForm<ThemeDraftInput>({
    resolver: zodResolver(themeDraftSchema),
    defaultValues: { hero_image_urls: [], sections: [], custom_copy: {} },
  });

  useEffect(() => {
    if (!theme) return;
    form.reset(themeToFormValues(theme));
    setServerUpdatedAt(theme.updated_at);
    setHasDraft(theme.draft !== null);
    // form is stable across renders (react-hook-form) — only re-sync when
    // the server payload itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  async function saveDraft(values: ThemeDraftInput) {
    if (!serverUpdatedAt) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}/theme`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: values, expected_updated_at: serverUpdatedAt }),
      });
      if (res.status === 409) {
        toast.error("Modifié ailleurs — rechargement du thème");
        queryClient.invalidateQueries({ queryKey: ["admin-theme", restaurantId] });
        return;
      }
      if (!res.ok) {
        toast.error("Enregistrement impossible");
        return;
      }
      const body = await res.json();
      setServerUpdatedAt(body.updated_at);
      setHasDraft(true);
      setPreviewRefreshKey((k) => k + 1);
      toast.success("Brouillon enregistré");
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (!serverUpdatedAt) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}/theme/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected_updated_at: serverUpdatedAt }),
      });
      if (res.status === 409) {
        toast.error("Modifié ailleurs — rechargement du thème");
        queryClient.invalidateQueries({ queryKey: ["admin-theme", restaurantId] });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error?.message ?? "Publication impossible");
        return;
      }
      const body = await res.json();
      setServerUpdatedAt(body.updated_at);
      setHasDraft(false);
      setPreviewRefreshKey((k) => k + 1);
      toast.success("Site publié");
      queryClient.invalidateQueries({ queryKey: ["admin-theme", restaurantId] });
    } finally {
      setPublishing(false);
    }
  }

  if (isPending || !theme) {
    return <div className="p-8 text-sm text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className={siteFontClassNames}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link href="/admin/restaurants">
              <ArrowLeft className="size-4" /> Restaurants
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold">{restaurantName}</h1>
          <p className="text-sm text-muted-foreground">
            /{slug}
            {hasDraft && <span className="ml-2 text-amber-600">· brouillon non publié</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={form.handleSubmit(saveDraft)} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer le brouillon"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={!hasDraft || publishing}>
                {publishing ? "Publication…" : "Publier"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Publier ce site ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Le brouillon devient visible immédiatement sur le site public de {restaurantName}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={publish}>Publier</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_420px]">
        <Tabs defaultValue="design">
          <TabsList>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
          </TabsList>
          <TabsContent value="design" className="mt-4">
            <PanelDesign form={form} />
          </TabsContent>
          <TabsContent value="images" className="mt-4">
            <PanelImages form={form} restaurantId={restaurantId} />
          </TabsContent>
          <TabsContent value="content" className="mt-4">
            <PanelContent form={form} />
          </TabsContent>
          <TabsContent value="sections" className="mt-4">
            <PanelSections form={form} />
          </TabsContent>
        </Tabs>

        <PreviewFrame restaurantId={restaurantId} slug={slug} refreshKey={previewRefreshKey} />
      </div>
    </div>
  );
}
