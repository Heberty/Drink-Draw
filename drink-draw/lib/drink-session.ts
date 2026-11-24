import { catalog, isDrinkData, toDraft, type Drink, type DrinkData } from "@/lib/drinks";
import { priceFromCents } from "@/lib/compare";

export const sessionKey = "drink-draw:session:v2";
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
  { drinkId: "sicilia", price: "4,49", volume: "350", quantity: "1", establishmentId: "sample-market", example: true, corrections: {} },
  { drinkId: "sicilia-1l", price: "9,99", volume: "1000", quantity: "1", establishmentId: "sample-wholesale", example: true, corrections: {} },
];

export function emptyOffer(): Offer {
  return { drinkId: "", volume: "", quantity: "1", price: "", establishmentId: "", example: false, corrections: {} };
}

export function offerDrink(offer: Offer, drinks: Drink[] = catalog) {
  const original = drinks.find(({ id }) => id === offer.drinkId);
  return original ? { ...original, ...offer.corrections[original.id] } : undefined;
}

export function selectOfferDrink(offer: Offer, id: string, drinks: Drink[]): Offer {
  if (id === offer.drinkId) return offer;

  const next = { ...offer, drinkId: id, price: "", quantity: "1", example: false };
  return { ...next, volume: String(offerDrink(next, drinks)?.volume ?? "") };
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
  return {
    ...withDrinkCorrection(offer, drink, null),
    quantity: "1",
    price: drink.referencePriceCents === undefined ? "" : priceFromCents(drink.referencePriceCents),
    establishmentId: "",
    example: false,
  };
}

function readCorrections(value: unknown, drinks: Drink[]): Offer["corrections"] {
  const corrections: Offer["corrections"] = {};
  if (!value || typeof value !== "object") return corrections;
  const stored = value as Record<string, unknown>;
  for (const { id } of drinks) {
    if (isDrinkData(stored[id])) corrections[id] = stored[id];
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
  const drinkId = typeof stored.drinkId === "string" ? stored.drinkId : fallback.drinkId;
  const corrections = readCorrections(stored.corrections, drinks);
  const drink = drinks.find(({ id }) => id === drinkId);
  const offer = {
    drinkId,
    corrections,
    price: typeof stored.price === "string" ? stored.price : "",
    volume: typeof stored.volume === "string" ? stored.volume : String((corrections[drinkId] ?? drink)?.volume ?? ""),
    quantity: typeof stored.quantity === "string" ? stored.quantity : "1",
    establishmentId: typeof stored.establishmentId === "string" ? stored.establishmentId : "",
    example: stored.example === true,
  };
  return drink ? offer : { ...emptyOffer(), corrections, establishmentId: offer.establishmentId };
}

export function readSession(storage: Pick<Storage, "getItem">, drinks: Drink[] = catalog): DrinkSession {
  const fallback: DrinkSession = [startingOffer(initialSession[0], drinks), startingOffer(initialSession[1], drinks)];
  try {
    const raw = storage.getItem(sessionKey);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const offers = parsed.slice(0, offerLetters.length);
        return Array.from({ length: Math.max(fallback.length, offers.length) }, (_, index) =>
          readOffer(offers[index], fallback[index] ?? emptyOffer(), drinks),
        );
      }
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
