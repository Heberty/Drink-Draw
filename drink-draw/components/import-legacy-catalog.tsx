"use client";

import { useState } from "react";
import { Database } from "lucide-react";
import { saveAdminCatalogRecord } from "@/app/admin/actions";
import { recordForm, useCatalog } from "@/components/catalog-provider";
import { Button } from "@/components/ui/button";
import { readLegacyCatalog } from "@/lib/legacy-catalog";

export function ImportLegacyCatalog() {
  const { reload, canWrite } = useCatalog();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function importRecords() {
    setPending(true);
    setMessage("");
    let imported = 0;
    let failed = 0;

    try {
      const legacy = await readLegacyCatalog();
      for (const collection of ["brands", "types", "packagingTypes", "establishments", "drinks"] as const) {
        for (const record of legacy[collection]) {
          const result = await saveAdminCatalogRecord(collection, recordForm(record, true));
          if (result.error) failed++;
          else if (result.saved) imported++;
        }
      }
      if (imported) await reload();

      const status = imported ? `${imported} cadastro(s) importado(s).` : "Nenhum cadastro novo encontrado neste navegador.";
      setMessage(failed ? `${status} ${failed} cadastro(s) não puderam ser importados.` : status);
    } catch {
      setMessage(imported ? `${imported} cadastro(s) importado(s) antes da interrupção. Tente novamente.` : "Não foi possível importar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-import">
      <Button type="button" variant="outline" onClick={importRecords} disabled={!canWrite || pending}>
        <Database aria-hidden="true" /> {pending ? "Importando…" : "Importar cadastros do navegador"}
      </Button>
      {message && <p className="form-feedback" role="status">{message}</p>}
    </div>
  );
}
