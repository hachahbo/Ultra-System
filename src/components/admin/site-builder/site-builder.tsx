"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Palette, ImageIcon, FileText, Layers, Globe, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
    welcome_gallery_urls: resolved.welcome_gallery_urls,
    values_items: resolved.values_items,
    testimonials: resolved.testimonials,
    about_gallery_urls: resolved.about_gallery_urls,
    about_rating: resolved.about_rating,
    about_review_count: resolved.about_review_count,
    about_map_url: resolved.about_map_url,
    specials_image_url: resolved.specials_image_url,
    social_facebook_url: resolved.social_facebook_url,
    social_instagram_url: resolved.social_instagram_url,
    social_twitter_url: resolved.social_twitter_url,
    i18n: resolved.i18n,
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
    defaultValues: {
      hero_image_urls: [],
      sections: [],
      custom_copy: {},
      welcome_gallery_urls: [],
      values_items: [],
      testimonials: [],
      about_gallery_urls: [],
      i18n: {},
    },
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

  const onSaveError = (errors: Record<string, unknown>) => {
    console.error("Form validation errors:", errors);
    toast.error("Veuillez corriger les erreurs de validation dans le formulaire.");
  };

  return (
    <div className={`space-y-6 ${siteFontClassNames}`}>
      {/* Sleek Admin Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card border border-border/80 p-5 sm:p-6 shadow-sm">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2.5 h-8 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/admin/restaurants">
              <ArrowLeft className="size-3.5 mr-1" /> Retour aux restaurants
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold text-foreground">{restaurantName}</h1>
            {hasDraft ? (
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] px-2.5 py-0.5">
                Brouillon non publié
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] px-2.5 py-0.5 flex items-center gap-1">
                <CheckCircle className="size-3" /> Publié
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Globe className="size-3.5 text-[#e36329]" />
            <a href={`/${slug}`} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary">
              /{slug}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant={form.formState.isDirty ? "default" : "outline"}
            onClick={form.handleSubmit(saveDraft, onSaveError)}
            disabled={saving}
            className={`rounded-xl font-bold text-xs h-10 px-4 transition-all duration-300 ${
              form.formState.isDirty
                ? "bg-[#e36329] hover:bg-[#c8521d] text-white shadow-md ring-2 ring-[#e36329]/30"
                : ""
            }`}
          >
            {saving ? (
              "Enregistrement…"
            ) : (
              <span className="flex items-center gap-1.5">
                {form.formState.isDirty && (
                  <span className="size-2 rounded-full bg-white animate-pulse" />
                )}
                {form.formState.isDirty ? "Enregistrer le brouillon *" : "Enregistrer le brouillon"}
              </span>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!hasDraft || publishing}
                className="rounded-xl font-bold text-xs h-10 px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              >
                {publishing ? "Publication…" : "Publier"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Publier ce site ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Le brouillon devient visible immédiatement sur le site public de {restaurantName}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={publish} className="rounded-xl bg-primary text-primary-foreground font-bold">
                  Publier le site
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Grid: Controls + Preview */}
      <div className="grid gap-6 lg:grid-cols-[1fr_440px] items-start">
        <Tabs defaultValue="design" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-xl p-1 bg-muted/60 border border-border/50 h-11">
            <TabsTrigger value="design" className="rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 py-2">
              <Palette className="size-3.5" /> Design
            </TabsTrigger>
            <TabsTrigger value="images" className="rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 py-2">
              <ImageIcon className="size-3.5" /> Images
            </TabsTrigger>
            <TabsTrigger value="content" className="rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 py-2">
              <FileText className="size-3.5" /> Contenu
            </TabsTrigger>
            <TabsTrigger value="sections" className="rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 py-2">
              <Layers className="size-3.5" /> Sections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="design" className="mt-4 focus-visible:outline-none">
            <PanelDesign form={form} />
          </TabsContent>
          <TabsContent value="images" className="mt-4 focus-visible:outline-none">
            <PanelImages form={form} restaurantId={restaurantId} />
          </TabsContent>
          <TabsContent value="content" className="mt-4 focus-visible:outline-none">
            <PanelContent form={form} restaurantId={restaurantId} />
          </TabsContent>
          <TabsContent value="sections" className="mt-4 focus-visible:outline-none">
            <PanelSections form={form} />
          </TabsContent>
        </Tabs>

        <PreviewFrame restaurantId={restaurantId} slug={slug} refreshKey={previewRefreshKey} />
      </div>
    </div>
  );
}
