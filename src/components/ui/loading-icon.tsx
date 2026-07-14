import { cn } from "@/lib/utils";

export function LoadingIcon({ className }: { className?: string }) {
  return (
    <div className={cn("relative flex items-center justify-center size-12", className)}>
      {/* Outer spinning dashed ring */}
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[oklch(0.685_0.165_45)] border-r-[oklch(0.685_0.165_45)]/30 animate-[spin_1.5s_linear_infinite]" />
      
      {/* Inner spinning solid ring */}
      <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-[oklch(0.685_0.165_45)] border-l-[oklch(0.685_0.165_45)]/30 animate-[spin_1s_ease-in-out_infinite_reverse]" />
      
      {/* Center pulsing dot */}
      <div className="size-2.5 rounded-full bg-[oklch(0.685_0.165_45)] animate-pulse" />
    </div>
  );
}
