import { LoadingIcon } from "@/components/ui/loading-icon";

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <LoadingIcon className="size-16" />
      <p className="text-sm font-medium text-muted-foreground animate-pulse">
        Chargement...
      </p>
    </div>
  );
}
