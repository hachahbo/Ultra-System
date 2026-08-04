"use client";

import { useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { Download, X, Users, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiningTable } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const QR_SIZE = 1024; // high-res for crisp download
const QR_LEVEL = "H" as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Downloads the raw QR canvas as a plain high-res PNG.
 */
function downloadRaw(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/**
 * Composites the QR onto a branded card canvas then downloads the result.
 * Card dimensions: 1200×1200 dark card with restaurant name + table number.
 */
function downloadBranded(
  qrCanvas: HTMLCanvasElement,
  tableNumber: string,
  restaurantSlug: string,
) {
  const W = 1200;
  const H = 1200;
  const pad = 80;
  const qrBox = 800;

  const offscreen = document.createElement("canvas");
  offscreen.width = W;
  offscreen.height = H;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return;

  // Dark background
  ctx.fillStyle = "#1C1917";
  ctx.roundRect(0, 0, W, H, 48);
  ctx.fill();

  // Subtle grid pattern
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // QR white card
  const qrX = (W - qrBox) / 2;
  const qrY = pad + 60;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect(qrX - 24, qrY - 24, qrBox + 48, qrBox + 48, 32);
  ctx.fill();

  // QR code
  ctx.drawImage(qrCanvas, qrX, qrY, qrBox, qrBox);

  // Orange accent line
  ctx.fillStyle = "#FF6B35";
  ctx.beginPath();
  ctx.roundRect((W - 120) / 2, qrY + qrBox + 60, 120, 6, 3);
  ctx.fill();

  // Restaurant slug label
  ctx.fillStyle = "#FF6B35";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(restaurantSlug.toUpperCase(), W / 2, qrY + qrBox + 130);

  // Table number
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 72px system-ui, sans-serif";
  ctx.fillText(`Table ${tableNumber}`, W / 2, qrY + qrBox + 210);

  // Hint text
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "32px system-ui, sans-serif";
  ctx.fillText("Scannez pour commander", W / 2, qrY + qrBox + 275);

  downloadRaw(offscreen, `table-${tableNumber}-branded.png`);
}

// ─── Animation variants ───────────────────────────────────────────────────────

const backdropV = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const panelV = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 26 } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.18 } },
};

// ─── QrPreviewModal ───────────────────────────────────────────────────────────

export function QrPreviewModal({
  table,
  restaurantSlug,
  onClose,
}: {
  table: DiningTable | null;
  restaurantSlug: string;
  onClose: () => void;
}) {
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const isOpen = table !== null;

  const qrUrl = table
    ? `${origin}/${restaurantSlug}/menu?table=${encodeURIComponent(table.number)}`
    : "";

  const handleDownloadBranded = useCallback(() => {
    if (!qrRef.current || !table) return;
    downloadBranded(qrRef.current, table.number, restaurantSlug);
  }, [table, restaurantSlug]);

  const handleDownloadRaw = useCallback(() => {
    if (!qrRef.current || !table) return;
    downloadRaw(qrRef.current, `table-${table.number}-qr.png`);
  }, [table]);

  if (typeof window === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="qr-backdrop"
          variants={backdropV}
          initial="hidden"
          animate="show"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            key="qr-panel"
            variants={panelV}
            initial="hidden"
            animate="show"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden bg-[#1C1917] border border-stone-800 shadow-2xl ring-1 ring-white/10"
          >
            {/* Subtle grid bg */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.035]"
              style={{
                backgroundImage:
                  "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/10 border border-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* Header */}
            <div className="relative z-10 px-6 pt-6 pb-2">
              <div className="flex items-center gap-2 text-[#FF6B35]">
                <QrCode className="size-4" />
                <span className="text-xs font-bold uppercase tracking-widest">QR Code</span>
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold text-white">
                Table {table?.number}
              </h2>
              <div className="mt-1.5 flex items-center gap-1.5 text-white/50">
                <Users className="size-3.5" />
                <span className="text-xs font-semibold">{table?.seats} places</span>
              </div>
            </div>

            {/* QR Card */}
            <div className="relative z-10 mx-6 my-4 rounded-2xl bg-white p-5 shadow-lg flex items-center justify-center">
              {/* Hidden high-res canvas */}
              <QRCodeCanvas
                ref={qrRef}
                value={qrUrl}
                size={QR_SIZE}
                level={QR_LEVEL}
                style={{ display: "none" }}
              />
              {/* Visible preview canvas */}
              <QRCodeCanvas
                value={qrUrl}
                size={220}
                level={QR_LEVEL}
                className="rounded-md"
              />
            </div>

            {/* URL hint */}
            <div className="relative z-10 mx-6 mb-4">
              <p className="truncate rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-[11px] font-mono text-white/40">
                {qrUrl}
              </p>
            </div>

            {/* Download buttons */}
            <div className="relative z-10 flex flex-col gap-2.5 border-t border-stone-800 px-6 py-5">
              {/* Branded download — primary */}
              <button
                type="button"
                onClick={handleDownloadBranded}
                className="flex items-center justify-center gap-2 w-full rounded-full bg-[#FF6B35] py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(255,107,53,0.35)] transition-all hover:bg-[#FF6B35]/90 hover:shadow-[0_12px_32px_rgba(255,107,53,0.45)] active:scale-[0.98]"
              >
                <Download className="size-4" />
                Télécharger (avec style)
              </button>

              {/* Raw QR — ghost */}
              <button
                type="button"
                onClick={handleDownloadRaw}
                className="flex items-center justify-center gap-2 w-full rounded-full border border-stone-700 bg-transparent py-3 text-sm font-semibold text-white/60 transition-all hover:border-stone-500 hover:text-white/90 active:scale-[0.98]"
              >
                <Download className="size-3.5" />
                QR simple (PNG)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
