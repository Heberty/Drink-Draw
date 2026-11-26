"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import type { FormProps } from "@/components/admin-collection";
import { useCatalog } from "@/components/catalog-provider";
import { DrinkFields } from "@/components/drink-fields";
import { DrinkPricesEditor, type PriceRow } from "@/components/drink-prices-editor";
import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { catalogChoiceName, CatalogValidationError, type CatalogChoice } from "@/lib/catalog";
import { parsePrice, parseVolume, priceFromCents } from "@/lib/compare";
import { parseDraft, toDraft, type Drink, type DrinkDraft, type EstablishmentPrice } from "@/lib/drinks";
import { blankEstablishment, establishmentLabel, normalizeEstablishment, states, validCoordinates, type Establishment, type EstablishmentDraft } from "@/lib/establishments";
import { validEventDate, type CatalogEvent } from "@/lib/events";

function createId() {
  return crypto.randomUUID?.() ?? crypto.getRandomValues(new Uint32Array(4)).join("-");
}

function RecordForm<T>({ fields, sideFields, prepare, image, includeImage = true, onSave, onCancel }: {
  fields: ReactNode;
  sideFields?: ReactNode;
  prepare: (image?: Blob | string) => { record: T } | { error: string };
  image?: Blob | string;
  includeImage?: boolean;
  onSave: (record: T) => Promise<void>;
  onCancel: () => void;
}) {
  const [photo, setPhoto] = useState(image);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading || saving) return;
    const result = prepare(photo);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(result.record);
    } catch (reason) {
      setError(reason instanceof CatalogValidationError ? reason.message : "Não foi possível salvar o cadastro. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const photoField = includeImage && <ImageField image={photo} onChange={setPhoto} onBusy={setUploading} />;

  return (
    <form onSubmit={submit} className="manager-form">
      <fieldset className={sideFields ? "admin-drink-edit-grid" : "admin-form-fields"} disabled={saving}>
        {sideFields ? (
          <>
            <section className="admin-form-fields admin-drink-edit-details" aria-labelledby="drink-data-title">
              <h2 id="drink-data-title">Dados da bebida</h2>
              {fields}
              {photoField}
            </section>
            {sideFields}
          </>
        ) : <>{fields}{photoField}</>}
      </fieldset>
      {error && <p className="form-feedback" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="submit" disabled={saving || uploading}>{saving ? "Salvando…" : "Salvar cadastro"}</Button>
      </div>
    </form>
  );
}

const blankDrink: DrinkDraft = { brand: "", type: "", volume: "", packaging: "Lata", description: "" };

export function DrinkAdminForm({ record, onSave, onCancel }: FormProps<Drink>) {
  const { brands, types, packagingTypes, establishments } = useCatalog();
  const [name, setName] = useState(record?.name ?? "");
  const [referencePrice, setReferencePrice] = useState(
    record?.referencePriceCents === undefined ? "" : priceFromCents(record.referencePriceCents),
  );
  const [priceRows, setPriceRows] = useState<PriceRow[]>(() => (record?.establishmentPrices ?? []).map((entry) => ({
    establishmentId: entry.establishmentId,
    price: priceFromCents(entry.priceCents),
  })));
  const [draft, setDraft] = useState(() => record ? {
    ...toDraft(record),
    brand: catalogChoiceName(brands, record.brand),
    type: catalogChoiceName(types, record.type),
    packaging: catalogChoiceName(packagingTypes, record.packaging),
  } : { ...blankDrink, packaging: catalogChoiceName(packagingTypes, blankDrink.packaging) });
  const brandOptions = brands.map(({ name }) => name).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const typeOptions = types.map(({ name }) => name).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const packagingOptions = packagingTypes.map(({ name }) => name).sort((a, b) => a.localeCompare(b, "pt-BR"));

  function update<K extends keyof DrinkDraft>(field: K, value: DrinkDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function prepare(image?: Blob | string) {
    const data = parseDraft(draft);
    if (!name.trim() || !data || parseVolume(draft.volume) === null) {
      return { error: "Preencha nome, marca, tipo, embalagem, descrição e um volume inteiro maior que zero." };
    }
    const referencePriceCents = parsePrice(referencePrice) ?? undefined;
    const establishmentPrices: EstablishmentPrice[] = [];
    for (const row of priceRows) {
      const priceCents = parsePrice(row.price);
      if (priceCents === null) {
        const store = establishments.find(({ id }) => id === row.establishmentId);
        return { error: store ? `Informe o preço unitário em ${establishmentLabel(store)}.` : "Informe o preço unitário em todas as linhas." };
      }
      establishmentPrices.push({ establishmentId: row.establishmentId, priceCents });
    }

    return {
      record: {
        ...data, id: record?.id ?? createId(), name: name.trim(), palette: record?.palette ?? "lemon",
        referencePriceCents, establishmentPrices, image,
      },
    };
  }

  return (
    <RecordForm image={record?.image} prepare={prepare} onSave={onSave} onCancel={onCancel}
      sideFields={<DrinkPricesEditor establishments={establishments} rows={priceRows} onChange={setPriceRows} />}
      fields={(
        <>
          <div className="field">
            <label htmlFor="admin-drink-name">Nome da bebida</label>
            <Input id="admin-drink-name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          {(!brands.length || !types.length || !packagingTypes.length) && <p className="form-feedback">
            Cadastre uma <Link href="/admin/bebidas/marcas" className="underline">marca</Link>, um <Link href="/admin/bebidas/tipos" className="underline">tipo de bebida</Link> e uma <Link href="/admin/bebidas/embalagens" className="underline">embalagem</Link> para continuar.
          </p>}
          <DrinkFields draft={draft} onChange={update} includeVolume brandOptions={brandOptions} typeOptions={typeOptions}
            packagingOptions={packagingOptions} />
          {record?.referencePriceCents !== undefined && (
            <div className="field">
              <label htmlFor="admin-reference-price">Preço de referência sem estabelecimento</label>
              <CurrencyInput id="admin-reference-price" value={referencePrice} onValueChange={setReferencePrice} />
            </div>
          )}
        </>
      )}
    />
  );
}

const establishmentFields = [
  ["branch", "Unidade ou filial", "organization-title"],
  ["address", "Endereço ou bairro", "street-address"],
  ["city", "Cidade", "address-level2"],
  ["phone", "Telefone ou WhatsApp", "tel"],
  ["url", "Site ou link do app", "url"],
] as const;

export function EstablishmentAdminForm({ record, onSave, onCancel }: FormProps<Establishment>) {
  const { establishmentTypes } = useCatalog();
  const [draft, setDraft] = useState<EstablishmentDraft>(() => {
    const original = record ?? blankEstablishment;
    return { ...original, type: catalogChoiceName(establishmentTypes, original.type) };
  });
  const [latitude, setLatitude] = useState(record?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(record?.longitude?.toString() ?? "");

  function update<K extends keyof EstablishmentDraft>(field: K, value: EstablishmentDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function prepare(image?: Blob | string) {
    if (!draft.name.trim()) return { error: "Informe o nome do estabelecimento." };
    if (!draft.type) return { error: "Selecione um tipo de estabelecimento." };
    const data = normalizeEstablishment(draft);
    if (!data) return { error: "Informe um site válido, como exemplo.com.br." };
    const lat = latitude.trim();
    const lng = longitude.trim();
    const hasCoordinates = Boolean(lat || lng);
    const coordinatePattern = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
    const coordinates = { latitude: Number(lat.replace(",", ".")), longitude: Number(lng.replace(",", ".")) };
    if (hasCoordinates && (!coordinatePattern.test(lat) || !coordinatePattern.test(lng) || !validCoordinates(coordinates))) {
      return { error: "Informe latitude de -90 a 90 e longitude de -180 a 180 para exibir o local no mapa." };
    }
    return { record: { ...data, ...(hasCoordinates ? coordinates : {}), id: record?.id ?? createId(), image } };
  }

  return (
    <RecordForm image={record?.image} prepare={prepare} onSave={onSave} onCancel={onCancel} fields={(
      <>
        <div className="field">
          <label htmlFor="admin-est-name">Nome do estabelecimento</label>
          <Input id="admin-est-name" required autoFocus maxLength={100} autoComplete="organization" value={draft.name} onChange={(event) => update("name", event.target.value)} />
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="admin-est-type">Tipo</label>
            <NativeSelect id="admin-est-type" required value={draft.type} onChange={(event) => update("type", event.target.value)}>
              <option value="">Selecione</option>
              {establishmentTypes.map(({ id, name }) => <option key={id} value={name}>{name}</option>)}
            </NativeSelect>
          </div>
          <div className="field">
            <label htmlFor="admin-est-state">UF</label>
            <NativeSelect id="admin-est-state" value={draft.state} onChange={(event) => update("state", event.target.value)}>
              <option value="">Selecione</option>
              {states.map((state) => <option key={state}>{state}</option>)}
            </NativeSelect>
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="admin-est-latitude">Latitude</label>
            <Input id="admin-est-latitude" inputMode="decimal" maxLength={24} value={latitude} onChange={(event) => setLatitude(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="admin-est-longitude">Longitude</label>
            <Input id="admin-est-longitude" inputMode="decimal" maxLength={24} value={longitude} onChange={(event) => setLongitude(event.target.value)} />
          </div>
        </div>
        <small className="text-muted-foreground">Preencha as duas coordenadas em graus decimais para mostrar o local no mapa.</small>
        <div className="manager-grid">
          {establishmentFields.map(([key, label, autoComplete]) => (
            <div className="field" key={key}>
              <label htmlFor={`admin-est-${key}`}>{label}</label>
              <Input id={`admin-est-${key}`} type={key === "phone" ? "tel" : "text"} inputMode={key === "url" ? "url" : undefined} autoComplete={autoComplete} maxLength={key === "url" ? 300 : 140} value={draft[key]} onChange={(event) => update(key, event.target.value)} />
            </div>
          ))}
        </div>
        <div className="field">
          <label htmlFor="admin-est-notes">Observações</label>
          <Textarea id="admin-est-notes" rows={2} maxLength={500} value={draft.notes} onChange={(event) => update("notes", event.target.value)} />
        </div>
      </>
    )} />
  );
}

export function EventAdminForm({ record, onSave, onCancel }: FormProps<CatalogEvent>) {
  const [draft, setDraft] = useState<Omit<CatalogEvent, "id" | "image">>(() => record ?? {
    name: "", date: "", time: "", location: "", description: "", sample: false,
  });

  function update<K extends keyof typeof draft>(field: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function prepare(image?: Blob | string) {
    if (!draft.name.trim() || !draft.location.trim() || !validEventDate(draft.date)) {
      return { error: "Informe o nome, a data e o local do evento." };
    }
    return { record: { ...draft, id: record?.id ?? createId(), image } };
  }

  return (
    <RecordForm image={record?.image} prepare={prepare} onSave={onSave} onCancel={onCancel} fields={(
      <>
        <div className="field">
          <label htmlFor="admin-event-name">Nome do evento</label>
          <Input id="admin-event-name" required autoFocus maxLength={100} value={draft.name} onChange={(event) => update("name", event.target.value)} />
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="admin-event-date">Data</label>
            <Input id="admin-event-date" type="date" required value={draft.date} onChange={(event) => update("date", event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="admin-event-time">Horário</label>
            <Input id="admin-event-time" type="time" value={draft.time} onChange={(event) => update("time", event.target.value)} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="admin-event-location">Local</label>
          <Input id="admin-event-location" required maxLength={160} value={draft.location} onChange={(event) => update("location", event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="admin-event-description">Descrição</label>
          <Textarea id="admin-event-description" maxLength={1000} rows={3} value={draft.description} onChange={(event) => update("description", event.target.value)} />
        </div>
        <label className="admin-event-sample">
          <input type="checkbox" checked={draft.sample} onChange={(event) => update("sample", event.target.checked)} />
          Evento fictício
        </label>
      </>
    )} />
  );
}

export function ChoiceAdminForm({ record, onSave, onCancel }: FormProps<CatalogChoice>) {
  const [name, setName] = useState(record?.name ?? "");

  function prepare() {
    const label = name.trim();
    if (!label) return { error: "Informe um nome." };
    return { record: { id: record?.id ?? createId(), name: label } };
  }

  return (
    <RecordForm includeImage={false} prepare={prepare} onSave={onSave} onCancel={onCancel} fields={
      <div className="field">
        <label htmlFor="admin-choice-name">Nome</label>
        <Input id="admin-choice-name" required autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} />
      </div>
    } />
  );
}
