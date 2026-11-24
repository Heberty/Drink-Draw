"use client";

import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLogin({ configured }: { configured: boolean }) {
  const [message, submit, pending] = useActionState(loginAdmin, "");

  return (
    <form action={submit} className="manager-form">
      {!configured && <p className="form-feedback" role="alert">
        Configure as credenciais em <code>.env.local</code> para liberar o acesso. As instruções estão no README.
      </p>}
      <fieldset className="admin-form-fields" disabled={!configured || pending}>
        <div className="field">
          <label htmlFor="admin-user">Usuário</label>
          <Input id="admin-user" name="user" autoComplete="username" maxLength={120} required />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Senha</label>
          <Input id="admin-password" name="password" type="password" autoComplete="current-password" maxLength={256} required />
        </div>
        <Button type="submit"><LogIn aria-hidden="true" /> {pending ? "Entrando…" : "Entrar"}</Button>
      </fieldset>
      {message && <p className="form-feedback" role="alert">{message}</p>}
    </form>
  );
}
