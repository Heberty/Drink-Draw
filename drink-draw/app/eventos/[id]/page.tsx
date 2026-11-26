import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ArrowLeft, CalendarDays, Clock, MapPin } from "lucide-react";
import { CatalogImage } from "@/components/catalog-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { findCatalogEvent } from "@/lib/catalog-db";
import { formatEventDate, validEventDate, type EventAgendaParams } from "@/lib/events";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<EventAgendaParams> };
const getEvent = cache(findCatalogEvent);

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const event = getEvent(id);
  return event ? { title: `${event.name} | Drink Draw`, description: event.description || undefined }
    : { title: "Evento | Drink Draw" };
}

export default async function EventPage({ params, searchParams }: Props) {
  const [{ id }, { data, visualizacao }] = await Promise.all([params, searchParams]);
  const event = getEvent(id);
  if (!event) notFound();
  const agendaQuery = {
    ...(validEventDate(data) ? { data } : {}),
    ...(visualizacao === "lista" ? { visualizacao } : {}),
  };

  return (
    <main className="frame dashboard event-detail">
      <Button asChild variant="outline" className="detail-back">
        <Link href={{ pathname: "/eventos", query: agendaQuery }}><ArrowLeft aria-hidden="true" /> Voltar para eventos</Link>
      </Button>
      <header className="page-intro">
        <h1>{event.name}</h1>
        {event.sample && <span className="event-sample">Evento fictício</span>}
      </header>
      <Card className="event-detail-body" data-photo={Boolean(event.image)}>
        {event.image && <CatalogImage image={event.image} alt={`Foto de ${event.name}`} className="event-detail-image" />}
        <div className="event-detail-copy">
          <dl className="event-detail-facts">
            <div>
              <dt><CalendarDays aria-hidden="true" /> Data</dt>
              <dd><time dateTime={event.date}>{formatEventDate(event.date)}</time></dd>
            </div>
            {event.time && <div>
              <dt><Clock aria-hidden="true" /> Horário</dt>
              <dd><time dateTime={event.time}>{event.time}</time></dd>
            </div>}
            <div>
              <dt><MapPin aria-hidden="true" /> Local</dt>
              <dd>{event.location}</dd>
            </div>
          </dl>
          {event.description && (
            <section className="event-detail-description">
              <h2>Sobre o evento</h2>
              <p>{event.description}</p>
            </section>
          )}
        </div>
      </Card>
    </main>
  );
}
