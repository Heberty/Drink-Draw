export const initialEstablishmentTypes = [
  "Supermercado", "Conveniência", "Atacado", "Site ou aplicativo", "Bar", "Boate", "Pub", "Festa", "Outro",
] as const;

export const states = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type EstablishmentDraft = {
  name: string;
  type: string;
  branch: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  url: string;
  notes: string;
};

export type Coordinates = { latitude: number; longitude: number };
export type Establishment = EstablishmentDraft & Partial<Coordinates> & { id: string; image?: Blob | string };
export const establishmentKey = "drink-draw:establishments:v1";

export const blankEstablishment: EstablishmentDraft = {
  name: "", type: "Supermercado", branch: "", address: "", city: "",
  state: "", phone: "", url: "", notes: "",
};

export const initialEstablishments: Establishment[] = [
  { ...blankEstablishment, id: "sample-market", name: "Supermercado Exemplo" },
  { ...blankEstablishment, id: "sample-wholesale", name: "Atacado Exemplo", type: "Atacado" },
];

export function readEstablishments(storage: Pick<Storage, "getItem">) {
  try {
    const raw = storage.getItem(establishmentKey);
    if (raw === null) return initialEstablishments;

    const records: unknown = JSON.parse(raw);
    if (!Array.isArray(records)) return initialEstablishments;
    const seen = new Set<string>();

    return records.filter((record): record is Establishment => {
      if (!record || typeof record.id !== "string" || !record.id || seen.has(record.id)) return false;
      if (typeof record.name !== "string" || !record.name.trim()) return false;
      if (!Object.keys(blankEstablishment).every((key) => typeof record[key] === "string")) return false;
      if (!record.type.trim()) return false;
      seen.add(record.id);
      return true;
    });
  } catch {
    return initialEstablishments;
  }
}

export function establishmentLabel({ name, branch, city, state }: Establishment) {
  return [name, branch, [city, state].filter(Boolean).join(" / ")].filter(Boolean).join(" · ");
}

export function validCoordinates(value: Partial<Coordinates>): value is Coordinates {
  const { latitude, longitude } = value;
  return typeof latitude === "number" && Number.isFinite(latitude) && Math.abs(latitude) <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
}

export function distanceInKm(from: Coordinates, to: Coordinates) {
  const radians = Math.PI / 180;
  const latitude = (to.latitude - from.latitude) * radians;
  const longitude = (to.longitude - from.longitude) * radians;
  const chord = Math.sin(latitude / 2) ** 2 +
    Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin(longitude / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export function normalizeEstablishment(draft: EstablishmentDraft): EstablishmentDraft | null {
  const name = draft.name.trim();
  const url = draft.url.trim();
  if (!name) return null;

  let normalizedUrl = "";
  if (url) {
    try {
      const parsed = new URL(url.includes("://") ? url : `https://${url}`);
      if (!["https:", "http:"].includes(parsed.protocol) || !parsed.hostname.includes(".")) return null;
      normalizedUrl = parsed.href;
    } catch {
      return null;
    }
  }

  return {
    name, type: draft.type, url: normalizedUrl, branch: draft.branch.trim(),
    address: draft.address.trim(), city: draft.city.trim(), state: draft.state,
    phone: draft.phone.trim(), notes: draft.notes.trim(),
  };
}
