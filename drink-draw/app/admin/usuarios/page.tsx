import { AdminPanel } from "@/components/admin-panel";
import { requireAdministrator } from "@/lib/admin-auth";
import type { PanelUser } from "@/lib/panel-users";
import { sqlite } from "@/lib/sqlite";

export const metadata = { title: "Administrar usuários | Drink Draw" };

export default async function UsersPage() {
  const actor = await requireAdministrator();
  const users = sqlite<PanelUser[]>("users", { actor });
  return <AdminPanel section="users" role={actor.role} users={users} actorId={actor.id} />;
}
