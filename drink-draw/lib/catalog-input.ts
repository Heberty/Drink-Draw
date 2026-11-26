import { CatalogValidationError, type CatalogData } from "@/lib/catalog";
import { isDrinkData, type Drink } from "@/lib/drinks";
import { blankEstablishment, normalizeEstablishment, states, validCoordinates, type EstablishmentDraft } from "@/lib/establishments";

export function validRecordId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 160 && !/[\u0000-\u001f/\\]/.test(id);
}

export function readCatalogRecord(collection: keyof CatalogData, json: FormDataEntryValue | null) {
  if (typeof json !== "string" || json.length > 8000) throw new CatalogValidationError("Cadastro inválido.");
  let value;
  try { value = JSON.parse(json); } catch { throw new CatalogValidationError("Cadastro inválido."); }

  if (!value || !validRecordId(value.id) || typeof value.name !== "string" || !value.name.trim() || value.name.trim().length > 100) {
    throw new CatalogValidationError("Informe um nome de cadastro válido.");
  }
  const id = value.id;
  const name = value.name.trim();

  if (collection === "drinks") {
    if (!isDrinkData(value) || value.brand.length > 80 || value.type.length > 80 || value.description.length > 500) {
      throw new CatalogValidationError("Confira a marca, o tipo, a descrição, a embalagem e o volume da bebida.");
    }
    const { brand, description, type, volume, packaging } = value;
    const palette = ["lemon", "amber", "mint", "peach"].find((color) => color === (value as { palette?: string }).palette) ?? "lemon";
    const { referencePriceCents, referenceEstablishmentId } = value as Drink;
    if (referencePriceCents !== undefined && (!Number.isSafeInteger(referencePriceCents) || referencePriceCents < 0)) {
      throw new CatalogValidationError("Informe um preço de referência válido.");
    }
    if (referenceEstablishmentId !== undefined && (!validRecordId(referenceEstablishmentId) || referencePriceCents === undefined)) {
      throw new CatalogValidationError("Informe o preço e selecione um estabelecimento válido.");
    }
    return { id, name, brand: brand.trim(), description: description.trim(), type: type.trim(), volume, packaging, palette, referencePriceCents, referenceEstablishmentId };
  }

  if (collection === "establishments") {
    const fieldsValid = Object.keys(blankEstablishment).every((key) => typeof value[key] === "string" && value[key].length <= 500);
    if (!fieldsValid || !value.type.trim() || value.type.trim().length > 80 || (value.state && !states.includes(value.state))) {
      throw new CatalogValidationError("Confira os dados do estabelecimento.");
    }
    const record = normalizeEstablishment({ ...(value as EstablishmentDraft), name });
    if (!record) throw new CatalogValidationError("Informe um site válido para o estabelecimento.");
    const coordinates = { latitude: value.latitude, longitude: value.longitude };
    if (value.latitude !== undefined || value.longitude !== undefined) {
      if (!validCoordinates(coordinates)) throw new CatalogValidationError("Informe latitude de -90 a 90 e longitude de -180 a 180.");
      return { ...record, type: record.type.trim(), ...coordinates, id };
    }
    return { ...record, type: record.type.trim(), id };
  }

  if (name.length > 80) throw new CatalogValidationError("Use até 80 caracteres no nome.");
  return { id, name };
}
