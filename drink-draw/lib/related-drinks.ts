import { labelKey } from "@/lib/catalog";
import type { Drink } from "@/lib/drinks";

export function relatedDrinks(drink: Drink, catalog: Drink[]) {
  const brand = labelKey(drink.brand);
  const type = labelKey(drink.type);
  const name = labelKey(drink.name);

  return catalog.flatMap((item) => {
    if (item.id === drink.id) return [];
    const sameBrand = labelKey(item.brand) === brand;
    const sameType = labelKey(item.type) === type;
    if (!sameBrand && !sameType) return [];

    const rank = sameBrand && sameType ? (labelKey(item.name) === name ? 0 : 1) : sameType ? 2 : 3;
    const distance = Math.abs(Math.log(item.volume / drink.volume));
    return [{ item, rank, distance }];
  }).sort((a, b) => a.rank - b.rank || a.distance - b.distance ||
    a.item.name.localeCompare(b.item.name, "pt-BR") || a.item.id.localeCompare(b.item.id))
    .map(({ item }) => item);
}
