import { AdminPanel } from "@/components/admin-panel";
import { requirePanelSession } from "@/lib/admin-auth";

export const metadata = { title: "Administrar embalagens | Drink Draw" };

export default async function PackagingTypesPage() {
  const user = await requirePanelSession();
  return <AdminPanel role={user.role} section="packagingTypes" />;
}
