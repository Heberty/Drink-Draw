"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { deleteAdminCatalogRecord, saveAdminCatalogRecord } from "@/app/admin/actions";
import { CatalogValidationError, initialCatalog, type CatalogData, type CatalogRecord } from "@/lib/catalog";

type CatalogContext = CatalogData & {
  ready: boolean;
  canWrite: boolean;
  reload: () => Promise<void>;
  save: <K extends keyof CatalogData>(collection: K, record: CatalogRecord<K>) => Promise<void>;
  remove: (collection: keyof CatalogData, id: string) => Promise<void>;
};

const Context = createContext<CatalogContext | null>(null);

export function recordForm(record: { id: string; name: string; image?: Blob | string }, importing = false) {
  const { image, ...fields } = record;
  const form = new FormData();
  form.set("record", JSON.stringify(fields));

  if (image instanceof Blob) form.set("image", image, "imagem");
  else if (!image && !importing) form.set("removeImage", "true");
  if (importing) form.set("import", "true");

  return form;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(initialCatalog);
  const [ready, setReady] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const revision = useRef(0);

  async function reload() {
    const reading = ++revision.current;
    const response = await fetch("/api/catalogo", { cache: "no-store" });
    if (!response.ok) throw new Error("Catálogo indisponível");
    const result: CatalogData = await response.json();
    if (reading === revision.current) {
      setData(result);
      setCanWrite(true);
    }
  }

  useEffect(() => {
    let active = true;
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("drink-draw-catalog-server");
      channel.current.onmessage = () => { void reload().catch(() => {}); };
    }
    void reload().catch(() => {}).finally(() => { if (active) setReady(true); });

    return () => {
      active = false;
      ++revision.current;
      channel.current?.close();
      channel.current = null;
    };
  }, []);

  function update(data: CatalogData | undefined) {
    if (data) {
      ++revision.current;
      setData(data);
    }
    channel.current?.postMessage("updated");
  }

  async function save<K extends keyof CatalogData>(collection: K, record: CatalogRecord<K>) {
    const result = await saveAdminCatalogRecord(collection, recordForm(record));
    if (result.error) throw new CatalogValidationError(result.error);
    update(result.catalog);
  }

  async function remove(collection: keyof CatalogData, id: string) {
    const result = await deleteAdminCatalogRecord(collection, id);
    if (result.error) throw new CatalogValidationError(result.error);
    update(result.catalog);
  }

  return <Context.Provider value={{ ...data, ready, canWrite, reload, save, remove }}>{children}</Context.Provider>;
}

export function useCatalog() {
  const context = useContext(Context);
  if (!context) throw new Error("CatalogProvider ausente");
  return context;
}
