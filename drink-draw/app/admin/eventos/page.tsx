import { AdminPanel } from "@/components/admin-panel";
import { requirePanelSession } from "@/lib/admin-auth";
import { eventToday } from "@/lib/events";

export const metadata = { title: "Administrar eventos | Drink Draw" };

export default async function AdminEventsPage() {
  const user = await requirePanelSession();
  return <AdminPanel role={user.role} section="events" calendarToday={eventToday()} />;
}
