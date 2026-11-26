import { EventsSchedule } from "@/components/events-schedule";
import { loadCatalog } from "@/lib/catalog-db";
import { eventToday, validEventDate, type EventAgendaParams } from "@/lib/events";

export const metadata = { title: "Eventos | Drink Draw" };
export const dynamic = "force-dynamic";

export default async function EventsPage({ searchParams }: { searchParams: Promise<EventAgendaParams> }) {
  const { data, visualizacao } = await searchParams;
  const today = eventToday();
  const date = validEventDate(data) ? data : today;
  const view = visualizacao === "lista" ? "list" : "calendar";
  return <EventsSchedule key={`${view}-${date}`} initialEvents={loadCatalog().events} today={today} initialDate={date} initialView={view} />;
}
