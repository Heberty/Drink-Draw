import type { Metadata } from "next";
import Link from "next/link";
import { ThemeProvider } from "next-themes";
import { CatalogProvider } from "@/components/catalog-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Drink Draw | Comparador de bebidas",
  description: "Compare até quatro ofertas de bebidas pelo preço por litro e organize seus estabelecimentos.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <CatalogProvider>
            <SiteHeader />
            {children}
            <footer className="site-footer frame">
              <span>Drink Draw</span>
              <p>Os valores mostrados em tela são valores aproximados e podem sofrer alterações sem aviso prévio.</p>
              <Link href="/termos-de-uso">Termos de uso</Link>
            </footer>
          </CatalogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
