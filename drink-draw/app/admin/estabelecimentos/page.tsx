import { AdminPanel } from "@/components/admin-panel";
import { requirePanelSession } from "@/lib/admin-auth";

export const metadata = { title: "Administrar estabelecimentos | Drink Draw" };

export default async function EstablishmentsPage() {
  const user = await requirePanelSession();
  return <AdminPanel role={user.role} section="establishments" />;
}
