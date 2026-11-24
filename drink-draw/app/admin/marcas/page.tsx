import { AdminPanel } from "@/components/admin-panel";
import { requirePanelSession } from "@/lib/admin-auth";

export const metadata = { title: "Administrar marcas | Drink Draw" };

export default async function BrandsPage() {
  const user = await requirePanelSession();
  return <AdminPanel role={user.role} section="brands" />;
}
