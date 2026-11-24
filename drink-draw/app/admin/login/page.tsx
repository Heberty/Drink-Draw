import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { AdminLogin } from "@/components/admin-login";
import { Card } from "@/components/ui/card";
import { adminLoginConfigured, getPanelSession } from "@/lib/admin-auth";

export const metadata = { title: "Entrar na administração | Drink Draw" };

export default async function LoginPage() {
  if (await getPanelSession()) redirect("/admin");

  return (
    <main className="frame dashboard admin-login-page">
      <Card className="admin-login-card">
        <span className="admin-login-icon"><LockKeyhole aria-hidden="true" /></span>
        <h1>Entrar na administração</h1>
        <AdminLogin configured={adminLoginConfigured()} />
      </Card>
    </main>
  );
}
