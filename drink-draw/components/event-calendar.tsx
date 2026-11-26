"use client";

import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEventDate } from "@/lib/events";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export type EventsView = "calendar" | "list";

export function EventsViewToggle({ view, onChange }: { view: EventsView; onChange: (view: EventsView) => void }) {
  return (
    <div className="events-view-switch" role="group" aria-label="Visualização de eventos">
      <Button type="button" variant={view === "calendar" ? "default" : "outline"} aria-pressed={view === "calendar"}
        onClick={() => onChange("calendar")}><CalendarDays aria-hidden="true" /> Calendário</Button>
      <Button type="button" variant={view === "list" ? "default" : "outline"} aria-pressed={view === "list"}
        onClick={() => onChange("list")}><List aria-hidden="true" /> Lista</Button>
    </div>
  );
}

export function EventCalendar({ dates, today, selectedDate, onSelect }: {
  dates: string[];
  today: string;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const month = selectedDate.slice(0, 7);
  const first = new Date(`${month}-01T00:00:00Z`);
  const last = new Date(first);
  last.setUTCMonth(first.getUTCMonth() + 1, 0);
  const days = last.getUTCDate();
  const offset = first.getUTCDay();
  const weeks = Math.ceil((offset + days) / 7);
  const counts = new Map<string, number>();
  for (const date of dates) counts.set(date, (counts.get(date) ?? 0) + 1);

  function changeMonth(increment: number) {
    const next = new Date(first);
    next.setUTCMonth(next.getUTCMonth() + increment);
    const year = next.getUTCFullYear();
    if (year < 1 || year > 9999) return;
    const nextMonth = next.toISOString().slice(0, 7);
    const firstEvent = dates.filter((date) => date.startsWith(nextMonth)).sort()[0];
    onSelect(firstEvent ?? `${nextMonth}-01`);
  }

  return (
    <section className="event-calendar" aria-labelledby="event-calendar-title">
      <div className="event-calendar-header">
        <h2 id="event-calendar-title" aria-live="polite">{monthFormat.format(first)}</h2>
        <div className="event-calendar-controls">
          <Button type="button" variant="outline" size="icon" aria-label="Mês anterior" onClick={() => changeMonth(-1)}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Próximo mês" onClick={() => changeMonth(1)}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <table aria-labelledby="event-calendar-title">
        <thead><tr>{weekdays.map((day) => <th key={day} scope="col">{day}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: weeks }, (_, week) => (
            <tr key={week}>
              {weekdays.map((weekday, index) => {
                const day = week * 7 + index - offset + 1;
                if (day < 1 || day > days) return <td key={weekday} className="event-calendar-empty" />;
                const date = `${month}-${String(day).padStart(2, "0")}`;
                const count = counts.get(date) ?? 0;
                return (
                  <td key={weekday}>
                    <button type="button" className="event-calendar-day" aria-pressed={date === selectedDate}
                      aria-current={date === today ? "date" : undefined}
                      aria-label={`${formatEventDate(date)}, ${count} ${count === 1 ? "evento" : "eventos"}`}
                      onClick={() => onSelect(date)}>
                      <time dateTime={date}>{day}</time>
                      {count > 0 && <span className="event-day-count" aria-hidden="true">{count}</span>}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
