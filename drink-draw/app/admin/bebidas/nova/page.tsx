import { AdminDrinkEditor } from "@/components/admin-drink-editor";
import { requirePanelSession } from "@/lib/admin-auth";

export const metadata = { title: "Nova bebida | Drink Draw" };

export default async function NewDrinkPage() {
  await requirePanelSession();
  return <AdminDrinkEditor />;
}
