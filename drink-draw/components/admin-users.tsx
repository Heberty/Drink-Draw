"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { deletePanelUser, savePanelUser } from "@/app/admin/usuarios/actions";
import { AdminCollection } from "@/components/admin-collection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { CatalogValidationError } from "@/lib/catalog";
import { panelRoles, roleLabels, type PanelUser } from "@/lib/panel-users";

function UserForm({ record, ownAccount, onSave, onCancel }: {
  record?: PanelUser;
  ownAccount: boolean;
  onSave: (form: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (ownAccount) form.set("role", "admin");
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (reason) {
      setError(reason instanceof CatalogValidationError ? reason.message : "Não foi possível salvar a conta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="manager-form" onSubmit={submit}>
      {record && <input type="hidden" name="id" value={record.id} />}
      <fieldset className="admin-form-fields" disabled={saving}>
        <div className="field">
          <label htmlFor="panel-user-name">Nome</label>
          <Input id="panel-user-name" name="name" defaultValue={record?.name} required autoFocus maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="panel-user-username">Usuário</label>
          <Input id="panel-user-username" name="username" defaultValue={record?.username} required maxLength={120} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="panel-user-role">Perfil</label>
          <NativeSelect id="panel-user-role" name="role" defaultValue={record?.role ?? "user"} disabled={ownAccount}>
            {panelRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </NativeSelect>
        </div>
        <div className="field">
          <label htmlFor="panel-user-password">{record ? "Nova senha" : "Senha"}</label>
          <Input id="panel-user-password" name="password" type="password" minLength={8} maxLength={256}
            required={!record} autoComplete="new-password" aria-describedby="panel-password-help" />
          <p id="panel-password-help" className="form-feedback">
            {record ? "Deixe em branco para manter a senha atual." : "Use pelo menos 8 caracteres."}
          </p>
        </div>
      </fieldset>
      {error && <p className="form-feedback" role="alert">{error}</p>}
      <div className="modal-actions">
        <Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar usuário"}</Button>
      </div>
    </form>
  );
}

export function AdminUsers({ initialUsers, actorId }: { initialUsers: PanelUser[]; actorId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const router = useRouter();

  return (
    <AdminCollection
      title="Usuários"
      singular="usuário"
      createLabel="Novo usuário"
      description="Gerencie as contas e os perfis de acesso ao painel."
      records={users}
      ready
      canWrite
      icon={<Users aria-hidden="true" />}
      summary={(user) => `${user.username} · ${roleLabels[user.role]}`}
      canRemove={(user) => user.id !== actorId}
      onRemove={async (id) => {
        const result = await deletePanelUser(id);
        if (result.error) throw new CatalogValidationError(result.error);
        if (result.users) setUsers(result.users);
      }}
      renderForm={({ record, onSaved, onCancel }) => (
        <UserForm record={record} ownAccount={record?.id === actorId} onCancel={onCancel} onSave={async (form) => {
          const result = await savePanelUser(form);
          if (result.error) throw new CatalogValidationError(result.error);
          if (result.reauthenticate) {
            router.replace("/admin/login");
            return;
          }
          if (result.users) setUsers(result.users);
          onSaved();
        }} />
      )}
    />
  );
}
