import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DrinkDetail } from "@/components/drink-detail";
import { findCatalogDrink, loadCatalog } from "@/lib/catalog-db";
import { offerLetters } from "@/lib/drink-session";
import { relatedDrinks } from "@/lib/related-drinks";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ oferta?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const drink = findCatalogDrink(id);
  if (!drink) return { title: "Ficha da bebida | Drink Draw" };

  return { title: `${drink.name} · ${drink.volume} mL | Drink Draw`, description: drink.description };
}

export default async function DrinkPage({ params, searchParams }: Props) {
  const [{ id }, { oferta }] = await Promise.all([params, searchParams]);
  const { drinks, establishments } = loadCatalog();
  const drink = drinks.find((item) => item.id === id);
  if (!drink) notFound();

  const index = offerLetters.findIndex((letter) => letter === oferta);
  const offerIndex = index >= 0 ? index : undefined;
  const referenceEstablishment = establishments.find(({ id }) => id === drink.referenceEstablishmentId);
  return <DrinkDetail key={`${id}-${offerIndex}`} drink={drink} related={relatedDrinks(drink, drinks).slice(0, 6)}
    offerIndex={offerIndex} referenceEstablishment={referenceEstablishment} />;
}
