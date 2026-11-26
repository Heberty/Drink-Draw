"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DrinkAdminForm } from "@/components/admin-forms";
import { useCatalog } from "@/components/catalog-provider";
import { Button } from "@/components/ui/button";
import type { Drink } from "@/lib/drinks";

export function AdminDrinkEditor({ record }: { record?: Drink }) {
  const router = useRouter();
  const { ready, canWrite, save } = useCatalog();

  return (
    <main className="frame dashboard">
      <Button asChild variant="outline" className="detail-back">
        <Link href="/admin"><ArrowLeft aria-hidden="true" /> Voltar para bebidas</Link>
      </Button>
      <header className="page-intro">
        <h1>{record ? "Editar bebida" : "Nova bebida"}<span>.</span></h1>
        {record && <p>{record.name} · {record.volume} mL · {record.packaging}</p>}
      </header>
      {!ready && <p role="status">Carregando cadastro…</p>}
      {ready && !canWrite && <p className="form-feedback" role="alert">O banco de dados está indisponível. A edição está desativada.</p>}
      {ready && canWrite && (
        <DrinkAdminForm record={record} onCancel={() => router.push("/admin")} onSave={async (drink) => {
          await save("drinks", drink);
          router.push("/admin");
        }} />
      )}
    </main>
  );
}
