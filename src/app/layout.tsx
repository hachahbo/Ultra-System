import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { WebVitalsReporter } from "@/components/web-vitals-reporter";
import { rootFontClassNames } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Darna — Commande directe & réservations",
    template: "%s · Darna",
  },
  description:
    "Commandez directement auprès de votre restaurant préféré : menu, livraison, réservation de table.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Cookie-derived locale (src/i18n/request.ts). Drives <html lang> and the
  // client provider — messages are forwarded from the request config.
  const locale = await getLocale();

  // EMD design system flag. It has to sit on <html> rather than the dashboard
  // layout's own wrapper because dialogs, dropdowns and sonner toasts portal to
  // document.body — a wrapper-scoped attribute would leave all of them on the
  // public site's warm palette. Pathname comes from the x-pathname header that
  // proxy.ts forwards; Server Components have no other way to read the URL.
  // Public [slug] pages are deliberately excluded — they keep their own theme.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const emd = pathname.startsWith("/dashboard") || undefined;

  return (
    <html
      lang={locale}
      data-emd={emd}
      className={`${rootFontClassNames} h-full antialiased overflow-x-hidden`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans transition-colors duration-500 overflow-x-hidden" suppressHydrationWarning>
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange={false}
          >
            {children}
            <Toaster position="top-center" richColors />
            <WebVitalsReporter />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
