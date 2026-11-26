import { notFound, redirect } from "next/navigation";
import { AdminDrinkEditor } from "@/components/admin-drink-editor";
import { requirePanelSession } from "@/lib/admin-auth";
import { findCatalogDrink } from "@/lib/catalog-db";

export const metadata = { title: "Editar bebida | Drink Draw" };

export default async function EditDrinkPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePanelSession();
  const { id } = await params;
  const drink = findCatalogDrink(id);
  if (!drink) notFound();
  if (drink.id !== id) redirect(`/admin/bebidas/${encodeURIComponent(drink.id)}/editar`);
  return <AdminDrinkEditor key={drink.id} record={drink} />;
}
