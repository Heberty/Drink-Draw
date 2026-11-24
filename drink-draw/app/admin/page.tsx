import { AdminPanel } from "@/components/admin-panel";
import { requirePanelSession } from "@/lib/admin-auth";

export const metadata = { title: "Administrar bebidas | Drink Draw" };

export default async function AdminPage() {
  const user = await requirePanelSession();
  return <AdminPanel role={user.role} section="drinks" />;
}
