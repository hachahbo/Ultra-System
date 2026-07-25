"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, Monitor } from "lucide-react";
import type { DiningTable } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

export type TableStatus = "default" | "active" | "reserved" | "free" | "selected";

const statusStyles: Record<TableStatus, { wrapper: string; border: string; text: string; subtext: string }> = {
  default: { wrapper: "bg-[#1b2431]", border: "border-border/50", text: "text-white", subtext: "text-muted-foreground" },
  free: { wrapper: "bg-[#1b2431]", border: "border-[#4ec27f]", text: "text-white", subtext: "text-[#4ec27f]" },
  active: { wrapper: "bg-[#1b2431]", border: "border-[#e6a92f]", text: "text-white", subtext: "text-[#e6a92f]" },
  reserved: { wrapper: "bg-[#1b2431]", border: "border-[#e0574a]", text: "text-white", subtext: "text-[#e0574a]" },
  selected: { wrapper: "bg-[#1b2431]", border: "border-primary", text: "text-white", subtext: "text-primary" },
};

/**
 * Shared 2D floor-plan grid. Deliberately a "shapes on a grid" layout, not a
 * CAD tool — positions are 0..1 fractions of the container so it works at
 * any viewport size.
 */
export function FloorPlanMap({
  tables,
  mode,
  aspect = 2.2,
  getStatus,
  pulse,
  badge,
  onTableTap,
  onTableMove,
}: {
  tables: DiningTable[];
  mode: "view" | "edit";
  aspect?: number;
  getStatus?: (t: DiningTable) => TableStatus;
  pulse?: (t: DiningTable) => boolean;
  badge?: (t: DiningTable) => React.ReactNode;
  onTableTap?: (t: DiningTable) => void;
  onTableMove?: (id: string, posX: number, posY: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragPos, setDragPos] = useState<Record<string, { x: number; y: number }>>({});
  const [verticalMobile, setVerticalMobile] = useState(true);
  const draggingId = useRef<string | null>(null);

  const isMobile = useIsMobile();
  const canDrag = mode === "edit" && !isMobile;

  const clamp = (v: number) => Math.min(0.94, Math.max(0.06, v));

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const id = draggingId.current;
    const container = containerRef.current;
    if (!id || !container) return;
    const rect = container.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width);
    const y = clamp((clientY - rect.top) / rect.height);
    setDragPos((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, table: DiningTable) {
    if (!canDrag) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingId.current = table.id;
    setDragPos((prev) => ({ ...prev, [table.id]: { x: table.pos_x, y: table.pos_y } }));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!canDrag || !draggingId.current) return;
    updateFromPointer(e.clientX, e.clientY);
  }

  function handlePointerUp(table: DiningTable) {
    if (!canDrag || draggingId.current !== table.id) return;
    const pos = dragPos[table.id];
    draggingId.current = null;
    setDragPos((prev) => {
      const next = { ...prev };
      delete next[table.id];
      return next;
    });
    if (pos) {
      const dx = Math.abs(pos.x - table.pos_x);
      const dy = Math.abs(pos.y - table.pos_y);
      if (dx > 0.005 || dy > 0.005) {
        onTableMove?.(table.id, pos.x, pos.y);
      } else {
        onTableTap?.(table);
      }
    } else {
      onTableTap?.(table);
    }
  }

  // On mobile: portrait aspect ratio (0.85) when vertical mode is active,
  // providing a perfectly proportioned grid without excess top/bottom space.
  const isVertical = isMobile && verticalMobile;
  const effectiveAspect = isMobile ? (isVertical ? 0.85 : 1.35) : aspect;

  return (
    <div className="relative w-full flex flex-col">
      {/* Mobile Orientation Toggle Header */}
      {isMobile && (
        <div className="mb-3 flex items-center justify-between px-1">
          <span className="text-xs font-bold text-foreground">
            Plan de salle {isVertical ? "vertical (Mobile)" : "horizontal"}
          </span>
          <button
            type="button"
            onClick={() => setVerticalMobile((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all active:scale-95 shadow-xs"
          >
            {isVertical ? (
              <>
                <Smartphone className="size-3.5" /> Affichage vertical
              </>
            ) : (
              <>
                <Monitor className="size-3.5" /> Mode panoramique
              </>
            )}
          </button>
        </div>
      )}

      {/* Main Floor Plan Grid */}
      <div className={`w-full ${isMobile && !isVertical ? "overflow-x-auto pb-2 scrollbar-thin" : ""}`}>
        <div
          ref={containerRef}
          className={`relative w-full overflow-hidden rounded-2xl bg-[#0a0a0c] select-none ring-1 ring-border/80 shadow-2xl transition-all duration-300 ${
            canDrag ? "touch-none" : ""
          }`}
          style={{
            aspectRatio: effectiveAspect,
            minWidth: isMobile && !isVertical ? "540px" : "100%",
          }}
        >
          {/* Subtle grid lines background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800d_1px,transparent_1px),linear-gradient(to_bottom,#8080800d_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          {tables.map((table, i) => {
            const rawPos = dragPos[table.id] ?? { x: table.pos_x, y: table.pos_y };
            const status = getStatus?.(table) ?? "default";
            const isPulsing = pulse?.(table) ?? false;
            const isDragging = dragPos[table.id] !== undefined;
            const isRect = table.seats > 2;

            // Spread functions to center columns and space rows evenly across the mobile vertical screen
            const mobX = 0.28 + (rawPos.y - 0.20) * 1.46; // Centers Column 1 at 28% and Column 2 at 72%
            const mobY = 0.14 + rawPos.x * 0.72; // Even vertical distribution down the portrait screen

            const displayX = isVertical ? clamp(mobX) : rawPos.x;
            const displayY = isVertical ? clamp(mobY) : rawPos.y;

            // Sleek pill size to ensure clear spacing
            const width = isMobile ? 74 : 136;
            const height = isMobile ? 44 : 72;
            const styles = statusStyles[status];

            const zoneName = table.number.toString().toUpperCase().includes("T") ? "Terrasse" : "Salle";
            const displayZone = isMobile ? (zoneName === "Terrasse" ? "Terr." : "Sal.") : zoneName;

            return (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.04, type: "spring", bounce: 0.35 }}
                className={`absolute ${isDragging ? "" : "transition-[left,top] duration-200 ease-out"}`}
                style={{
                  left: `${displayX * 100}%`,
                  top: `${displayY * 100}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: isDragging ? 50 : 10,
                }}
                onPointerDown={(e) => handlePointerDown(e, table)}
                onPointerMove={handlePointerMove}
                onPointerUp={() => handlePointerUp(table)}
                onPointerCancel={() => handlePointerUp(table)}
              >
                {isPulsing && (
                  <span className="absolute inset-0 animate-ping rounded-[24px] bg-primary/40" />
                )}

                <motion.button
                  type="button"
                  whileHover={{ scale: canDrag ? 1.05 : 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onTableTap?.(table)}
                  className={`relative flex flex-col items-center justify-center font-bold transition-all shadow-2xl ${
                    isMobile ? "rounded-[14px] border-[2px]" : "rounded-[20px] border-[3px]"
                  } ${styles.wrapper} ${styles.border} ${
                    canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                  }`}
                  style={{ width, height }}
                >
                  {/* Outer floating chairs (left/right) */}
                  <div className={`absolute top-1/2 -translate-y-1/2 bg-[#2a2a2c] rounded-full shadow-sm ${isMobile ? "-left-1.5 w-1 h-3.5" : "-left-3 w-1.5 h-8"}`} />
                  <div className={`absolute top-1/2 -translate-y-1/2 bg-[#2a2a2c] rounded-full shadow-sm ${isMobile ? "-right-1.5 w-1 h-3.5" : "-right-3 w-1.5 h-8"}`} />

                  {/* Top/bottom chairs depending on shape */}
                  {isRect ? (
                    <>
                      <div className={`absolute left-[20%] w-[22%] bg-[#2a2a2c] rounded-full shadow-sm ${isMobile ? "-top-1.5 h-0.5" : "-top-3 h-1.5"}`} />
                      <div className={`absolute right-[20%] w-[22%] bg-[#2a2a2c] rounded-full shadow-sm ${isMobile ? "-top-1.5 h-0.5" : "-top-3 h-1.5"}`} />
                      <div className={`absolute left-[20%] w-[22%] bg-[#2a2a2c] rounded-full shadow-sm ${isMobile ? "-bottom-1.5 h-0.5" : "-bottom-3 h-1.5"}`} />
                      <div className={`absolute right-[20%] w-[22%] bg-[#2a2a2c] rounded-full shadow-sm ${isMobile ? "-bottom-1.5 h-0.5" : "-bottom-3 h-1.5"}`} />
                    </>
                  ) : (
                    <>
                      <div className={`absolute left-1/2 -translate-x-1/2 w-[35%] bg-[#2a2a2c] rounded-full shadow-sm ${isMobile ? "-top-1.5 h-0.5" : "-top-3 h-1.5"}`} />
                      <div className={`absolute left-1/2 -translate-x-1/2 w-[35%] bg-[#2a2a2c] rounded-full shadow-sm ${isMobile ? "-bottom-1.5 h-0.5" : "-bottom-3 h-1.5"}`} />
                    </>
                  )}

                  <span className={`font-display font-extrabold ${isMobile ? "text-xs leading-none" : "text-2xl"} ${styles.text}`}>
                    {table.number}
                  </span>
                  <span className={`font-semibold tracking-tight whitespace-nowrap ${isMobile ? "text-[8.5px] mt-0.5" : "text-[11px] mt-1"} ${styles.subtext}`}>
                    {table.seats}p • {displayZone}
                  </span>

                  {badge && <span className="absolute -right-1.5 -top-1.5">{badge(table)}</span>}
                </motion.button>
              </motion.div>
            );
          })}

          {tables.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
              Aucune table configurée.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


