import { ChevronDown, RotateCcw, Search } from 'lucide-react';
import {
  formatBudgetYear,
  formatQuarter,
  getResourcesBudgetYears,
  getResourcesQuarters,
} from '../lib/budget';
import { EMPTY_FILTERS, uniqueOptions } from '../lib/resources';
import type { DtddResource, GroupByKey, ResourceClassification, ResourceFilters } from '../types';

interface FiltersBarProps {
  resources: DtddResource[];
  filters: ResourceFilters;
  onChange: (filters: ResourceFilters) => void;
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  formatOption = (option) => option,
  emptyLabel = 'Tous',
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatOption?: (option: string) => string;
  emptyLabel?: string;
}) {
  return (
    <label className="filter-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function MultiSelectFilter({
  label,
  values,
  options,
  onChange,
  formatOption = (option) => option,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  formatOption?: (option: string) => string;
}) {
  const summary =
    values.length === 0
      ? 'Tous'
      : values.length === 1
        ? formatOption(values[0])
        : `${values.length} sélectionnés`;

  return (
    <div className="filter-field relative min-w-0">
      <span>{label}</span>
      <details className="group">
        <summary className="flex h-10 list-none items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/15">
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
        </summary>
        <div className="absolute left-0 top-full z-40 mt-1 max-h-64 min-w-full overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
          {options.map((option) => {
            const checked = values.includes(option);
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold whitespace-nowrap text-slate-600 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked ? values.filter((value) => value !== option) : [...values, option],
                    )
                  }
                  className="h-4 w-4 accent-brand"
                />
                {formatOption(option)}
              </label>
            );
          })}
        </div>
      </details>
    </div>
  );
}

export function FiltersBar({ resources, filters, onChange }: FiltersBarProps) {
  const budgetYears = getResourcesBudgetYears(resources);
  const quarters = getResourcesQuarters(resources);
  const hasFilters =
    filters.search ||
    filters.classifications.length ||
    filters.states.length ||
    filters.teams.length ||
    filters.skills.length ||
    filters.suppliers.length ||
    filters.budgetYear !== null ||
    filters.quarter !== null ||
    filters.groupBy;

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <label className="filter-field xl:col-span-2">
          <span>Recherche</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => onChange({ ...filters, search: event.target.value })}
              placeholder="Nom, e-mail, poste…"
              className="pl-9!"
            />
          </div>
        </label>
        <MultiSelectFilter
          label="Type"
          values={filters.classifications}
          options={['internal', 'external', 'unknown']}
          formatOption={(option) =>
            ({ internal: 'Internes', external: 'Prestataires externes', unknown: 'Non classés' })[
              option
            ] ?? option
          }
          onChange={(values) =>
            onChange({ ...filters, classifications: values as ResourceClassification[] })
          }
        />
        <MultiSelectFilter
          label="État"
          values={filters.states}
          options={uniqueOptions(resources, (resource) => resource.state)}
          onChange={(states) => onChange({ ...filters, states })}
        />
        <MultiSelectFilter
          label="Équipe"
          values={filters.teams}
          options={uniqueOptions(resources, (resource) => resource.team)}
          onChange={(teams) => onChange({ ...filters, teams })}
        />
        <MultiSelectFilter
          label="Compétence"
          values={filters.skills}
          options={uniqueOptions(resources, (resource) => resource.primaryPeriod?.skill ?? '')}
          onChange={(skills) => onChange({ ...filters, skills })}
        />
        <MultiSelectFilter
          label="Fournisseur"
          values={filters.suppliers}
          options={uniqueOptions(resources, (resource) => resource.primaryPeriod?.supplier ?? '')}
          onChange={(suppliers) => onChange({ ...filters, suppliers })}
        />
        <SelectFilter
          label="Année budgétaire"
          emptyLabel="Toutes les années"
          value={filters.budgetYear === null ? '' : String(filters.budgetYear)}
          options={budgetYears.map(String)}
          formatOption={(option) => formatBudgetYear(Number(option))}
          onChange={(value) =>
            onChange({ ...filters, budgetYear: value ? Number(value) : null, quarter: null })
          }
        />
        <SelectFilter
          label="Trimestre"
          emptyLabel="Tous les trimestres"
          value={filters.quarter ?? ''}
          options={quarters}
          formatOption={formatQuarter}
          onChange={(value) => onChange({ ...filters, quarter: value || null, budgetYear: null })}
        />
        <SelectFilter
          label="Grouper par"
          emptyLabel="Aucun regroupement"
          value={filters.groupBy}
          options={['classification', 'state', 'team', 'skill', 'supplier']}
          formatOption={(option) =>
            ({
              classification: 'Type',
              state: 'État',
              team: 'Équipe',
              skill: 'Compétence',
              supplier: 'Fournisseur',
            })[option] ?? option
          }
          onChange={(value) => onChange({ ...filters, groupBy: value as GroupByKey })}
        />
        <button
          type="button"
          disabled={!hasFilters}
          onClick={() => onChange({ ...EMPTY_FILTERS })}
          className="self-end justify-self-start rounded-lg border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
          title="Réinitialiser les filtres"
          aria-label="Réinitialiser les filtres"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
