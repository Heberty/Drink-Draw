"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import type { FormProps } from "@/components/admin-collection";
import { useCatalog } from "@/components/catalog-provider";
import { DrinkFields } from "@/components/drink-fields";
import { ImageField } from "@/components/image-field";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { catalogChoiceName, CatalogValidationError, type CatalogChoice } from "@/lib/catalog";
import { parsePrice, parseVolume, priceFromCents } from "@/lib/compare";
import { parseDraft, toDraft, type Drink, type DrinkDraft } from "@/lib/drinks";
import { blankEstablishment, establishmentTypes, normalizeEstablishment, states, type Establishment, type EstablishmentDraft } from "@/lib/establishments";

function createId() {
  return crypto.randomUUID?.() ?? crypto.getRandomValues(new Uint32Array(4)).join("-");
}

function RecordForm<T>({ fields, prepare, image, includeImage = true, onSave, onCancel }: {
  fields: ReactNode;
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

  return (
    <form onSubmit={submit} className="manager-form">
      <fieldset className="admin-form-fields" disabled={saving}>
        {fields}
        {includeImage && <ImageField image={photo} onChange={setPhoto} onBusy={setUploading} />}
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
  const { brands, types } = useCatalog();
  const [name, setName] = useState(record?.name ?? "");
  const [referencePrice, setReferencePrice] = useState(
    record?.referencePriceCents === undefined ? "" : priceFromCents(record.referencePriceCents),
  );
  const [draft, setDraft] = useState(() => record ? {
    ...toDraft(record),
    brand: catalogChoiceName(brands, record.brand),
    type: catalogChoiceName(types, record.type),
  } : blankDrink);
  const brandOptions = brands.map(({ name }) => name).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const typeOptions = types.map(({ name }) => name).sort((a, b) => a.localeCompare(b, "pt-BR"));

  function update<K extends keyof DrinkDraft>(field: K, value: DrinkDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function prepare(image?: Blob | string) {
    const data = parseDraft(draft);
    if (!name.trim() || !data || parseVolume(draft.volume) === null) {
      return { error: "Preencha nome, marca, tipo, descrição e um volume inteiro maior que zero." };
    }

    return {
      record: {
        ...data, id: record?.id ?? createId(), name: name.trim(), palette: record?.palette ?? "lemon",
        referencePriceCents: parsePrice(referencePrice) ?? undefined, image,
      },
    };
  }

  return (
    <RecordForm image={record?.image} prepare={prepare} onSave={onSave} onCancel={onCancel} fields={(
      <>
        <div className="field">
          <label htmlFor="admin-drink-name">Nome da bebida</label>
          <Input id="admin-drink-name" autoFocus required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        {(!brands.length || !types.length) && <p className="form-feedback">
          Cadastre uma <Link href="/admin/marcas" className="underline">marca</Link> e um <Link href="/admin/tipos" className="underline">tipo de bebida</Link> para continuar.
        </p>}
        <DrinkFields draft={draft} onChange={update} includeVolume brandOptions={brandOptions} typeOptions={typeOptions} />
        <div className="field">
          <label htmlFor="admin-reference-price">Preço de referência por unidade (opcional)</label>
          <CurrencyInput id="admin-reference-price" value={referencePrice} onValueChange={setReferencePrice} />
        </div>
      </>
    )} />
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
  const [draft, setDraft] = useState<EstablishmentDraft>(record ?? blankEstablishment);

  function update<K extends keyof EstablishmentDraft>(field: K, value: EstablishmentDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function prepare(image?: Blob | string) {
    if (!draft.name.trim()) return { error: "Informe o nome do estabelecimento." };
    const data = normalizeEstablishment(draft);
    if (!data) return { error: "Informe um site válido, como exemplo.com.br." };
    return { record: { ...data, id: record?.id ?? createId(), image } };
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
            <NativeSelect id="admin-est-type" value={draft.type} onChange={(event) => update("type", event.target.value as EstablishmentDraft["type"])}>
              {establishmentTypes.map((type) => <option key={type}>{type}</option>)}
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
