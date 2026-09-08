import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Layers3 } from 'lucide-react';
import {
  EXTERNAL_ANNUAL_WORKING_DAYS,
  getFullTimeEquivalentPeriodMultiplier,
  groupResources,
  INTERNAL_ANNUAL_WORKING_DAYS,
  sortGroupedResources,
  summarizeFullTimeEquivalent,
  summarizeResources,
} from '../lib/resources';
import type { GroupSortKey } from '../lib/resources';
import type { DtddResource, GroupByKey, SortDirection } from '../types';

const currency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const number = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

const groupLabels: Record<Exclude<GroupByKey, ''>, string> = {
  classification: 'type',
  state: 'état',
  team: 'équipe',
  skill: 'compétence',
  supplier: 'fournisseur',
};

function SortHeader({
  label,
  column,
  sortKey,
  direction,
  align = 'right',
  title,
  onSort,
}: {
  label: string;
  column: GroupSortKey;
  sortKey: GroupSortKey;
  direction: SortDirection;
  align?: 'left' | 'right';
  title?: string;
  onSort: (key: GroupSortKey) => void;
}) {
  const active = column === sortKey;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        title={title}
        className={`table-sort w-full ${align === 'right' ? 'justify-end' : ''}`}
      >
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? 'text-accent' : 'text-slate-500'}`} />
      </button>
    </th>
  );
}

export function GroupedCostsTable({
  resources,
  groupBy,
  budgetYear,
  quarter,
}: {
  resources: DtddResource[];
  groupBy: Exclude<GroupByKey, ''>;
  budgetYear: number | null;
  quarter: string | null;
}) {
  const [sortKey, setSortKey] = useState<GroupSortKey>('totalCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const fullTimeEquivalentPeriodMultiplier = getFullTimeEquivalentPeriodMultiplier(
    resources,
    budgetYear,
    quarter,
  );
  const internalReferenceDays = INTERNAL_ANNUAL_WORKING_DAYS * fullTimeEquivalentPeriodMultiplier;
  const externalReferenceDays = EXTERNAL_ANNUAL_WORKING_DAYS * fullTimeEquivalentPeriodMultiplier;
  const groups = useMemo(
    () =>
      sortGroupedResources(
        groupResources(resources, groupBy, fullTimeEquivalentPeriodMultiplier),
        sortKey,
        sortDirection,
      ),
    [resources, groupBy, fullTimeEquivalentPeriodMultiplier, sortKey, sortDirection],
  );
  const totals = summarizeResources(resources);
  const totalFullTimeEquivalent = summarizeFullTimeEquivalent(
    resources,
    fullTimeEquivalentPeriodMultiplier,
  );
  const changeSort = (key: GroupSortKey) => {
    if (key === sortKey) setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

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
                <SortHeader
                  label={groupLabels[groupBy]}
                  column="label"
                  sortKey={sortKey}
                  direction={sortDirection}
                  align="left"
                  onSort={changeSort}
                />
                <SortHeader
                  label="Nombre de personnes"
                  column="people"
                  sortKey={sortKey}
                  direction={sortDirection}
                  onSort={changeSort}
                />
                <SortHeader
                  label="Nombre de jours"
                  column="assignedDays"
                  sortKey={sortKey}
                  direction={sortDirection}
                  onSort={changeSort}
                />
                <SortHeader
                  label="ETP"
                  column="fullTimeEquivalent"
                  sortKey={sortKey}
                  direction={sortDirection}
                  title={`Équivalent temps plein : base de ${number(internalReferenceDays)} jours pour les internes et ${number(externalReferenceDays)} jours pour les externes`}
                  onSort={changeSort}
                />
                <SortHeader
                  label="Coût total HT"
                  column="totalCost"
                  sortKey={sortKey}
                  direction={sortDirection}
                  onSort={changeSort}
                />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.label}>
                  <td className="text-left font-bold text-slate-800">{group.label}</td>
                  <td>{group.people}</td>
                  <td>{number(group.assignedDays)}</td>
                  <td>{number(group.fullTimeEquivalent)}</td>
                  <td>{currency(group.totalCost)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th className="text-left">Total</th>
                <th>{resources.length}</th>
                <th>{number(totals.assignedDays)}</th>
                <th>{number(totalFullTimeEquivalent)}</th>
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
