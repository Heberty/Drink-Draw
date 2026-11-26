"use client";

import Link from "next/link";
import { Building2, CalendarDays, CupSoda, Layers, LogOut, Package, Settings2, Tag, Users } from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminUsers } from "@/components/admin-users";
import { AdminCollection } from "@/components/admin-collection";
import { ChoiceAdminForm, EstablishmentAdminForm, EventAdminForm } from "@/components/admin-forms";
import { useCatalog } from "@/components/catalog-provider";
import { ImportLegacyCatalog } from "@/components/import-legacy-catalog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/compare";
import { establishmentLabel } from "@/lib/establishments";
import { formatEventDate } from "@/lib/events";
import type { PanelRole, PanelUser } from "@/lib/panel-users";

const sections = {
  drinks: { href: "/admin", label: "Bebidas", icon: CupSoda },
  establishments: { href: "/admin/estabelecimentos", label: "Estabelecimentos", icon: Building2 },
  events: { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  users: { href: "/admin/usuarios", label: "Usuários", icon: Users },
};

const establishmentTypesPath = "/admin/estabelecimentos/tipos";
const drinkSections = {
  drinks: { href: sections.drinks.href, label: "Bebidas cadastradas" },
  types: { href: "/admin/bebidas/tipos", label: "Tipos de bebida" },
  brands: { href: "/admin/bebidas/marcas", label: "Marcas" },
  packagingTypes: { href: "/admin/bebidas/embalagens", label: "Embalagens" },
};
type Section = keyof typeof sections | keyof typeof drinkSections | "establishmentTypes";

export function AdminPanel({ section, role, users, actorId, calendarToday }: {
  section: Section;
  role: PanelRole;
  users?: PanelUser[];
  actorId?: string;
  calendarToday?: string;
}) {
  const { drinks, establishments, establishmentTypes, events, brands, types, packagingTypes, ready, canWrite, save, remove } = useCatalog();
  const collectionProps = { ready, canWrite };
  const inDrinks = section in drinkSections;
  const inEstablishments = section === "establishments" || section === "establishmentTypes";
  const choices = {
    brands: {
      title: "Marcas", singular: "marca", createLabel: "Nova marca", records: brands,
      description: "Cadastre as marcas usadas no formulário de bebidas.", icon: <Tag aria-hidden="true" />,
    },
    types: {
      title: "Tipos de bebida", singular: "tipo de bebida", createLabel: "Novo tipo de bebida", records: types,
      description: "Cadastre os tipos usados no formulário de bebidas.", icon: <Layers aria-hidden="true" />,
    },
    packagingTypes: {
      title: "Embalagens", singular: "embalagem", createLabel: "Nova embalagem", records: packagingTypes,
      description: "Cadastre as embalagens usadas no formulário de bebidas.", icon: <Package aria-hidden="true" />,
    },
    establishmentTypes: {
      title: "Tipos de estabelecimento", singular: "tipo de estabelecimento", createLabel: "Novo tipo de estabelecimento",
      records: establishmentTypes, description: "Cadastre as categorias usadas no mapa e no formulário de estabelecimentos.",
      icon: <Layers aria-hidden="true" />,
    },
  };

  return (
    <main className="frame dashboard admin-page">
      <div className="admin-intro">
        <div className="page-intro">
          <span className="overline"><Settings2 aria-hidden="true" /> Administração</span>
          <h1>Painel administrativo<span>.</span></h1>
          <p>Gerencie os cadastros do comparador, do mapa e da agenda.</p>
        </div>
        <form action={logoutAdmin} className="admin-signout">
          <Button type="submit" variant="outline"><LogOut aria-hidden="true" /> Sair</Button>
        </form>
      </div>
      <nav className="admin-nav" aria-label="Seções da administração">
        {Object.entries(sections).filter(([key]) => key !== "users" || role === "admin").map(([key, { href, label, icon: Icon }]) => {
          const inSection = (key === "drinks" && inDrinks) || (key === "establishments" && inEstablishments);
          return <Link key={key} href={href} aria-current={section === key ? "page" : inSection ? "location" : undefined}><Icon aria-hidden="true" /> {label}</Link>;
        })}
      </nav>
      {inDrinks && (
        <nav className="admin-nav" aria-label="Cadastros de bebidas">
          {Object.entries(drinkSections).map(([key, { href, label }]) => (
            <Link key={key} href={href} aria-current={section === key ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
      )}
      {inEstablishments && (
        <nav className="admin-nav" aria-label="Cadastros de estabelecimentos">
          <Link href={sections.establishments.href} aria-current={section === "establishments" ? "page" : undefined}>Locais</Link>
          <Link href={establishmentTypesPath} aria-current={section === "establishmentTypes" ? "page" : undefined}>Tipos de estabelecimento</Link>
        </nav>
      )}
      {section === "users" && role === "admin" && users && actorId && <AdminUsers initialUsers={users} actorId={actorId} />}
      {section === "drinks" && <ImportLegacyCatalog />}
      {section === "drinks" && (
        <AdminCollection
          key="drinks"
          title="Bebidas"
          singular="bebida"
          createLabel="Nova bebida"
          description="Gerencie o catálogo disponível nas ofertas."
          records={drinks}
          {...collectionProps}
          icon={<CupSoda aria-hidden="true" />}
          summary={(drink) => {
            const prices = drink.establishmentPrices ?? [];
            const singlePrice = prices.length === 1 ? prices[0] : undefined;
            const establishment = establishments.find(({ id }) => id === singlePrice?.establishmentId);
            const cents = singlePrice?.priceCents ?? drink.referencePriceCents;
            return [
              drink.brand, drink.type, `${drink.volume} mL`, drink.packaging,
              prices.length > 1 ? `${prices.length} estabelecimentos` : [
                cents === undefined ? undefined : formatPrice(cents / 100),
                establishment && establishmentLabel(establishment),
              ].filter(Boolean).join(" · "),
            ].filter(Boolean).join(" · ");
          }}
          onRemove={(id) => remove("drinks", id)}
          createHref="/admin/bebidas/nova"
          editHref={(drink) => `/admin/bebidas/${encodeURIComponent(drink.id)}/editar`}
        />
      )}
      {section === "establishments" && (
        <AdminCollection
          key="establishments"
          title="Estabelecimentos"
          singular="estabelecimento"
          createLabel="Novo estabelecimento"
          description="Gerencie os locais do mapa e os estabelecimentos disponíveis nas ofertas."
          records={establishments}
          {...collectionProps}
          icon={<Building2 aria-hidden="true" />}
          summary={(record) => [record.type, record.branch, [record.city, record.state].filter(Boolean).join(" / ")].filter(Boolean).join(" · ")}
          onRemove={(id) => remove("establishments", id)}
          renderForm={({ onSaved, ...props }) => <EstablishmentAdminForm {...props} onSave={async (record) => {
            await save("establishments", record);
            onSaved();
          }} />}
        />
      )}
      {section === "events" && (
        <AdminCollection
          title="Eventos"
          singular="evento"
          createLabel="Novo evento"
          description="Gerencie a agenda pública de eventos."
          records={events}
          calendar={calendarToday ? { today: calendarToday, dateFor: (event) => event.date } : undefined}
          {...collectionProps}
          icon={<CalendarDays aria-hidden="true" />}
          summary={(event) => [formatEventDate(event.date), event.time, event.location, event.sample && "Evento fictício"].filter(Boolean).join(" · ")}
          onRemove={(id) => remove("events", id)}
          renderForm={({ onSaved, ...props }) => <EventAdminForm {...props} onSave={async (record) => {
            await save("events", record);
            onSaved();
          }} />}
        />
      )}
      {(section === "brands" || section === "types" || section === "packagingTypes" || section === "establishmentTypes") && (
        <AdminCollection
          key={section}
          {...choices[section]}
          {...collectionProps}
          summary={() => ""}
          onRemove={(id) => remove(section, id)}
          renderForm={({ onSaved, ...props }) => <ChoiceAdminForm {...props} onSave={async (record) => {
            await save(section, record);
            onSaved();
          }} />}
        />
      )}
    </main>
  );
}
