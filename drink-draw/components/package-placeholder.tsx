import type { Drink } from "@/lib/drinks";
import { labelKey } from "@/lib/catalog";

const packageClasses = new Map([["lata", "can"], ["long neck", "long-neck"], ["garrafa", "bottle"]]);

export function PackagePlaceholder({ drink }: { drink: Pick<Drink, "packaging" | "palette" | "brand"> }) {
  return (
    <div className={`package-scene palette-${drink.palette}`} aria-hidden="true">
      <div className={`package-object package-${packageClasses.get(labelKey(drink.packaging)) ?? "generic"}`}>
        <div className="package-body">
          <div className="package-label"><span>{drink.brand}</span></div>
        </div>
      </div>
    </div>
  );
}
