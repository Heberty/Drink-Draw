"use client";

import Link from "next/link";
import { Building2, CupSoda, Layers, LogOut, Settings2, Tag, Users } from "lucide-react";
import { logoutAdmin } from "@/app/admin/actions";
import { AdminUsers } from "@/components/admin-users";
import { AdminCollection } from "@/components/admin-collection";
import { ChoiceAdminForm, DrinkAdminForm, EstablishmentAdminForm } from "@/components/admin-forms";
import { useCatalog } from "@/components/catalog-provider";
import { ImportLegacyCatalog } from "@/components/import-legacy-catalog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/compare";
import { establishmentLabel } from "@/lib/establishments";
import type { PanelRole, PanelUser } from "@/lib/panel-users";

const sections = {
  drinks: { href: "/admin", label: "Bebidas", icon: CupSoda },
  establishments: { href: "/admin/estabelecimentos", label: "Estabelecimentos", icon: Building2 },
  brands: { href: "/admin/marcas", label: "Marcas", icon: Tag },
  types: { href: "/admin/tipos", label: "Tipos de bebida", icon: Layers },
  users: { href: "/admin/usuarios", label: "Usuários", icon: Users },
};

const establishmentTypesPath = "/admin/estabelecimentos/tipos";
type Section = keyof typeof sections | "establishmentTypes";

export function AdminPanel({ section, role, users, actorId }: {
  section: Section;
  role: PanelRole;
  users?: PanelUser[];
  actorId?: string;
}) {
  const { drinks, establishments, establishmentTypes, brands, types, ready, canWrite, save, remove } = useCatalog();
  const collectionProps = { ready, canWrite };
  const inEstablishments = section === "establishments" || section === "establishmentTypes";
  const choice = section === "brands" ? { title: "Marcas", singular: "marca", createLabel: "Nova marca", records: brands }
    : section === "types" ? { title: "Tipos de bebida", singular: "tipo de bebida", createLabel: "Novo tipo de bebida", records: types }
    : { title: "Tipos de estabelecimento", singular: "tipo de estabelecimento", createLabel: "Novo tipo de estabelecimento", records: establishmentTypes };

  return (
    <main className="frame dashboard admin-page">
      <div className="admin-intro">
        <div className="page-intro">
          <span className="overline"><Settings2 aria-hidden="true" /> Administração</span>
          <h1>Painel administrativo<span>.</span></h1>
          <p>Gerencie os cadastros do comparador e do mapa.</p>
        </div>
        <form action={logoutAdmin} className="admin-signout">
          <Button type="submit" variant="outline"><LogOut aria-hidden="true" /> Sair</Button>
        </form>
      </div>
      <nav className="admin-nav" aria-label="Seções da administração">
        {Object.entries(sections).filter(([key]) => key !== "users" || role === "admin").map(([key, { href, label, icon: Icon }]) => (
          <Link key={key} href={href} aria-current={section === key ? "page" : key === "establishments" && inEstablishments ? "location" : undefined}><Icon aria-hidden="true" /> {label}</Link>
        ))}
      </nav>
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
            const establishment = establishments.find(({ id }) => id === drink.referenceEstablishmentId);
            return [
              drink.brand, drink.type, `${drink.volume} mL`, drink.packaging,
              drink.referencePriceCents === undefined ? undefined : formatPrice(drink.referencePriceCents / 100),
              establishment && establishmentLabel(establishment),
            ].filter(Boolean).join(" · ");
          }}
          onRemove={(id) => remove("drinks", id)}
          renderForm={({ onSaved, ...props }) => <DrinkAdminForm {...props} onSave={async (record) => {
            await save("drinks", record);
            onSaved();
          }} />}
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
      {(section === "brands" || section === "types" || section === "establishmentTypes") && (
        <AdminCollection
          key={section}
          {...choice}
          description={section === "establishmentTypes" ? "Cadastre as categorias usadas no mapa e no formulário de estabelecimentos."
            : section === "brands" ? "Cadastre as marcas usadas no formulário de bebidas." : "Cadastre os tipos usados no formulário de bebidas."}
          {...collectionProps}
          icon={section === "brands" ? <Tag aria-hidden="true" /> : <Layers aria-hidden="true" />}
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
