import type { CatalogData, CatalogRecord } from "@/lib/catalog";
import type { Drink } from "@/lib/drinks";
import { sqlite } from "@/lib/sqlite";

type Collection = keyof CatalogData;
export type StoredImage = { bytes: Uint8Array; type: string };

export function loadCatalog() {
  return sqlite<CatalogData>("catalog");
}

export function findCatalogDrink(id: string) {
  return sqlite<Drink | null>("drink", { id }) ?? undefined;
}

export function readCatalogImage(collection: "drinks" | "establishments", id: string) {
  const image = sqlite<{ data: string; type: string } | null>("image", { collection, id });
  return image ? { bytes: Buffer.from(image.data, "base64"), type: image.type } : undefined;
}

export function saveCatalogRecord<K extends Collection>(collection: K, record: CatalogRecord<K>, image?: StoredImage | null, importing = false) {
  return sqlite<boolean>("save_record", {
    collection, record, importing,
    image: image ? { type: image.type, data: Buffer.from(image.bytes).toString("base64") } : image === null ? null : "keep",
  });
}

export function removeCatalogRecord(collection: Collection, id: string) {
  sqlite("delete_record", { collection, id });
}
