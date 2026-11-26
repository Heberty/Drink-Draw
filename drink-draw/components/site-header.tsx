"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Comparador" },
  { href: "/bebidas", label: "Catálogo" },
  { href: "/mapa", label: "Mapa" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="header-content frame">
        <Link className="brand" href="/">
          <Image src="/brand.svg" alt="" width={40} height={40} />
          <span>Drink<span className="brand-accent"> Draw</span></span>
        </Link>
        <nav className="site-nav" aria-label="Menu principal">
          {links.map(({ href, label }) => {
            const inSection = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
            return <Link key={href} href={href} aria-current={pathname === href ? "page" : inSection ? "location" : undefined}>{label}</Link>;
          })}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Button asChild variant="outline" size="icon" className="header-icon-button">
            <Link href="/admin" aria-label="Administração" title="Administração"
              aria-current={pathname === "/admin" ? "page" : pathname.startsWith("/admin/") ? "location" : undefined}>
              <LockKeyhole aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
