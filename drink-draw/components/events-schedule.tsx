"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useCatalog } from "@/components/catalog-provider";
import { EventCalendar, EventsViewToggle, type EventsView } from "@/components/event-calendar";
import { formatEventDate, type CatalogEvent } from "@/lib/events";

function EventList({ events, selectedDate, includeDate }: { events: CatalogEvent[]; selectedDate: string; includeDate?: boolean }) {
  return (
    <ul className="events-list">
      {events.map((event) => (
        <li key={event.id}>
          <Link className="event-card" prefetch={false}
            href={{ pathname: `/eventos/${encodeURIComponent(event.id)}`, query: { data: selectedDate, ...(includeDate ? { visualizacao: "lista" } : {}) } }}>
            <div className="event-card-heading">
              <h3>{event.name}</h3>
              {event.sample && <small className="event-sample">Evento fictício</small>}
            </div>
            {(includeDate || event.time) && (
              <time className="event-time" dateTime={event.time ? `${event.date}T${event.time}` : event.date}>
                {[includeDate && formatEventDate(event.date), event.time].filter(Boolean).join(" · ")}
              </time>
            )}
            <p className="event-location"><MapPin aria-hidden="true" /> {event.location}</p>
            {event.description && <p className="event-description">{event.description}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function EventsSchedule({ initialEvents, today, initialDate, initialView }: {
  initialEvents: CatalogEvent[];
  today: string;
  initialDate: string;
  initialView: EventsView;
}) {
  const { events, canWrite } = useCatalog();
  const [view, setView] = useState(initialView);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const allEvents = (canWrite ? events : initialEvents).slice().sort((a, b) =>
    a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.name.localeCompare(b.name, "pt-BR"),
  );
  const selectedEvents = allEvents.filter(({ date }) => date === selectedDate);

  return (
    <main className="frame dashboard events-page">
      <header className="page-intro">
        <h1>Eventos<span>.</span></h1>
      </header>
      <EventsViewToggle view={view} onChange={setView} />
      {view === "list" ? (
        <section aria-labelledby="event-list-title" className="events-agenda">
          <h2 id="event-list-title">Todos os eventos</h2>
          {allEvents.length ? <EventList events={allEvents} selectedDate={selectedDate} includeDate /> : <p>Nenhum evento cadastrado.</p>}
        </section>
      ) : (
        <div className="events-calendar-layout">
          <EventCalendar dates={allEvents.map(({ date }) => date)} today={today} selectedDate={selectedDate} onSelect={setSelectedDate} />
          <section className="events-agenda" aria-labelledby="events-day-title">
            <h2 id="events-day-title" aria-live="polite">{formatEventDate(selectedDate)}</h2>
            {selectedEvents.length ? <EventList events={selectedEvents} selectedDate={selectedDate} /> : <p>Nenhum evento neste dia.</p>}
          </section>
        </div>
      )}
    </main>
  );
}
