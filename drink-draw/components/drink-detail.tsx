"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Building2, CupSoda, Droplet, GlassWater, Package, Tag } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { useCatalog } from "@/components/catalog-provider";
import { PackagePlaceholder } from "@/components/package-placeholder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatVolume, parseVolume } from "@/lib/compare";
import { detailDraft, offerLetters, readSession, type Offer } from "@/lib/drink-session";
import { toDraft, type Drink } from "@/lib/drinks";
import { establishmentLabel, type Establishment } from "@/lib/establishments";

export function DrinkDetail({ drink, related, offerIndex, referenceEstablishment }: {
  drink: Drink;
  related: Drink[];
  offerIndex?: number;
  referenceEstablishment?: Establishment;
}) {
  const { drinks, establishments, ready } = useCatalog();
  const [offer, setOffer] = useState<Offer>();

  useEffect(() => {
    if (offerIndex === undefined || !ready) return;
    try {
      const savedOffer = readSession(window.sessionStorage, drinks)[offerIndex];
      setOffer(savedOffer?.drinkId === drink.id ? savedOffer : undefined);
    } catch {
      setOffer(undefined);
    }
  }, [drink.id, drinks, offerIndex, ready]);

  const draft = offer ? detailDraft(drink, offer) : toDraft(drink);
  const offerEstablishment = establishments.find(({ id }) => id === offer?.establishmentId);
  const establishment = offerEstablishment ?? referenceEstablishment;
  const volume = parseVolume(draft.volume);
  const volumeLabel = volume === null ? "—" : formatVolume(volume);
  const showPhoto = drink.id === "sicilia" && draft.brand === drink.brand &&
    draft.packaging === "Lata" && volume === 350;

  return (
    <>
      <main className="frame dashboard drink-detail">
        <Button asChild variant="outline" className="detail-back">
          <Link href={offerIndex === undefined ? "/bebidas" : "/"}><ArrowLeft aria-hidden="true" /> Voltar</Link>
        </Button>
        <div className="page-intro">
          <span className="overline"><BookOpen aria-hidden="true" /> Catálogo de bebidas</span>
          <h1>Detalhes da bebida<span>.</span></h1>
          {offerIndex !== undefined && <p>{`Ficha da oferta ${offerLetters[offerIndex]} desta sessão.`}</p>}
        </div>

        <div className="detail-grid">
          <section className="detail-sheet" aria-labelledby="detail-sheet-title">
            <h2 id="detail-sheet-title">Ficha da bebida</h2>
            <Card className="detail-card">
              <div className={`detail-hero palette-${drink.palette}`}>
                <div className="detail-hero-copy">
                  <p>{draft.type}</p>
                  <h3>{drink.name}</h3>
                  <div className="detail-tags">
                    {volume !== null && <span className="package-tag">{volumeLabel}</span>}
                    <span className="package-tag">{draft.packaging}</span>
                  </div>
                </div>
                <div className="detail-art" aria-hidden="true">
                  {drink.image ? (
                    <CatalogImage image={drink.image} className="detail-uploaded-image" />
                  ) : showPhoto ? (
                    <Image src="/sicilia.webp" alt="" fill preload sizes="(max-width: 720px) 50vw, 360px" />
                  ) : (
                    <PackagePlaceholder drink={{ palette: drink.palette, packaging: draft.packaging, brand: draft.brand }} />
                  )}
                </div>
              </div>
              <div className="detail-info">
                <h4>Sobre a bebida</h4>
                <p>{draft.description}</p>
                <dl className="detail-facts">
                  <div><dt><Tag aria-hidden="true" /> Marca</dt><dd>{draft.brand}</dd></div>
                  <div><dt><GlassWater aria-hidden="true" /> Tipo</dt><dd>{draft.type}</dd></div>
                  <div><dt><Droplet aria-hidden="true" /> Volume</dt><dd>{volumeLabel}</dd></div>
                  <div><dt><Package aria-hidden="true" /> Embalagem</dt><dd>{draft.packaging}</dd></div>
                  {establishment && (
                    <div className="detail-establishment">
                      <dt><Building2 aria-hidden="true" /> Estabelecimento</dt>
                      <dd>
                        {establishment.image && <CatalogImage image={establishment.image} className="detail-establishment-image" />}
                        <span>{establishmentLabel(establishment)}</span>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </Card>
          </section>

          <aside className="detail-related" aria-labelledby="related-title">
            <h2 id="related-title">Produtos relacionados</h2>
            <Card className="related-card">
              {related.length ? (
                <ul className="related-list">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link href={`/bebidas/${item.id}`}>
                        <span className={`related-media palette-${item.palette}`}>
                          {item.image ? <CatalogImage image={item.image} /> : <CupSoda aria-hidden="true" />}
                        </span>
                        <span className="related-copy">
                          <strong>{item.name}</strong>
                          <small>{item.type} · {formatVolume(item.volume)}</small>
                          <small>{item.packaging}</small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p>Nenhuma outra bebida desta marca ou tipo no catálogo.</p>}
            </Card>
          </aside>
        </div>
      </main>
      <footer className="site-footer frame"><span>Drink Draw</span><span>Catálogo de bebidas</span></footer>
    </>
  );
}
