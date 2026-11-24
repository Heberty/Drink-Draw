export const packages = ["Lata", "Long neck", "Garrafa"] as const;

export type DrinkData = {
  brand: string;
  description: string;
  type: string;
  volume: number;
  packaging: (typeof packages)[number];
};

export type Drink = DrinkData & { id: string; name: string; palette: string; referencePriceCents?: number; image?: Blob | string };

export const catalog: [Drink, ...Drink[]] = [
  {
    id: "sicilia",
    name: "Sicília Limão",
    brand: "Sicília",
    description:
      "Refrigerante artesanal de limão-siciliano, com acidez na medida e um toque cítrico bem refrescante.",
    type: "Refrigerante",
    volume: 350,
    packaging: "Lata",
    palette: "lemon",
  },
  {
    id: "brisa",
    name: "Brisa Pilsen",
    brand: "Brisa",
    description:
      "Cerveja pilsen leve e dourada, com notas suaves de malte e final fresco.",
    type: "Cerveja",
    volume: 330,
    packaging: "Long neck",
    palette: "amber",
  },
  {
    id: "fonte",
    name: "Fonte Clara",
    brand: "Fonte Clara",
    description:
      "Água mineral com gás e borbulhas finas, ideal para acompanhar refeições ou beber gelada.",
    type: "Água mineral",
    volume: 500,
    packaging: "Garrafa",
    palette: "mint",
  },
  {
    id: "pomar",
    name: "Pomar Pêssego",
    brand: "Pomar",
    description:
      "Chá preto gelado com aroma frutado de pêssego e final levemente adocicado.",
    type: "Chá gelado",
    volume: 450,
    packaging: "Garrafa",
    palette: "peach",
  },
  {
    id: "sicilia-1l",
    name: "Sicília Limão",
    brand: "Sicília",
    description:
      "Refrigerante de limão-siciliano em garrafa de 1 litro, com sabor cítrico e refrescante.",
    type: "Refrigerante",
    volume: 1000,
    packaging: "Garrafa",
    palette: "mint",
  },
];

export type DrinkDraft = Omit<DrinkData, "volume"> & { volume: string };

export function toDraft({ brand, description, type, volume, packaging }: DrinkData): DrinkDraft {
  return { brand, description, type, volume: String(volume), packaging };
}

export function parseDraft(draft: DrinkDraft): DrinkData | null {
  const brand = draft.brand.trim();
  const description = draft.description.trim();
  const type = draft.type.trim();
  const volume = Number(draft.volume);

  if (!brand || !description || !type || !Number.isSafeInteger(volume) || volume <= 0) {
    return null;
  }

  return { brand, description, type, volume, packaging: draft.packaging };
}

export function isDrinkData(value: unknown): value is DrinkData {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Partial<DrinkData>;
  return (
    typeof data.brand === "string" &&
    typeof data.description === "string" &&
    typeof data.type === "string" &&
    typeof data.volume === "number" &&
    !!data.packaging &&
    packages.includes(data.packaging) &&
    parseDraft(toDraft(data as DrinkData)) !== null
  );
}

