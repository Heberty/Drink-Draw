"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Scale, Star } from "lucide-react";
import { useCatalog } from "@/components/catalog-provider";
import { OfferCard } from "@/components/offer-card";
import { Button } from "@/components/ui/button";
import { compareOffers, formatPrice, formatSavings, offerTotals, ratePerLiter } from "@/lib/compare";
import { relatedDrinks } from "@/lib/related-drinks";
import { emptyOffer, initialSession, offerLetters, readSession, selectOfferDrink, sessionKey, type DrinkSession, type Offer } from "@/lib/drink-session";

export function DrinkDashboard() {
  const [session, setSession] = useState(initialSession);
  const { drinks, establishments, ready: catalogReady } = useCatalog();
  const [ready, setReady] = useState(false);
  const [canSaveSession, setCanSaveSession] = useState(true);
  const [suggestedId, setSuggestedId] = useState<string>();
  const offerStrip = useRef<HTMLDivElement>(null);
  const revealNewest = useRef(false);

  useEffect(() => {
    if (!catalogReady) return;

    let restored;
    try {
      restored = readSession(window.sessionStorage, drinks);
    } catch {
      restored = readSession({ getItem: () => null }, drinks);
      setCanSaveSession(false);
    }

    function validateEstablishment(offer: Offer) {
      return establishments.some(({ id }) => id === offer.establishmentId)
        ? offer
        : { ...offer, establishmentId: "" };
    }

    setSession(restored.map(validateEstablishment));
    setReady(true);
  }, [catalogReady, drinks, establishments]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
    } catch {
      setCanSaveSession(false);
    }
  }, [ready, session]);

  useEffect(() => {
    if (!revealNewest.current || !offerStrip.current) return;
    revealNewest.current = false;
    offerStrip.current.scrollLeft = offerStrip.current.scrollWidth;
  }, [session.length]);

  const totals = session.map(offerTotals);
  const comparison = compareOffers(...totals);
  const winner = comparison?.winner;
  const hasWinner = typeof winner === "number";
  const rates = totals.flatMap(({ cents, volume }, index) => {
    const rate = ratePerLiter(cents, volume);
    return rate === null ? [] : [`${offerLetters[index]}: ${formatPrice(rate)}/L`];
  });
  const hasExample = session.some((offer) => offer.example);

  function changeOffer(index: number, offer: Offer) {
    setSession((current) => current.map((item, slot) => slot === index ? offer : item));
  }

  function addOffer() {
    revealNewest.current = true;
    setSession((current) => current.length < offerLetters.length ? [...current, emptyOffer()] : current);
  }

  function removeOffer(index: number) {
    setSession((current) => index < initialSession.length ? current : current.filter((_, slot) => slot !== index));
  }

  function selectDrink(index: number, id: string) {
    if (id === session[index].drinkId) return;
    const drink = drinks.find((item) => item.id === id);
    const suggested = index === 0 && drink ? relatedDrinks(drink, drinks)[0] : undefined;
    if (index < 2) setSuggestedId(suggested?.id);
    setSession((current) => current.map((offer, slot) => {
      if (slot === index) return selectOfferDrink(offer, id, drinks);
      return slot === 1 && suggested ? selectOfferDrink(offer, suggested.id, drinks) : offer;
    }));
  }

  return (
    <>
      <main className="frame dashboard">
        <div className="page-intro">
          <span className="overline"><Scale aria-hidden="true" /> Comparador de preços</span>
          <h1>Qual bebida vale mais<span>?</span></h1>
          <p>Informe a quantidade, o volume por unidade e o preço total de cada oferta para comparar o custo por litro.</p>
        </div>

        <div className={`comparison-result${hasWinner ? " comparison-has-winner" : ""}`} role="status">
          <span className="result-icon">{hasWinner ? <Star aria-hidden="true" className="winner-star" /> : <Scale aria-hidden="true" />}</span>
          <div className="result-copy">
            <p>{hasWinner ? `Oferta ${offerLetters[winner]} compensa mais` : winner === "tie" ? "Empate no menor preço por litro" : "Comparação de ofertas"}</p>
            <span>
              {comparison ? `${rates.join(" · ")}.` : "Preencha o preço total, o volume e a quantidade em pelo menos duas ofertas."}
              {hasExample && <span className="result-example"> Valores ilustrativos.</span>}
            </span>
          </div>
          {comparison && winner !== "tie" && (
            <div className="result-savings">
              <strong>{comparison.savings < 0.001 ? "< 0,1%" : formatSavings(comparison.savings)}</strong>
              <span>{rates.length > 2 ? "de economia sobre a próxima oferta" : "de economia por litro"}</span>
            </div>
          )}
        </div>

        <div className="offers-heading">
          <h2>Suas ofertas</h2>
          <div className="offer-toolbar">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setSuggestedId(undefined); setSession(([first, second, ...rest]) => [second, first, ...rest]); }}
              disabled={!ready}
            >
              {session.length > 2 ? "Inverter A e B" : "Inverter ofertas"}
            </Button>
            <span className="offer-count" aria-live="polite">{session.length} de {offerLetters.length}</span>
          </div>
        </div>

        <div ref={offerStrip} className={`offers-strip${session.length > 2 ? " offers-strip-many" : ""}`}
          role="region" aria-label="Ofertas do comparativo" tabIndex={0}>
          {session.map((offer, index) => (
            <OfferCard
              key={offerLetters[index]}
              letter={offerLetters[index]}
              offer={offer}
              drinks={drinks}
              establishments={establishments}
              winner={winner === index}
              disabled={!ready}
              suggested={index === 1 && offer.drinkId === suggestedId}
              onSelectDrink={(id) => selectDrink(index, id)}
              onChange={(next) => changeOffer(index, next)}
              onRemove={index < initialSession.length ? undefined : () => removeOffer(index)}
            />
          ))}
          <div className="offer-rail" role="group" aria-label="Quantidade de ofertas">
            <Button
              type="button"
              size="icon"
              className="offer-rail-button"
              aria-label="Adicionar oferta"
              title="Adicionar oferta"
              disabled={!ready || session.length >= offerLetters.length}
              onClick={addOffer}
            >
              <Plus aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="offer-rail-button"
              aria-label="Remover última oferta"
              title="Remover última oferta"
              disabled={!ready || session.length <= initialSession.length}
              onClick={() => removeOffer(session.length - 1)}
            >
              <Minus aria-hidden="true" />
            </Button>
          </div>
        </div>
        <p className="session-note">
          {canSaveSession ? "As ofertas ficam salvas nesta aba durante a sessão." : "O navegador mantém as ofertas enquanto esta página estiver aberta."}
        </p>
      </main>

      <footer className="site-footer frame"><span>Drink Draw</span><span>Comparador de bebidas</span></footer>
    </>
  );
}
