const MAX_BYTES = 500_000;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;

// Client-side image compression before upload — keeps menu photos and the
// restaurant logo small without a dependency. Falls back to the original
// file if compression fails or somehow produces a larger result.
//
// Iteratively lowers quality until the output is under MAX_BYTES (mirrors
// what a server-side Sharp pipeline would enforce) — there's no Sharp here
// because both upload paths that exist are either browser-direct-to-Storage
// (Sharp can't run in a browser) or already require pre-compressed WebP
// input server-side, so canvas.toBlob is the only encoder actually reachable.
export async function compressImage(
  file: File,
  maxDim = 1280,
  quality = 0.82,
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const encode = (q: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", q));

    let q = quality;
    let blob = await encode(q);
    while (blob && blob.size > MAX_BYTES && q > MIN_QUALITY) {
      q -= QUALITY_STEP;
      blob = await encode(q);
    }
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], newName, { type: "image/webp" });
  } catch {
    return file;
  }
}
