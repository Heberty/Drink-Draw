"use client";

import Link from "next/link";
import { BookOpen, CupSoda } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { useCatalog } from "@/components/catalog-provider";
import { Card } from "@/components/ui/card";

export function DrinksCatalog() {
  const { drinks, ready } = useCatalog();

  return (
    <main className="frame dashboard">
      <div className="page-intro">
        <span className="overline"><BookOpen aria-hidden="true" /> Catálogo</span>
        <h1>Bebidas<span>.</span></h1>
        <p>Abra uma bebida para ver a ficha completa.</p>
      </div>
      {drinks.length === 0 ? (
        <Card className="admin-empty">{ready ? "Nenhuma bebida cadastrada." : "Carregando bebidas…"}</Card>
      ) : (
        <ul className="public-catalog">
          {drinks.map((drink) => (
            <li key={drink.id}>
              <Link href={`/bebidas/${drink.id}`} className="public-catalog-link">
                <span className="admin-record-media">{drink.image ? <CatalogImage image={drink.image} /> : <CupSoda aria-hidden="true" />}</span>
                <span className="admin-record-copy"><strong>{drink.name}</strong><span>{drink.type} · {drink.volume} mL · {drink.packaging}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
