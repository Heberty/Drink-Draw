import { AdminPanel } from "@/components/admin-panel";
import { requirePanelSession } from "@/lib/admin-auth";

export const metadata = { title: "Administrar tipos de bebida | Drink Draw" };

export default async function DrinkTypesPage() {
  const user = await requirePanelSession();
  return <AdminPanel role={user.role} section="types" />;
}
