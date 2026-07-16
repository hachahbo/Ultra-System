"use client";

import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiningTable } from "@/lib/types";

// High resolution + high error correction: these get printed on cheap
// thermal Glovo-bag flyers and table tents, which need the scan margin.
const QR_SIZE = 1024;
const QR_LEVEL = "H" as const;

function download(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function QrCards({
  tables,
  restaurantSlug,
}: {
  tables: DiningTable[];
  restaurantSlug: string;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const promoRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">QR codes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un QR par table, plus un QR promo pour les sacs de livraison.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-4" /> Imprimer tout
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-2">
        {tables.map((t) => {
          const url = `${origin}/${restaurantSlug}/menu?table=${encodeURIComponent(t.number)}`;
          return (
            <div
              key={t.id}
              className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center print:break-inside-avoid"
            >
              <QRCodeCanvas
                ref={(el) => {
                  canvasRefs.current[t.id] = el;
                }}
                value={url}
                size={QR_SIZE}
                level={QR_LEVEL}
                style={{ width: "128px", height: "128px" }}
                className="rounded-lg shadow-sm"
              />
              <p className="text-[13px] font-bold text-foreground">Table {t.number}</p>
              <Button
                variant="ghost"
                size="sm"
                className="print:hidden rounded-lg font-bold text-muted-foreground hover:text-foreground mt-2"
                onClick={() => {
                  const canvas = canvasRefs.current[t.id];
                  if (canvas) download(canvas, `table-${t.number}.png`);
                }}
              >
                <Download className="size-4 mr-2" /> Télécharger
              </Button>
            </div>
          );
        })}

        <div className="flex flex-col items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center print:break-inside-avoid">
          <QRCodeCanvas
            ref={promoRef}
            value={`${origin}/${restaurantSlug}/menu`}
            size={QR_SIZE}
            level={QR_LEVEL}
            style={{ width: "128px", height: "128px" }}
            className="rounded-lg shadow-sm"
          />
          <p className="text-[13px] font-bold text-primary">QR Livraison / Promo</p>
          <Button
            variant="ghost"
            size="sm"
            className="print:hidden rounded-lg font-bold text-primary hover:text-primary hover:bg-primary/10 mt-2"
            onClick={() => {
              if (promoRef.current) download(promoRef.current, "promo-livraison.png");
            }}
          >
            <Download className="size-4 mr-2" /> Télécharger
          </Button>
        </div>
      </div>
    </div>
  );
}
