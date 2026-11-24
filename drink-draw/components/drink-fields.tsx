import { useId } from "react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { packages, type DrinkDraft } from "@/lib/drinks";

type Props = {
  draft: DrinkDraft;
  onChange: <K extends keyof DrinkDraft>(field: K, value: DrinkDraft[K]) => void;
  includeVolume?: boolean;
  brandOptions?: string[];
  typeOptions?: string[];
};

export function DrinkFields({ draft, onChange, includeVolume, brandOptions, typeOptions }: Props) {
  const id = useId();
  const classification = [
    { field: "brand", title: "Marca", options: brandOptions },
    { field: "type", title: "Tipo", options: typeOptions },
  ] as const;
  const packagingField = (
    <div className="field">
      <label htmlFor={`${id}-packaging`}>Embalagem</label>
      <NativeSelect id={`${id}-packaging`} value={draft.packaging} onChange={(event) => onChange("packaging", event.target.value as DrinkDraft["packaging"])}>
        {packages.map((item) => <option key={item}>{item}</option>)}
      </NativeSelect>
    </div>
  );

  return (
    <>
      <div className="field-grid">
        {classification.map(({ field, title, options }) => (
          <div className="field" key={field}>
            <label htmlFor={`${id}-${field}`}>{title}</label>
            {options ? (
              <NativeSelect id={`${id}-${field}`} required value={draft[field]} onChange={(event) => onChange(field, event.target.value)}>
                <option value="">Selecione</option>
                {options.map((option) => <option key={option}>{option}</option>)}
              </NativeSelect>
            ) : <Input id={`${id}-${field}`} required maxLength={80} value={draft[field]} onChange={(event) => onChange(field, event.target.value)} />}
          </div>
        ))}
      </div>
      {includeVolume ? (
        <div className="field-grid">
          <div className="field">
            <label htmlFor={`${id}-volume`}>Volume (mL)</label>
            <Input
              id={`${id}-volume`}
              type="number"
              inputMode="numeric"
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              step={1}
              required
              value={draft.volume}
              onChange={(event) => onChange("volume", event.target.value)}
            />
          </div>
          {packagingField}
        </div>
      ) : packagingField}
      <div className="field">
        <label htmlFor={`${id}-description`}>Descrição</label>
        <Textarea id={`${id}-description`} required rows={3} maxLength={500} value={draft.description} onChange={(event) => onChange("description", event.target.value)} />
      </div>
    </>
  );
}
