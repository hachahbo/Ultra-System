import Link from "next/link";

// Root of the multi-tenant app — each restaurant lives at /<slug>.
export default function RootPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="grid mx-auto size-12 place-items-center rounded-full bg-primary font-display text-2xl font-bold text-primary-foreground">
          D
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
          Darna
        </h1>
        <p className="mt-3 text-muted-foreground">
          Commande directe et réservations pour les restaurants. Chaque
          restaurant a son propre site — scannez le QR code de votre
          restaurant pour commander.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Espace restaurateur
        </Link>
      </div>
    </main>
  );
}
