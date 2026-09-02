import { Layers3 } from 'lucide-react';
import { groupResources, summarizeResources } from '../lib/resources';
import type { DtddResource, GroupByKey } from '../types';

const currency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const groupLabels: Record<Exclude<GroupByKey, ''>, string> = {
  classification: 'type',
  state: 'état',
  team: 'équipe',
  skill: 'compétence',
  supplier: 'fournisseur',
};

export function GroupedCostsTable({
  resources,
  groupBy,
}: {
  resources: DtddResource[];
  groupBy: Exclude<GroupByKey, ''>;
}) {
  const groups = groupResources(resources, groupBy);
  const totals = summarizeResources(resources);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-brand">
          <Layers3 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-black text-slate-900">Coûts par {groupLabels[groupBy]}</h2>
          <p className="text-xs text-slate-400">Synthèse des ressources et des coûts filtrés</p>
        </div>
      </div>
      {groups.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="text-left">{groupLabels[groupBy]}</th>
                <th>Nombre de personnes</th>
                <th>Coût total HT</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.label}>
                  <td className="text-left font-bold text-slate-800">{group.label}</td>
                  <td>{group.people}</td>
                  <td>{currency(group.totalCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th className="text-left">Total</th>
                <th>{resources.length}</th>
                <th>{currency(totals.totalCost)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="p-6 text-sm text-slate-500">Aucune ressource pour ce regroupement.</p>
      )}
    </section>
  );
}
