"use server";

import { randomUUID } from "node:crypto";
import { getPanelSession, hashPanelPassword } from "@/lib/admin-auth";
import { CatalogValidationError } from "@/lib/catalog";
import { panelRoles, type PanelRole, type PanelUser } from "@/lib/panel-users";
import { sqlite } from "@/lib/sqlite";

export async function savePanelUser(form: FormData) {
  const actor = await getPanelSession();
  if (actor?.role !== "admin") return { error: "Somente administradores podem gerenciar usuários." };

  const name = form.get("name")?.toString().trim() ?? "";
  const username = form.get("username")?.toString().trim() ?? "";
  const id = form.get("id")?.toString() || randomUUID();
  const role = form.get("role") as PanelRole;
  const password = form.get("password")?.toString() ?? "";

  if (!name || name.length > 100 || !username || username.length > 120 || /\s/.test(username) ||
    !/^[a-f0-9-]{36}$/.test(id) || !panelRoles.includes(role)) {
    return { error: "Confira o nome, o usuário sem espaços e o perfil." };
  }
  if (password && (password.length < 8 || password.length > 256)) {
    return { error: "A senha deve ter entre 8 e 256 caracteres." };
  }

  try {
    const passwordHash = password ? await hashPanelPassword(password) : undefined;
    sqlite("save_user", { actor, user: { id, username, name, role, passwordHash } });
    if (id === actor.id && (password || username !== actor.username)) return { reauthenticate: true };
    return { users: sqlite<PanelUser[]>("users", { actor }) };
  } catch (error) {
    return { error: error instanceof CatalogValidationError ? error.message : "Não foi possível salvar a conta." };
  }
}

export async function deletePanelUser(id: string) {
  const actor = await getPanelSession();
  if (actor?.role !== "admin") return { error: "Somente administradores podem gerenciar usuários." };
  if (!/^[a-f0-9-]{36}$/.test(id)) return { error: "Conta inválida." };

  try {
    sqlite("delete_user", { actor, id });
    return { users: sqlite<PanelUser[]>("users", { actor }) };
  } catch (error) {
    return { error: error instanceof CatalogValidationError ? error.message : "Não foi possível excluir a conta." };
  }
}
