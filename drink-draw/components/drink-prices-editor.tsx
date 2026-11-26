"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";
import { AdminPagination, useAdminPagination } from "@/components/admin-pagination";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { establishmentLabel, type Establishment } from "@/lib/establishments";

export type PriceRow = { establishmentId: string; price: string };

const availableSize = 8;

function searchKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function preventSearchSubmit(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") event.preventDefault();
}

export function DrinkPricesEditor({ establishments, rows, onChange }: {
  establishments: Establishment[];
  rows: PriceRow[];
  onChange: (rows: PriceRow[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [storeSearch, setStoreSearch] = useState("");
  const addedStore = useRef<string>(undefined);
  const storeOptions = useMemo(() => establishments.map((store) => ({
    id: store.id,
    label: establishmentLabel(store),
    searchText: searchKey(`${establishmentLabel(store)} ${store.address}`),
  })).sort((a, b) => a.label.localeCompare(b.label, "pt-BR")), [establishments]);
  const storesById = useMemo(() => new Map(storeOptions.map((store) => [store.id, store])), [storeOptions]);
  const linkedIds = new Set(rows.map(({ establishmentId }) => establishmentId));

  const query = searchKey(search);
  const filtered = query ? rows.filter(({ establishmentId }) => storesById.get(establishmentId)?.searchText.includes(query)) : rows;
  const { pageItems: visibleRows, pagination } = useAdminPagination(filtered);
  const storeQuery = searchKey(storeSearch);
  const available = adding ? storeOptions.filter(({ id, searchText }) => !linkedIds.has(id) && searchText.includes(storeQuery)) : [];

  useEffect(() => {
    if (!addedStore.current) return;
    document.getElementById(`admin-price-${addedStore.current}`)?.focus();
    addedStore.current = undefined;
  }, [rows]);

  function addStore(establishmentId: string) {
    addedStore.current = establishmentId;
    onChange([{ establishmentId, price: "" }, ...rows]);
    setSearch("");
    pagination.setPage(1);
    setAdding(false);
  }

  return (
    <section className="admin-drink-prices" aria-labelledby="drink-prices-title">
      <h2 id="drink-prices-title">Preços por estabelecimento</h2>
      <div className="admin-price-toolbar">
        {rows.length > 0 && (
          <Input type="search" aria-label="Buscar nos preços cadastrados" placeholder="Buscar nos preços cadastrados"
            value={search} onKeyDown={preventSearchSubmit} onChange={(event) => { setSearch(event.target.value); pagination.setPage(1); }} />
        )}
        {establishments.length ? (
          <Button type="button" variant="outline" aria-expanded={adding} aria-controls={adding ? "drink-price-store-picker" : undefined}
            disabled={!adding && rows.length >= establishments.length}
            onClick={() => { setStoreSearch(""); setAdding((open) => !open); }}>
            {adding ? <X aria-hidden="true" /> : <Plus aria-hidden="true" />}
            {adding ? "Fechar busca" : "Adicionar preço"}
          </Button>
        ) : <Link href="/admin/estabelecimentos" className="text-sm underline">Cadastrar um estabelecimento</Link>}
      </div>
      {adding && (
        <div id="drink-price-store-picker" className="admin-price-picker">
          <div className="field">
            <label htmlFor="drink-price-store-search">Buscar estabelecimento para adicionar</label>
            <Input id="drink-price-store-search" type="search" value={storeSearch} autoFocus onKeyDown={preventSearchSubmit}
              onChange={(event) => setStoreSearch(event.target.value)} />
          </div>
          {available.length ? (
            <ul className="admin-price-candidates">
              {available.slice(0, availableSize).map(({ id, label }) => (
                <li key={id}>
                  <button type="button" onClick={() => addStore(id)}><Plus aria-hidden="true" />{label}</button>
                </li>
              ))}
            </ul>
          ) : <p role="status">Nenhum estabelecimento disponível para esta busca.</p>}
          {available.length > availableSize && <p>Refine a busca para ver outros estabelecimentos.</p>}
        </div>
      )}
      {visibleRows.length > 0 ? (
        <ul className="admin-price-list">
          {visibleRows.map(({ establishmentId, price }) => {
            const name = storesById.get(establishmentId)?.label ?? establishmentId;
            return (
              <li key={establishmentId} className="admin-drink-price-row">
                <strong>{name}</strong>
                <div className="field">
                  <label htmlFor={`admin-price-${establishmentId}`}>Preço unitário</label>
                  <CurrencyInput id={`admin-price-${establishmentId}`} aria-label={`Preço unitário em ${name}`} value={price}
                    onValueChange={(value) => onChange(rows.map((row) => row.establishmentId === establishmentId ? { ...row, price: value } : row))} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remover preço em ${name}`}
                  onClick={() => onChange(rows.filter((row) => row.establishmentId !== establishmentId))}>
                  <X aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : <p>{rows.length ? "Nenhum preço encontrado." : "Nenhum preço cadastrado para esta bebida."}</p>}
      <AdminPagination {...pagination} />
    </section>
  );
}
