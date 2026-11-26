import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DrinkDetail } from "@/components/drink-detail";
import { findCatalogDrink, loadCatalog } from "@/lib/catalog-db";
import { offerLetters } from "@/lib/drink-session";
import { findDrinkById } from "@/lib/drinks";
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
  const drink = findDrinkById(drinks, id);
  if (!drink) notFound();

  const index = offerLetters.findIndex((letter) => letter === oferta);
  const offerIndex = index >= 0 ? index : undefined;
  const pricedEstablishments = (drink.establishmentPrices ?? []).flatMap(({ establishmentId, priceCents }) => {
    const establishment = establishments.find(({ id }) => id === establishmentId);
    return establishment ? [{ ...establishment, priceCents }] : [];
  });
  return <DrinkDetail key={`${drink.id}-${offerIndex}`} drink={drink} related={relatedDrinks(drink, drinks).slice(0, 6)}
    offerIndex={offerIndex} pricedEstablishments={pricedEstablishments} />;
}
