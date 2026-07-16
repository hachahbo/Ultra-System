"use client";

import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

// ── Types ─────────────────────────────────────────────────────
interface TablePickerModalProps {
  open: boolean;
  onClose: () => void;
  /** Currently selected table number as string, e.g. "3" or "" for none */
  selected: string;
  /** Called with the table number string when user picks one */
  onSelect: (value: string) => void;
  /** Set of table number strings that are reserved/unavailable */
  reservedTables?: Set<string>;
}

// Matches the layout from reservation-form.tsx exactly
const TABLE_DEFS = [
  { id: 1, span: 1 },
  { id: 2, span: 2 },
  { id: 3, span: 1 },
  { id: 4, span: 1 },
  { id: 5, span: 1 },
  { id: 6, span: 2 },
  { id: 7, span: 1 },
  { id: 8, span: 2 },
  { id: 9, span: 1 },
];

// ── Shared Legend ──────────────────────────────────────────────
function TableLegend() {
  return (
    <div className="flex items-center gap-4 text-[11px] mt-2 font-medium">
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-sm bg-primary dark:bg-[#DF6C32]" />
        <span className="text-muted-foreground">Selected</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-sm bg-muted/80" />
        <span className="text-muted-foreground">Reserved</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="size-3 rounded-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
        <span className="text-muted-foreground">Available</span>
      </div>
    </div>
  );
}

// ── Shared Grid ────────────────────────────────────────────────
function TableGrid({
  selectedId,
  reservedTables,
  onSelect,
}: {
  selectedId?: number;
  reservedTables: Set<string>;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4 mx-auto">
      {TABLE_DEFS.map((t) => {
        const isSelected = selectedId === t.id;
        const isReserved = reservedTables.has(String(t.id));
        const spanCol = t.span === 2 ? "col-span-2" : "col-span-1";

        return (
          <button
            key={t.id}
            type="button"
            disabled={isReserved}
            onClick={() => onSelect(t.id)}
            className={cn(
              "relative flex items-center justify-center rounded-2xl border-2 border-transparent py-7 font-bold text-lg transition-all",
              spanCol,
              isSelected
                ? "bg-primary text-primary-foreground scale-95 shadow-md border-primary/20 dark:bg-[#DF6C32] dark:text-white dark:border-[#DF6C32]/20"
                : isReserved
                  ? "bg-muted/40 text-muted-foreground opacity-50 cursor-not-allowed"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            {/* Side chair marks */}
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-foreground/10 rounded-full" />
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-foreground/10 rounded-full" />

            {/* Top / bottom chair marks for rectangular tables */}
            {t.span === 2 && (
              <>
                <div className="absolute top-0 left-1/4 w-6 h-1.5 bg-foreground/10 rounded-full" />
                <div className="absolute top-0 right-1/4 w-6 h-1.5 bg-foreground/10 rounded-full" />
                <div className="absolute bottom-0 left-1/4 w-6 h-1.5 bg-foreground/10 rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-6 h-1.5 bg-foreground/10 rounded-full" />
              </>
            )}

            {/* Top / bottom chair marks for square tables */}
            {t.span === 1 && (
              <>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-foreground/10 rounded-full" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-foreground/10 rounded-full" />
              </>
            )}

            {t.id}
          </button>
        );
      })}
    </div>
  );
}

// ── Confirm button (shared) ────────────────────────────────────
function ConfirmButton({
  selected,
  onConfirm,
}: {
  selected?: string;
  onConfirm: () => void;
}) {
  return (
    <Button
      size="lg"
      type="button"
      onClick={onConfirm}
      className={cn(
        "w-full font-bold shadow-md transition-colors",
        !selected
          ? "bg-muted text-muted-foreground hover:bg-muted"
          : "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-[#DF6C32] dark:text-white dark:hover:bg-[#C95A26]"
      )}
    >
      {selected ? `Confirmer — Table ${selected}` : "Sélectionnez une table"}
    </Button>
  );
}

// ── Component ─────────────────────────────────────────────────
export function TablePickerModal({
  open,
  onClose,
  selected,
  onSelect,
  reservedTables = new Set(),
}: TablePickerModalProps) {
  const isMobile = useIsMobile();
  const selectedNum = selected ? Number(selected) : undefined;

  function handleSelect(id: number) {
    const str = String(id);
    onSelect(selected === str ? "" : str);
  }

  function handleConfirm() {
    if (selected) onClose();
  }

  // ── Mobile: Drawer ─────────────────────────────────────────
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="dark:bg-[#0a0a0c] dark:border-border max-h-[85vh]">
          <div className="mx-auto w-full max-w-sm">

            {/* Header */}
            <DrawerHeader className="text-left px-4">
              <DrawerTitle className="text-lg">Choisir une table</DrawerTitle>
              <TableLegend />
            </DrawerHeader>

            {/* Grid */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <TableGrid
                selectedId={selectedNum}
                reservedTables={reservedTables}
                onSelect={handleSelect}
              />
            </div>

            {/* Footer */}
            <DrawerFooter className="pt-2 px-4 pb-6">
              <DrawerClose asChild>
                <ConfirmButton selected={selected} onConfirm={handleConfirm} />
              </DrawerClose>
            </DrawerFooter>

          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // ── Desktop: Dialog ─────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "sm:max-w-[460px] rounded-2xl p-0 overflow-hidden gap-0",
          "dark:bg-[#0a0a0c] dark:border-border"
        )}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold">
              Choisir une table
            </DialogTitle>
            <DialogClose asChild>
              <button
                aria-label="Fermer"
                className="w-8 h-8 rounded-full grid place-items-center bg-white/[0.08] border border-white/[0.1] text-white/50 hover:bg-white/[0.14] hover:text-white transition-all"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                  <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            </DialogClose>
          </div>
          <TableLegend />
        </DialogHeader>

        {/* Grid */}
        <div className="p-5 pt-4">
          <TableGrid
            selectedId={selectedNum}
            reservedTables={reservedTables}
            onSelect={handleSelect}
          />
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 pt-1">
          <ConfirmButton selected={selected} onConfirm={handleConfirm} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
