import { catalog, type Drink } from "@/lib/drinks";
import { initialEstablishments, type Establishment } from "@/lib/establishments";

export type CatalogChoice = { id: string; name: string };
export type ChoiceCollection = "brands" | "types";

export type CatalogData = {
  drinks: Drink[];
  establishments: Establishment[];
  brands: CatalogChoice[];
  types: CatalogChoice[];
};

export type CatalogRecord<K extends keyof CatalogData> = CatalogData[K][number];

export class CatalogValidationError extends Error {}

export const catalogCollections = ["drinks", "establishments", "brands", "types"] as const;

export function isCatalogCollection(value: unknown): value is keyof CatalogData {
  return catalogCollections.some((collection) => collection === value);
}

export function labelKey(name: string) {
  return name.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
}

export function catalogChoiceName(options: CatalogChoice[], name: string) {
  return options.find((item) => labelKey(item.name) === labelKey(name))?.name ?? "";
}

export function choiceField(collection: ChoiceCollection) {
  return collection === "brands" ? "brand" : "type";
}

export function choicesFromDrinks(drinks: Drink[], collection: ChoiceCollection) {
  const items = new Map<string, CatalogChoice>();
  for (const drink of drinks) {
    const name = drink[choiceField(collection)].trim();
    const id = labelKey(name);
    if (id && !items.has(id)) items.set(id, { id, name });
  }
  return [...items.values()];
}

export const initialCatalog: CatalogData = {
  drinks: catalog,
  establishments: initialEstablishments,
  brands: choicesFromDrinks(catalog, "brands"),
  types: choicesFromDrinks(catalog, "types"),
};

