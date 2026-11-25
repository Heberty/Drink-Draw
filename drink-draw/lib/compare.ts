const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("pt-BR");

export function parsePrice(value: string): number | null {
  const text = value.trim().replace(/^R\$\s*/i, "");
  const localized = /^(\d+|\d{1,3}(?:\.\d{3})+),(\d{1,2})$/.exec(text);
  const plain = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  const match = localized ?? plain;
  const grouped = /^\d{1,3}(?:\.\d{3})+$/.test(text);
  if (!match && !grouped) return null;

  const whole = (match?.[1] ?? text).replaceAll(".", "");
  const fraction = (match?.[2] ?? "").padEnd(2, "0");
  const cents = Number(whole + fraction);
  return Number.isSafeInteger(cents) ? cents : null;
}

export function parseVolume(value: string): number | null {
  const volume = Number(value);
  return /^\d+$/.test(value) && Number.isSafeInteger(volume) && volume > 0 ? volume : null;
}

export function formatPrice(value: number) {
  return currency.format(value);
}

export function formatSavings(value: number) {
  return percent.format(value);
}

export function offerTotals(offer: { price: string; volume: string; quantity: string }) {
  const unitPriceCents = parsePrice(offer.price);
  const unitVolume = parseVolume(offer.volume);
  const quantity = parseVolume(offer.quantity);
  const totalCents = unitPriceCents === null || quantity === null ? null : unitPriceCents * quantity;
  const totalVolume = unitVolume === null || quantity === null ? null : unitVolume * quantity;
  const cents = Number.isSafeInteger(totalCents) ? totalCents : null;
  const volume = Number.isSafeInteger(totalVolume) ? totalVolume : null;
  return { cents, volume, unitPriceCents, unitVolume, quantity };
}

export function formatVolume(value: number) {
  return `${integer.format(value)} mL`;
}

export function ratePerLiter(cents: number | null, volume: number | null) {
  return cents === null || volume === null ? null : (cents / volume) * 10;
}

export function compareOffers(...offers: { cents: number | null; volume: number | null }[]) {
  const ranked = offers.flatMap(({ cents, volume }, index) => cents === null || volume === null
    ? [] : [{ cents: BigInt(cents), volume: BigInt(volume), index }]);
  ranked.sort((a, b) => {
    const difference = a.cents * b.volume - b.cents * a.volume;
    return difference < BigInt(0) ? -1 : difference > BigInt(0) ? 1 : 0;
  });
  if (ranked.length < 2) return null;

  const [first, second] = ranked;
  const left = first.cents * second.volume;
  const right = second.cents * first.volume;
  if (left === right) return { winner: "tie" as const, savings: 0 };

  return { winner: first.index, savings: Number(right - left) / Number(right) };
}

export function priceFromCents(cents: number) {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
}

export function formatCurrencyInput(cents: number) {
  return `R$\u00a0${integer.format(Math.floor(cents / 100))},${String(cents % 100).padStart(2, "0")}`;
}

export function amountFromDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const cents = Number(digits);
  return Number.isSafeInteger(cents) ? priceFromCents(cents) : null;
}
