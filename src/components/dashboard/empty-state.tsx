import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  cta,
  className,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  cta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
