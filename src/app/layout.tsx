import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Header } from "@/components/header";
import { listAccounts } from "@/lib/queries";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MoneyPlan",
  description: "Suivi de PEA et de DCA mensuel",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const accounts = listAccounts().map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
  }));
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
        >
          Aller au contenu
        </a>
        <Header accounts={accounts} />
        <main id="contenu" className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-10">
          {children}
        </main>
        <footer className="mx-auto max-w-6xl border-t border-edge px-5 py-6 md:px-8">
          <p className="text-xs text-muted">
            Données locales (SQLite) · cours Yahoo Finance · les performances
            passées ne préjugent pas des performances futures.
          </p>
        </footer>
        <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: "2px" } }} />
      </body>
    </html>
  );
}
