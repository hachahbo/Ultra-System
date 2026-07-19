import { NextResponse } from "next/server";
import { apiError } from "@/lib/api";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 1024 * 1024;
const KINDS = new Set(["logo", "hero"]);

// The operator has no restaurant_id, so the tenant-scoped storage RLS
// ("menu images tenant insert", 0001_init.sql) can't allow a browser-direct
// upload here — this route uploads via the service role instead. The client
// still compresses to WebP first with the existing compressImage() util
// (src/lib/image.ts), same as the owner's logo/menu-item uploads.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireSuperAdmin();
  if ("response" in guard) return guard.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind");
  if (!(file instanceof File) || typeof kind !== "string" || !KINDS.has(kind)) {
    return apiError("invalid_input", "Fichier invalide", 400);
  }
  if (file.type !== "image/webp") {
    return apiError("invalid_input", "Le fichier doit être au format WebP", 400);
  }
  if (file.size > MAX_BYTES) {
    return apiError("invalid_input", "Fichier trop volumineux (max 1 Mo)", 400);
  }

  const admin = createAdminClient();
  const { data: restaurant } = await admin.from("restaurants").select("id").eq("id", id).maybeSingle();
  if (!restaurant) return apiError("not_found", "Restaurant introuvable", 404);

  const path = `${id}/theme/${kind}-${crypto.randomUUID()}.webp`;
  const { error } = await admin.storage
    .from("menu-images")
    .upload(path, file, { cacheControl: "3600", contentType: "image/webp" });
  if (error) return apiError("upload_failed", "Envoi impossible", 500);

  const { data } = admin.storage.from("menu-images").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
