import { Lock } from "lucide-react";

// Shown instead of a 404 when a Super-Admin-set feature toggle is off for
// this restaurant's plan — a direct URL hit should explain why, not error.
export function FeatureLocked({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
      <Lock className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">{feature} non activé</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Cette fonctionnalité n&apos;est pas incluse dans votre offre actuelle.
          Contactez Darna pour l&apos;activer.
        </p>
      </div>
    </div>
  );
}
