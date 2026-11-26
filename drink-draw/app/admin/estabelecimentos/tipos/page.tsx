import { AdminPanel } from "@/components/admin-panel";
import { requirePanelSession } from "@/lib/admin-auth";

export const metadata = { title: "Tipos de estabelecimento | Drink Draw" };

export default async function EstablishmentTypesPage() {
  const user = await requirePanelSession();
  return <AdminPanel role={user.role} section="establishmentTypes" />;
}
