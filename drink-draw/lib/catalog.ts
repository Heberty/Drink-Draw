import { catalog, type Drink } from "@/lib/drinks";
import { initialEstablishments, initialEstablishmentTypes, type Establishment } from "@/lib/establishments";
import { initialEvents, type CatalogEvent } from "@/lib/events";

export type CatalogChoice = { id: string; name: string };
export type ChoiceCollection = "brands" | "types" | "packagingTypes";

export type CatalogData = {
  drinks: Drink[];
  establishments: Establishment[];
  establishmentTypes: CatalogChoice[];
  events: CatalogEvent[];
  brands: CatalogChoice[];
  types: CatalogChoice[];
  packagingTypes: CatalogChoice[];
};

export type CatalogRecord<K extends keyof CatalogData> = CatalogData[K][number];

export class CatalogValidationError extends Error {}

export const catalogCollections = ["drinks", "establishments", "establishmentTypes", "events", "brands", "types", "packagingTypes"] as const;
export type CatalogImageCollection = "drinks" | "establishments" | "events";

export function isCatalogImageCollection(value: unknown): value is CatalogImageCollection {
  return value === "drinks" || value === "establishments" || value === "events";
}

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
  return collection === "brands" ? "brand" : collection === "types" ? "type" : "packaging";
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
  establishmentTypes: initialEstablishmentTypes.map((name) => ({ id: labelKey(name), name })),
  events: initialEvents,
  brands: choicesFromDrinks(catalog, "brands"),
  types: choicesFromDrinks(catalog, "types"),
  packagingTypes: choicesFromDrinks(catalog, "packagingTypes"),
};

