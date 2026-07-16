"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { DiningTable } from "@/lib/types";

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
 *
 * Three consumers: Tables editor (mode="edit", drag to reposition), the live
 * orders map (mode="view", highlights the table with an active order), and
 * the reservations map (mode="view", shades reserved vs free for a slot).
 */
export function FloorPlanMap({
  tables,
  mode,
  aspect = 2.2, // Significantly reduced height (panoramic) to match the screenshots perfectly
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
  // Local optimistic position while a marker is actively being dragged
  const [dragPos, setDragPos] = useState<Record<string, { x: number; y: number }>>({});
  const draggingId = useRef<string | null>(null);

  const clamp = (v: number) => Math.min(0.97, Math.max(0.03, v));

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
    if (mode !== "edit") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    draggingId.current = table.id;
    setDragPos((prev) => ({ ...prev, [table.id]: { x: table.pos_x, y: table.pos_y } }));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (mode !== "edit" || !draggingId.current) return;
    updateFromPointer(e.clientX, e.clientY);
  }

  function handlePointerUp(table: DiningTable) {
    if (mode !== "edit" || draggingId.current !== table.id) return;
    const pos = dragPos[table.id];
    draggingId.current = null;
    setDragPos((prev) => {
      const next = { ...prev };
      delete next[table.id];
      return next;
    });
    if (pos) onTableMove?.(table.id, pos.x, pos.y);
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full touch-none overflow-hidden rounded-xl bg-[#0a0a0c] select-none ring-1 ring-border shadow-inner"
      style={{ aspectRatio: aspect }}
    >
      {tables.map((table, i) => {
        const pos = dragPos[table.id] ?? { x: table.pos_x, y: table.pos_y };
        const status = getStatus?.(table) ?? "default";
        const isPulsing = pulse?.(table) ?? false;
        const isDragging = dragPos[table.id] !== undefined;
        const isRect = table.seats > 2;

        // Sleeker rectangular look with reduced height
        const width = 136;
        const height = 72;
        const styles = statusStyles[status];

        return (
          <motion.div
            key={table.id}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05, type: "spring", bounce: 0.4 }}
            className={`absolute ${isDragging ? "" : "transition-[left,top] duration-150 ease-out"}`}
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
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
              whileHover={{ scale: mode === "edit" ? 1.05 : 1.02 }}
              whileTap={{ scale: mode === "edit" ? 1.1 : 0.95 }}
              onClick={() => mode === "view" && onTableTap?.(table)}
              className={`relative flex flex-col items-center justify-center rounded-[20px] font-bold transition-all shadow-2xl border-[3px] ${styles.wrapper
                } ${styles.border} ${mode === "edit" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                }`}
              style={{ width, height }}
            >
              {/* Outer floating chairs (left/right) */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#2a2a2c] rounded-full shadow-sm" />
              <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-[#2a2a2c] rounded-full shadow-sm" />

              {/* Top/bottom chairs depending on shape */}
              {isRect ? (
                <>
                  <div className="absolute -top-3 left-[20%] w-[20%] h-1.5 bg-[#2a2a2c] rounded-full shadow-sm" />
                  <div className="absolute -top-3 right-[20%] w-[20%] h-1.5 bg-[#2a2a2c] rounded-full shadow-sm" />
                  <div className="absolute -bottom-3 left-[20%] w-[20%] h-1.5 bg-[#2a2a2c] rounded-full shadow-sm" />
                  <div className="absolute -bottom-3 right-[20%] w-[20%] h-1.5 bg-[#2a2a2c] rounded-full shadow-sm" />
                </>
              ) : (
                <>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[35%] h-1.5 bg-[#2a2a2c] rounded-full shadow-sm" />
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[35%] h-1.5 bg-[#2a2a2c] rounded-full shadow-sm" />
                </>
              )}

              <span className={`text-2xl font-display ${styles.text}`}>{table.number}</span>
              <span className={`text-[11px] font-semibold mt-1 tracking-wide ${styles.subtext}`}>
                {table.seats}p • {table.number.toString().includes('T') ? "Terrasse" : "Salle"}
              </span>

              {badge && <span className="absolute -right-2 -top-2">{badge(table)}</span>}
            </motion.button>
          </motion.div>
        );
      })}

      {tables.length === 0 && (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Aucune table configurée.
        </div>
      )}
    </div>
  );
}
