"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { Button } from "@/components/ui/button";
import { imageTypes, prepareCatalogImage } from "@/lib/catalog-image";

export function ImageField({ image, onChange, onBusy }: {
  image?: Blob | string;
  onChange: (image?: Blob | string) => void;
  onBusy: (value: boolean) => void;
}) {
  const id = useId();
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);

  async function select(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setError("");
    setReading(true);
    onBusy(true);
    try {
      onChange(await prepareCatalogImage(file));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível preparar a imagem.");
    } finally {
      input.value = "";
      setReading(false);
      onBusy(false);
    }
  }

  return (
    <div className="upload-field">
      <label htmlFor={id}>Imagem <span>(opcional)</span></label>
      <div className="upload-box">
        <div className="upload-preview">
          {image ? <CatalogImage image={image} alt="Prévia da imagem selecionada" /> : <ImagePlus aria-hidden="true" />}
        </div>
        <div className="upload-control">
          <input type="file" id={id} accept={imageTypes.join(",")} aria-describedby={`${id}-note`} onChange={select} disabled={reading} />
          <p id={`${id}-note`}>JPG, PNG ou WebP até 2 MB e 1600 × 1600 px. A imagem é salva em 512 × 512 px.</p>
          {image && <Button type="button" variant="ghost" onClick={() => { setError(""); onChange(undefined); }} disabled={reading}><Trash2 aria-hidden="true" /> Remover imagem</Button>}
        </div>
      </div>
      {reading && <p className="form-feedback" role="status">Preparando imagem…</p>}
      {error && <p className="form-feedback" role="alert">{error}</p>}
    </div>
  );
}
