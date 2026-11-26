import { catalog, findDrinkById, isDrinkData, toDraft, type Drink, type DrinkData } from "@/lib/drinks";
import { parsePrice, parseVolume, priceFromCents } from "@/lib/compare";

export const sessionKey = "drink-draw:session:v4";
const convertedPriceSessionKey = "drink-draw:session:v3";
const previousOffersSessionKey = "drink-draw:session:v2";
const previousSessionKey = "drink-draw:session:v1";

export type Offer = {
  drinkId: string;
  price: string;
  volume: string;
  quantity: string;
  establishmentId: string;
  example: boolean;
  corrections: Partial<Record<string, DrinkData>>;
};

export const offerLetters = ["A", "B", "C", "D"] as const;
export type DrinkSession = Offer[];

export const initialSession: DrinkSession = [
  { drinkId: "sicilia", price: "4,49", volume: "350", quantity: "1", establishmentId: "", example: true, corrections: {} },
  { drinkId: "sicilia-1l", price: "9,99", volume: "1000", quantity: "1", establishmentId: "", example: true, corrections: {} },
];

export function emptyOffer(): Offer {
  return { drinkId: "", volume: "", quantity: "", price: "", establishmentId: "", example: false, corrections: {} };
}

export function offerDrink(offer: Offer, drinks: Drink[] = catalog) {
  const original = drinks.find(({ id }) => id === offer.drinkId);
  return original ? { ...original, ...offer.corrections[original.id] } : undefined;
}

export function drinksAtEstablishment(drinks: Drink[], establishmentId: string) {
  return establishmentId
    ? drinks.filter((drink) => drink.establishmentPrices?.some((price) => price.establishmentId === establishmentId))
    : drinks;
}

function priceForOffer(drink: Drink, establishmentId: string) {
  const prices = drink.establishmentPrices ?? [];
  return establishmentId ? prices.find((price) => price.establishmentId === establishmentId)
    : prices.length === 1 ? prices[0] : undefined;
}

export function selectOfferEstablishment(offer: Offer, establishmentId: string, drinks: Drink[]): Offer {
  if (establishmentId === offer.establishmentId) return offer;
  const drink = findDrinkById(drinks, offer.drinkId);
  if (!drink) return { ...offer, establishmentId };
  const price = establishmentId ? priceForOffer(drink, establishmentId) : undefined;
  if (establishmentId && !price) {
    return { ...emptyOffer(), establishmentId, corrections: offer.corrections };
  }
  return { ...offer, establishmentId, price: price ? priceFromCents(price.priceCents) : "", example: false };
}

export function selectOfferDrink(offer: Offer, id: string, drinks: Drink[]): Offer {
  if (id === offer.drinkId) return offer;
  if (!id) return { ...emptyOffer(), establishmentId: offer.establishmentId, corrections: offer.corrections };

  const drink = drinksAtEstablishment(drinks, offer.establishmentId).find((item) => item.id === id);
  if (!drink) return offer;
  const price = priceForOffer(drink, offer.establishmentId);

  return {
    ...offer,
    drinkId: id,
    volume: String(offer.corrections[id]?.volume ?? drink.volume),
    quantity: "1",
    price: price ? priceFromCents(price.priceCents) : "",
    establishmentId: price?.establishmentId ?? offer.establishmentId,
    example: false,
  };
}

export function detailDraft(drink: Drink, offer: Offer) {
  const draft = toDraft(offer.corrections[drink.id] ?? drink);
  return offer.drinkId === drink.id ? { ...draft, volume: offer.volume } : draft;
}

export function withDrinkCorrection(offer: Offer, drink: Drink, correction: DrinkData | null) {
  const corrections = { ...offer.corrections };
  if (correction) {
    corrections[drink.id] = correction;
  } else {
    delete corrections[drink.id];
  }

  const volume = offer.drinkId === drink.id && !correction
    ? String(drink.volume)
    : offer.volume;

  return { ...offer, corrections, volume };
}

export function resetOffer(offer: Offer, drink: Drink): Offer {
  const price = priceForOffer(drink, offer.establishmentId);
  const cents = price?.priceCents ?? drink.referencePriceCents;
  return {
    ...withDrinkCorrection(offer, drink, null),
    quantity: "1",
    price: cents === undefined ? "" : priceFromCents(cents),
    establishmentId: price?.establishmentId ?? "",
    example: false,
  };
}

function readCorrections(value: unknown, drinks: Drink[]): Offer["corrections"] {
  const corrections: Offer["corrections"] = {};
  if (!value || typeof value !== "object") return corrections;
  const stored = value as Record<string, unknown>;
  for (const { id, mergedIds = [] } of drinks) {
    const correction = [id, ...mergedIds].map((key) => stored[key]).find(isDrinkData);
    if (correction) corrections[id] = correction;
  }
  return corrections;
}

function startingOffer(offer: Offer, drinks: Drink[]): Offer {
  const drink = drinks.find(({ id }) => id === offer.drinkId);
  return drink ? { ...offer, volume: String(drink.volume) } : emptyOffer();
}

function readOffer(value: unknown, fallback: Offer, drinks: Drink[]): Offer {
  if (!value || typeof value !== "object") return fallback;
  const stored = value as Partial<Offer>;
  const storedDrinkId = typeof stored.drinkId === "string" ? stored.drinkId : fallback.drinkId;
  const corrections = readCorrections(stored.corrections, drinks);
  const drink = findDrinkById(drinks, storedDrinkId);
  const offer = {
    drinkId: drink?.id ?? "",
    corrections,
    price: typeof stored.price === "string" ? stored.price : "",
    volume: typeof stored.volume === "string" ? stored.volume : String(drink ? (corrections[drink.id] ?? drink).volume : ""),
    quantity: typeof stored.quantity === "string" ? stored.quantity : "1",
    establishmentId: typeof stored.establishmentId === "string" ? stored.establishmentId : "",
    example: stored.example === true,
  };
  return drink ? offer : { ...emptyOffer(), corrections, establishmentId: offer.establishmentId };
}

function readOfferList(raw: string | null): unknown[] | undefined {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.slice(0, offerLetters.length) : undefined;
  } catch {
    return undefined;
  }
}

function restoreConvertedPrice(offer: Offer, original: Offer): Offer {
  const cents = parsePrice(original.price);
  const count = parseVolume(original.quantity);
  if (cents === null || count === null || count === 1) return offer;

  // Restore the original price only when the saved offer still matches the conversion.
  const converted = { ...original, price: priceFromCents(Math.round(cents / count)) };
  return JSON.stringify(converted) === JSON.stringify(offer) ? original : offer;
}

export function readSession(storage: Pick<Storage, "getItem">, drinks: Drink[] = catalog): DrinkSession {
  const fallback: DrinkSession = [startingOffer(initialSession[0], drinks), startingOffer(initialSession[1], drinks)];
  try {
    const current = readOfferList(storage.getItem(sessionKey));
    const converted = current ? undefined : readOfferList(storage.getItem(convertedPriceSessionKey));
    const previousOffers = current ? undefined : readOfferList(storage.getItem(previousOffersSessionKey));
    const offers = current ?? converted ?? previousOffers;
    if (offers) {
      return Array.from({ length: Math.max(fallback.length, offers.length) }, (_, index) => {
        const defaultOffer = fallback[index] ?? emptyOffer();
        const offer = readOffer(offers[index], defaultOffer, drinks);
        return converted && previousOffers?.[index]
          ? restoreConvertedPrice(offer, readOffer(previousOffers[index], defaultOffer, drinks))
          : offer;
      });
    }

    const previous = storage.getItem(previousSessionKey);
    if (!previous) return fallback;

    const old = JSON.parse(previous) as { selectedId?: string; corrections?: unknown } | null;
    const corrections = readCorrections(old?.corrections, drinks);
    const drinkId = old?.selectedId ?? fallback[0].drinkId;
    return [
      readOffer({ ...fallback[0], drinkId, volume: undefined, price: "", example: false, corrections }, fallback[0], drinks),
      readOffer({ ...fallback[1], volume: undefined, corrections }, fallback[1], drinks),
    ];
  } catch {
    return fallback;
  }
}
