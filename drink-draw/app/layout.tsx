import type { Metadata } from "next";
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
          </CatalogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
