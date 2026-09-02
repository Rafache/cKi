import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { summarizeResources } from '../lib/resources';
import type { DtddResource, SortDirection, SortKey } from '../types';
import { ClassificationBadge } from './ClassificationBadge';

const formatDate = (value: string | null | undefined) =>
  value ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${value.slice(0, 10)}T00:00:00`)) : '—';
const display = (value: string | null | undefined) => value || '—';
const currency = (value: number | null) =>
  value === null
    ? '—'
    : new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(value);

interface TableProps {
  resources: DtddResource[];
  filteredResources: DtddResource[];
  total: number;
  page: number;
  pageSize: number;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (key: SortKey) => void;
  onSelect: (resource: DtddResource) => void;
}

function SortHeader({
  label,
  column,
  sortKey,
  direction,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = column === sortKey;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th scope="col">
      <button onClick={() => onSort(column)} className="table-sort">
        {label}
        <Icon className={`h-3.5 w-3.5 ${active ? 'text-accent' : 'text-slate-500'}`} />
      </button>
    </th>
  );
}

export function ResourcesTable(props: TableProps) {
  const {
    resources,
    filteredResources,
    total,
    page,
    pageSize,
    sortKey,
    sortDirection,
    onPageChange,
    onPageSizeChange,
    onSort,
    onSelect,
  } = props;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const totals = summarizeResources(filteredResources);
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="font-black text-slate-900">Ressources DTDD</h2>
          <p className="text-xs text-slate-400">
            {total} résultat{total > 1 ? 's' : ''}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
          Lignes
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-md border border-slate-200 px-2 py-1.5"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </div>
      <div className="max-h-[62vh] overflow-auto">
        <table className="resource-table">
          <thead>
            <tr>
              <SortHeader
                label="Nom"
                column="name"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="E-mail"
                column="email"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Poste"
                column="jobTitle"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Équipe"
                column="team"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="État"
                column="state"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Type"
                column="classification"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Compétence"
                column="skill"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Fournisseur"
                column="supplier"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Début"
                column="periodStart"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Fin"
                column="periodEnd"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Jours"
                column="assignedDays"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="TJM"
                column="dailyRate"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <SortHeader
                label="Coût total"
                column="totalCost"
                sortKey={sortKey}
                direction={sortDirection}
                onSort={onSort}
              />
              <th scope="col">
                <span className="sr-only">Détail</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => (
              <tr
                key={resource.uid || resource.id || resource.email}
                onClick={() => onSelect(resource)}
                className="group cursor-pointer"
              >
                <td className="sticky left-0 z-10 bg-white font-bold text-slate-900 group-hover:bg-slate-50">
                  <span className="block max-w-52 truncate">{resource.name}</span>
                </td>
                <td>
                  <a
                    href={`mailto:${resource.email}`}
                    onClick={(event) => event.stopPropagation()}
                    className="text-brand hover:underline"
                  >
                    {display(resource.email)}
                  </a>
                </td>
                <td>
                  <span className="block max-w-56 truncate" title={resource.jobTitle}>
                    {display(resource.jobTitle)}
                  </span>
                </td>
                <td>
                  <span className="block max-w-52 truncate" title={resource.team}>
                    {resource.team}
                  </span>
                </td>
                <td>
                  <span className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                    {resource.state}
                  </span>
                </td>
                <td>
                  <ClassificationBadge value={resource.classification} />
                </td>
                <td>{display(resource.primaryPeriod?.skill)}</td>
                <td>{display(resource.primaryPeriod?.supplier)}</td>
                <td className="whitespace-nowrap">{formatDate(resource.primaryPeriod?.start)}</td>
                <td className="whitespace-nowrap">{formatDate(resource.primaryPeriod?.end)}</td>
                <td
                  className="text-right font-semibold"
                  title="Total des jours affectés et facturés"
                >
                  {resource.assignedDays === null
                    ? '—'
                    : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(
                        resource.assignedDays,
                      )}
                </td>
                <td className="whitespace-nowrap text-right font-semibold" title="TJM hors taxes">
                  {currency(resource.dailyRate)}
                </td>
                <td
                  className="whitespace-nowrap text-right font-bold text-slate-800"
                  title="Coût HT des jours affectés"
                >
                  {currency(resource.totalCost)}
                </td>
                <td>
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(resource);
                    }}
                    className="rounded-md p-2 text-slate-400 hover:bg-brand/5 hover:text-brand"
                    aria-label={`Voir le détail de ${resource.name}`}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {filteredResources.length > 0 && (
            <tfoot>
              <tr>
                <th className="sticky left-0 z-10" scope="row">
                  Total ({filteredResources.length})
                </th>
                <td colSpan={9} />
                <td className="text-right">
                  {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(
                    totals.assignedDays,
                  )}
                </td>
                <td className="whitespace-nowrap text-right">
                  {currency(totals.averageDailyRate)}
                </td>
                <td className="whitespace-nowrap text-right">{currency(totals.totalCost)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
        {!resources.length && (
          <div className="p-14 text-center">
            <p className="font-bold text-slate-600">Aucune ressource ne correspond aux filtres.</p>
            <p className="mt-1 text-sm text-slate-400">Modifiez ou réinitialisez vos critères.</p>
          </div>
        )}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
        <span className="text-slate-500">
          Page <strong>{Math.min(page, pageCount)}</strong> sur <strong>{pageCount}</strong>
        </span>
        <div className="flex gap-1">
          <button
            className="pagination-button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Page précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            className="pagination-button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            aria-label="Page suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </section>
  );
}
