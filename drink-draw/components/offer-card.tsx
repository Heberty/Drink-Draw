"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ChevronDown, Eraser, Info, Pencil, RotateCcw, Star, X } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { DrinkFields } from "@/components/drink-fields";
import { PackagePlaceholder } from "@/components/package-placeholder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatPrice, formatVolume, offerTotals, ratePerLiter } from "@/lib/compare";
import { drinksAtEstablishment, offerDrink, resetOffer, withDrinkCorrection, type Offer, type offerLetters } from "@/lib/drink-session";
import { parseDraft, toDraft, type Drink, type DrinkData, type DrinkDraft } from "@/lib/drinks";
import { establishmentLabel, type Establishment } from "@/lib/establishments";

function DrinkEditor({ offer, drink, original, onChange }: { offer: Offer; drink: Drink; original: Drink; onChange: (offer: Offer) => void }) {
  const [draft, setDraft] = useState(() => toDraft(drink));
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof DrinkDraft>(field: K, value: DrinkDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  }

  function apply(data: DrinkData | null) {
    onChange(withDrinkCorrection(offer, original, data));
    setOpen(false);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = parseDraft(draft);
    if (!data) {
      setError("Preencha a marca, o tipo e a descrição.");
      return;
    }
    apply(data);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (next) {
        setDraft(toDraft(drink));
        setError("");
      }
      setOpen(next);
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={`Editar ficha de ${drink.name}`}>
          <Pencil aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="pr-8 text-xl font-bold tracking-tight">Editar ficha da bebida</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted-foreground">
          {drink.name}. As correções valem para esta oferta durante a sessão.
        </DialogDescription>
        <form onSubmit={save} className="manager-form">
          <DrinkFields draft={draft} onChange={update} />
          {error && <p className="form-feedback" role="status">{error}</p>}
          <div className="modal-actions edit-actions">
            <Button type="button" variant="ghost" onClick={() => apply(null)}><RotateCcw aria-hidden="true" /> Restaurar dados originais</Button>
            <Button type="submit">Salvar na sessão</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Props = {
  letter: (typeof offerLetters)[number];
  offer: Offer;
  drinks: Drink[];
  establishments: Establishment[];
  winner: boolean;
  disabled: boolean;
  suggested?: boolean;
  onSelectEstablishment: (id: string) => void;
  onSelectDrink: (id: string) => void;
  onChange: (offer: Offer) => void;
  onClear: () => void;
  onRemove?: () => void;
};

export function OfferCard({ letter, offer, drinks, establishments, winner, disabled, suggested, onSelectEstablishment, onSelectDrink, onChange, onClear, onRemove }: Props) {
  const prefix = `offer-${letter}`;
  const drink = offerDrink(offer, drinks);
  const original = drinks.find(({ id }) => id === offer.drinkId);
  const { cents, volume: totalVolume, unitVolume: volume, quantity } = offerTotals(offer);
  const rate = ratePerLiter(cents, totalVolume);
  const invalidPrice = offer.price.trim() !== "" && cents === null;
  const invalidVolume = offer.volume !== "" && volume === null;
  const invalidQuantity = offer.quantity !== "" && quantity === null;
  const invalidTotalVolume = volume !== null && quantity !== null && totalVolume === null;
  const establishment = establishments.find(({ id }) => id === offer.establishmentId);
  const availableDrinks = drinksAtEstablishment(drinks, establishment?.id ?? "");
  const referenceEstablishment = establishments.find(({ id }) => id === drink?.referenceEstablishmentId);
  const moreLabel = <><Info aria-hidden="true" /><span>Saiba mais</span></>;
  const detailsLabel = <><ChevronDown aria-hidden="true" /> Ficha da bebida</>;

  return (
    <Card className={`offer-card${winner ? " offer-winner" : ""}`}>
      <section className="offer-card-content" aria-labelledby={`${prefix}-title`}>
        <div className="offer-header">
          <h2 id={`${prefix}-title`}><span className="offer-letter" aria-hidden="true">{letter}</span> Oferta {letter}</h2>
          <div className="offer-header-actions">
            {winner && (
              <span className="winner-badge">
                <Star aria-hidden="true" className="winner-star" />
                <span className="winner-badge-text">Melhor custo-benefício</span>
              </span>
            )}
            {onRemove && <Button type="button" variant="ghost" size="icon" className="offer-remove" disabled={disabled}
              aria-label={`Remover oferta ${letter}`} title={`Remover oferta ${letter}`} onClick={onRemove}><X aria-hidden="true" /></Button>}
          </div>
        </div>

        {drink ? <div className={`offer-visual palette-${drink.palette}`}>
          {drink.image ? <CatalogImage image={drink.image} className="offer-uploaded-image" /> : <PackagePlaceholder drink={drink} />}
          <div className="offer-visual-copy">
            <span>{drink.type}</span>
            <strong>{drink.name}</strong>
            <span className="package-tag">{drink.packaging} {volume !== null && `· ${volume} mL`}</span>
          </div>
        </div> : <div className="offer-empty-visual">Selecione uma bebida para comparar.</div>}

        <fieldset className="offer-fields" disabled={disabled} aria-label={`Dados da oferta ${letter}`}>
          <div className="field">
            <label htmlFor={`${prefix}-establishment`}>Estabelecimento</label>
            <NativeSelect
              id={`${prefix}-establishment`}
              value={establishment?.id ?? ""}
              onChange={(event) => onSelectEstablishment(event.target.value)}
            >
              <option value="">Todos os estabelecimentos</option>
              {establishments.map((record) => (
                <option key={record.id} value={record.id}>{establishmentLabel(record)} · {record.type}</option>
              ))}
            </NativeSelect>
            {establishment?.image && <CatalogImage image={establishment.image} alt={`Imagem de ${establishment.name}`} className="offer-establishment-image" />}
          </div>
          <div className="field offer-select-field">
            <div className="offer-selection-label">
              <label htmlFor={`${prefix}-drink`}>Bebida do catálogo</label>
              {suggested && <span>Sugestão automática</span>}
            </div>
            <div className="drink-select">
              <NativeSelect id={`${prefix}-drink`} value={offer.drinkId} disabled={!availableDrinks.length}
                onChange={(event) => onSelectDrink(event.target.value)}>
                <option value="">{availableDrinks.length ? "Selecione uma bebida" : "Nenhuma bebida cadastrada"}</option>
                {availableDrinks.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.volume} mL</option>)}
              </NativeSelect>
              {drink && original && <div className="drink-select-editor">
                <DrinkEditor offer={offer} drink={drink} original={original} onChange={onChange} />
              </div>}
            </div>
          </div>
          <fieldset className="field-grid offer-numbers" disabled={!drink}>
            <div className="field">
              <label htmlFor={`${prefix}-price`}>Preço total (R$)</label>
              <CurrencyInput
                id={`${prefix}-price`}
                aria-invalid={invalidPrice || undefined}
                aria-describedby={invalidPrice ? `${prefix}-price-error` : undefined}
                value={offer.price}
                onValueChange={(price) => onChange({ ...offer, price, example: false })}
              />
              {invalidPrice && <span id={`${prefix}-price-error`} className="form-feedback">Use um valor como 4,49.</span>}
              {drink?.referencePriceCents !== undefined && <small className="reference-price">
                Referência por unidade {formatPrice(drink.referencePriceCents / 100)}
                {referenceEstablishment && ` · ${establishmentLabel(referenceEstablishment)}`}
              </small>}
            </div>
            <div className="field">
              <label htmlFor={`${prefix}-volume`}>Vl por unidade (mL)</label>
              <Input
                id={`${prefix}-volume`}
                inputMode="numeric"
                maxLength={16}
                aria-invalid={invalidVolume || undefined}
                aria-describedby={invalidVolume ? `${prefix}-volume-error` : undefined}
                value={offer.volume}
                onChange={(event) => onChange({ ...offer, volume: event.target.value })}
              />
              {invalidVolume && <span id={`${prefix}-volume-error`} className="form-feedback">Digite um inteiro maior que zero.</span>}
            </div>
            <div className="field">
              <label htmlFor={`${prefix}-quantity`}>Quantidade</label>
              <Input
                id={`${prefix}-quantity`}
                inputMode="numeric"
                maxLength={16}
                aria-invalid={invalidQuantity || invalidTotalVolume || undefined}
                aria-describedby={invalidQuantity || invalidTotalVolume ? `${prefix}-quantity-error` : undefined}
                value={offer.quantity}
                onChange={(event) => onChange({ ...offer, quantity: event.target.value })}
              />
              {(invalidQuantity || invalidTotalVolume) && <span id={`${prefix}-quantity-error`} className="form-feedback">
                {invalidTotalVolume ? "O volume total excede o valor permitido." : "Digite um inteiro maior que zero."}
              </span>}
            </div>
          </fieldset>
        </fieldset>

        <div className="offer-card-footer">
          <div className="offer-rate">
            <div>
              <span>Preço por litro</span>
              {totalVolume !== null && <small>{formatVolume(totalVolume)} no total</small>}
              {offer.example && <small>Preço de exemplo</small>}
            </div>
            <strong>{rate === null ? "—" : <>{formatPrice(rate)} <small>/ L</small></>}</strong>
          </div>
          <div className="offer-footer-actions">
            <Button type="button" variant="outline" disabled={disabled || !original}
              aria-label={`Restaurar valores da oferta ${letter}`}
              title="Restaurar valores"
              onClick={() => { if (original) onChange(resetOffer(offer, original)); }}>
              <RotateCcw aria-hidden="true" /><span>Restaurar valores</span>
            </Button>
            <Button type="button" variant="outline" disabled={disabled}
              aria-label={`Limpar oferta ${letter}`} title="Limpar oferta" onClick={onClear}>
              <Eraser aria-hidden="true" /><span>Limpar oferta</span>
            </Button>
            {drink ? <Button asChild variant="outline">
              <Link href={{ pathname: `/bebidas/${drink.id}`, query: { oferta: letter } }}
                aria-label={`Saiba mais sobre ${drink.name}, oferta ${letter}`} title="Saiba mais">
                {moreLabel}
              </Link>
            </Button> : <Button type="button" variant="outline" disabled aria-label="Saiba mais">{moreLabel}</Button>}
          </div>
          <div className="offer-details">
            {drink ? <details>
              <summary className="offer-details-control">{detailsLabel}</summary>
              <dl>
                <div><dt>Marca</dt><dd>{drink.brand}</dd></div>
                <div><dt>Tipo</dt><dd>{drink.type}</dd></div>
                <div><dt>Embalagem</dt><dd>{drink.packaging}</dd></div>
                <div><dt>Volume</dt><dd>{volume === null ? "—" : `${volume} mL`}</dd></div>
                <div className="details-description"><dt>Descrição</dt><dd>{drink.description}</dd></div>
              </dl>
            </details> : <button type="button" className="offer-details-control" disabled>{detailsLabel}</button>}
          </div>
        </div>
      </section>
    </Card>
  );
}
