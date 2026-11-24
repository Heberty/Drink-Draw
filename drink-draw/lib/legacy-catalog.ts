import { choicesFromDrinks, type CatalogData } from "@/lib/catalog";
import type { Drink } from "@/lib/drinks";
import { establishmentKey, readEstablishments, type Establishment } from "@/lib/establishments";

function openLegacyCatalog() {
  return new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = indexedDB.open("drink-draw-catalog");
    let missing = false;
    request.onupgradeneeded = () => {
      missing = true;
      request.transaction?.abort();
    };
    request.onerror = () => missing ? resolve(null) : reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function readRecords<T>(db: IDBDatabase, store: string): Promise<T[]> {
  if (!db.objectStoreNames.contains(store)) return Promise.resolve([]);

  return new Promise((resolve, reject) => {
    const request = db.transaction(store).objectStore(store).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readLegacyCatalog(): Promise<CatalogData> {
  const db = await openLegacyCatalog();
  if (!db) {
    const establishments = window.localStorage.getItem(establishmentKey) ? readEstablishments(window.localStorage) : [];
    return { drinks: [], brands: [], types: [], establishments };
  }

  try {
    const [drinks, establishments, brands, types] = await Promise.all([
      readRecords<Drink>(db, "drinks"),
      readRecords<Establishment>(db, "establishments"),
      readRecords<CatalogData["brands"][number]>(db, "brands"),
      readRecords<CatalogData["types"][number]>(db, "types"),
    ]);
    return {
      drinks, establishments,
      brands: db.objectStoreNames.contains("brands") ? brands : choicesFromDrinks(drinks, "brands"),
      types: db.objectStoreNames.contains("types") ? types : choicesFromDrinks(drinks, "types"),
    };
  } finally {
    db.close();
  }
}
