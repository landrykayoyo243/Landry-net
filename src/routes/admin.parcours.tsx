import { createFileRoute } from "@tanstack/react-router";
import { ResourceAdmin, type Field } from "@/components/admin/ResourceAdmin";
import { adminExperiencesQuery } from "@/lib/admin-data";

export const Route = createFileRoute("/admin/parcours")({ component: Page });

const kinds = [
  { value: "emploi", label: "Emploi" },
  { value: "stage", label: "Stage" },
  { value: "formation", label: "Formation" },
];
const fields: Field[] = [
  { name: "kind", label: "Type", type: "select", required: true, max: 20, options: kinds },
  { name: "title", label: "Titre", type: "text", required: true, max: 160, placeholder: "Ex. Stagiaire académique" },
  { name: "organization", label: "Organisation", type: "text", required: true, max: 160 },
  { name: "period", label: "Période", type: "text", required: true, max: 60, placeholder: "Ex. 2026, Stage · 2 mois" },
];

function Page() {
  return (
    <ResourceAdmin
      table="experiences" title="Parcours" singular="expérience ou formation"
      intro="Frise affichée sur l'accueil et sur la page À propos."
      fields={fields}
      query={adminExperiencesQuery as never}
      rowTitle={(r) => String(r["title"])}
      rowMeta={(r) => `${kinds.find((k) => k.value === r["kind"])?.label ?? ""} · ${String(r["organization"])} · ${String(r["period"])}`}
    />
  );
}
