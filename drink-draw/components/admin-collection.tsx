"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AdminPagination, useAdminPagination } from "@/components/admin-pagination";
import { CatalogImage } from "@/components/catalog-image";
import { EventCalendar, EventsViewToggle, type EventsView } from "@/components/event-calendar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CatalogValidationError } from "@/lib/catalog";
import { formatEventDate } from "@/lib/events";

export type FormProps<T> = {
  record?: T;
  onSave: (record: T) => Promise<void>;
  onCancel: () => void;
};

type Entry = { id: string; name: string; image?: Blob | string };

type Props<T> = {
  title: string;
  singular: string;
  createLabel: string;
  description: string;
  records: T[];
  ready: boolean;
  canWrite: boolean;
  summary: (record: T) => string;
  icon: ReactNode;
  canRemove?: (record: T) => boolean;
  onRemove: (id: string) => Promise<void>;
  calendar?: { today: string; dateFor: (record: T) => string };
} & (
  | { renderForm: (props: Omit<FormProps<T>, "onSave"> & { onSaved: () => void }) => ReactNode; createHref?: never; editHref?: never }
  | { renderForm?: never; createHref: string; editHref: (record: T) => string }
);

export function AdminCollection<T extends Entry>({
  title, singular, createLabel, description, records, ready, canWrite, summary, icon, canRemove, onRemove, renderForm, createHref, editHref, calendar,
}: Props<T>) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<T | null>();
  const [deleting, setDeleting] = useState<T>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<EventsView>("list");
  const [selectedDate, setSelectedDate] = useState(calendar?.today ?? "");

  function openEditor(record: T | null) {
    setMessage("");
    setEditing(record);
  }

  function openDelete(record: T) {
    setMessage("");
    setError("");
    setDeleting(record);
  }

  function closeSavedEditor() {
    setEditing(undefined);
    setMessage("Cadastro salvo.");
  }

  async function deleteRecord() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      await onRemove(deleting.id);
      setMessage(`${deleting.name} foi excluído do cadastro.`);
      setDeleting(undefined);
    } catch (reason) {
      setError(reason instanceof CatalogValidationError ? reason.message : "Não foi possível excluir. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function matchingRecords(value: string) {
    const query = value.trim().toLocaleLowerCase("pt-BR");
    return records.filter((record) =>
      `${record.name} ${summary(record)} ${calendar?.dateFor(record) ?? ""}`.toLocaleLowerCase("pt-BR").includes(query),
    );
  }

  const filtered = matchingRecords(search)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const calendarActive = calendar && view === "calendar";
  const visible = calendarActive ? filtered.filter((record) => calendar.dateFor(record) === selectedDate) : filtered;
  const { pageItems, pagination } = useAdminPagination(visible);

  function selectDay(date: string) {
    setSelectedDate(date);
    pagination.setPage(1);
  }

  function showFirstMatchingDay(matches: T[]) {
    if (!calendar) return;
    const dates = matches.map(calendar.dateFor);
    if (!dates.includes(selectedDate) && dates.length) selectDay(dates.sort()[0]);
  }

  const listing = (
    <>
      {pageItems.length > 0 ? (
        <Card className="admin-list-card">
          <ul className="admin-list">
            {pageItems.map((record) => (
              <li key={record.id}>
                <span className="admin-record-media">{record.image ? <CatalogImage image={record.image} /> : icon}</span>
                <div className="admin-record-copy"><strong>{record.name}</strong><span>{summary(record)}</span></div>
                <div className="admin-record-actions">
                  {editHref && canWrite ? (
                    <Button asChild variant="outline" className="admin-record-edit">
                      <Link href={editHref(record)} prefetch={false} aria-label={`Editar ${record.name}`}>
                        <Pencil aria-hidden="true" /> <span>Editar</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" className="admin-record-edit" onClick={() => openEditor(record)}
                      aria-label={`Editar ${record.name}`} disabled={!canWrite}>
                      <Pencil aria-hidden="true" /> <span>Editar</span>
                    </Button>
                  )}
                  {(!canRemove || canRemove(record)) && (
                    <Button type="button" variant="ghost" size="icon" className="admin-record-delete" onClick={() => openDelete(record)}
                      aria-label={`Excluir ${record.name}`} disabled={!canWrite}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="admin-empty">{!ready ? "Carregando cadastros…" : calendarActive ? "Nenhum evento neste dia."
          : search.trim() ? "Nenhum resultado encontrado." : "Nenhum cadastro disponível."}</Card>
      )}
      {ready && <AdminPagination {...pagination} />}
    </>
  );

  return (
    <section aria-labelledby="admin-section-title" className={calendarActive ? "admin-collection admin-collection-calendar" : "admin-collection"}>
      <div className="admin-section-header">
        <div>
          <h2 id="admin-section-title">{title}</h2>
          <p>{description}</p>
        </div>
        {createHref && canWrite ? (
          <Button asChild><Link href={createHref}><Plus aria-hidden="true" /> {createLabel}</Link></Button>
        ) : (
          <Button type="button" onClick={() => openEditor(null)} disabled={!canWrite}><Plus aria-hidden="true" /> {createLabel}</Button>
        )}
      </div>
      {ready && !canWrite && <p className="form-feedback" role="alert">O banco de dados está indisponível. A edição está desativada.</p>}
      <div className="admin-search">
        <Search aria-hidden="true" />
        <Input type="search" aria-label={`Buscar em ${title.toLocaleLowerCase("pt-BR")}`} placeholder={`Buscar em ${title.toLocaleLowerCase("pt-BR")}`}
          value={search} onChange={(event) => {
            const value = event.target.value;
            setSearch(value);
            pagination.setPage(1);
            if (calendarActive && value.trim()) showFirstMatchingDay(matchingRecords(value));
          }} />
      </div>
      {calendar && <EventsViewToggle view={view} onChange={(nextView) => {
        if (nextView === view) return;
        setView(nextView);
        pagination.setPage(1);
        if (nextView === "calendar" && search.trim()) showFirstMatchingDay(filtered);
      }} />}
      <p className="admin-status" role="status">{message}</p>
      {calendarActive ? (
        <div className="events-calendar-layout admin-calendar-layout">
          <EventCalendar dates={filtered.map(calendar.dateFor)} today={calendar.today} selectedDate={selectedDate} onSelect={selectDay} />
          <section className="admin-calendar-results" aria-labelledby="admin-selected-event-date">
            <h3 id="admin-selected-event-date">{formatEventDate(selectedDate)}</h3>
            {listing}
          </section>
        </div>
      ) : listing}
      {renderForm && <Dialog open={editing !== undefined} onOpenChange={(open) => { if (!open) setEditing(undefined); }}>
        <DialogContent className="max-w-xl">
          <DialogTitle className="pr-8 text-xl font-bold">{editing ? `Editar ${singular}` : createLabel}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">Preencha os dados do cadastro.</DialogDescription>
          {editing !== undefined && renderForm({ record: editing ?? undefined, onSaved: closeSavedEditor, onCancel: () => setEditing(undefined) })}
        </DialogContent>
      </Dialog>}
      <Dialog open={!!deleting} onOpenChange={(open) => { if (!open && !busy) setDeleting(undefined); }}>
        <DialogContent>
          <DialogTitle className="pr-8 text-xl font-bold">Excluir {singular}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            {deleting?.name} será removido do cadastro.
          </DialogDescription>
          {error && <p className="form-feedback mt-3" role="alert">{error}</p>}
          <div className="modal-actions">
            <Button type="button" variant="outline" onClick={() => setDeleting(undefined)} disabled={busy}>Cancelar</Button>
            <Button type="button" className="danger-button" onClick={deleteRecord} disabled={busy}>Confirmar exclusão</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
