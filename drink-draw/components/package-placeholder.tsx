import type { Drink } from "@/lib/drinks";

const packageClass: Record<Drink["packaging"], string> = {
  "Lata": "can", "Long neck": "long-neck", "Garrafa": "bottle",
};

export function PackagePlaceholder({ drink }: { drink: Pick<Drink, "packaging" | "palette" | "brand"> }) {
  return (
    <div className={`package-scene palette-${drink.palette}`} aria-hidden="true">
      <div className={`package-object package-${packageClass[drink.packaging]}`}>
        <div className="package-body">
          <div className="package-label"><span>{drink.brand}</span></div>
        </div>
      </div>
    </div>
  );
}
