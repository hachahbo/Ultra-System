"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { RestaurantStatus } from "@/lib/types";

export function SuspendedNotice({ status }: { status: RestaurantStatus }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {status === "expired" ? "Essai expiré" : "Compte suspendu"}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {status === "expired"
            ? "Votre période d'essai est terminée. Contactez Darna pour souscrire à un plan."
            : "Votre accès au tableau de bord est suspendu. Contactez Darna pour le réactiver."}
        </p>
        <Button variant="outline" className="mt-6" onClick={signOut}>
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}
