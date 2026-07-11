"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { DiningTable } from "@/lib/types";

export type TableStatus = "default" | "active" | "reserved" | "free" | "selected";

const statusClasses: Record<TableStatus, string> = {
  default: "bg-card text-foreground ring-border",
  active: "bg-primary text-primary-foreground ring-primary/50",
  reserved: "bg-destructive/85 text-white ring-destructive/40",
  free: "bg-emerald-500/85 text-white ring-emerald-500/40",
  selected: "bg-card text-foreground ring-2 ring-primary",
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
  aspect = 4 / 3,
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
  // Local optimistic position while a marker is actively being dragged —
  // avoids fighting the parent's re-render until onTableMove's request
  // resolves and the real pos_x/pos_y catches up.
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
    // Hand off to the parent and drop the local override immediately —
    // once the parent's data refetches, the marker must reflect the
    // server's truth (not this drag's guess), especially on a concurrency
    // conflict where another edit already won.
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
      className="relative w-full touch-none overflow-hidden rounded-xl bg-muted select-none ring-1 ring-border"
      style={{ aspectRatio: aspect }}
    >
      {tables.map((table) => {
        const pos = dragPos[table.id] ?? { x: table.pos_x, y: table.pos_y };
        const status = getStatus?.(table) ?? "default";
        const isPulsing = pulse?.(table) ?? false;
        const isDragging = dragPos[table.id] !== undefined;
        const size = Math.min(64, 40 + table.seats * 2.5);

        return (
          <div
            key={table.id}
            className={`absolute ${isDragging ? "" : "transition-[left,top] duration-150 ease-out"}`}
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
            onPointerDown={(e) => handlePointerDown(e, table)}
            onPointerMove={handlePointerMove}
            onPointerUp={() => handlePointerUp(table)}
            onPointerCancel={() => handlePointerUp(table)}
          >
            {isPulsing && (
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
            )}
            <motion.button
              type="button"
              whileTap={{ scale: mode === "edit" ? 1.12 : 0.94 }}
              onClick={() => mode === "view" && onTableTap?.(table)}
              className={`relative flex flex-col items-center justify-center rounded-full text-xs font-bold ring-2 transition-colors ${
                statusClasses[status]
              } ${mode === "edit" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
              style={{ width: size, height: size }}
            >
              <span>{table.number}</span>
              <span className="text-[9px] font-medium opacity-80">{table.seats}p</span>
              {badge && <span className="absolute -right-1 -top-1">{badge(table)}</span>}
            </motion.button>
          </div>
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
