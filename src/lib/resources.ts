import { getBudgetRows, getQuarterRows } from './budget';
import type { DtddResource, GroupByKey, ResourceFilters, SortDirection, SortKey } from '../types';

export const EMPTY_FILTERS: ResourceFilters = {
  search: '',
  classifications: [],
  states: [],
  teams: [],
  skills: [],
  suppliers: [],
  budgetYear: null,
  quarter: null,
  groupBy: '',
};

const normalized = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

export function filterResources(
  resources: DtddResource[],
  filters: ResourceFilters,
): DtddResource[] {
  const query = normalized(filters.search.trim());
  return resources.filter((resource) => {
    const searchable = [
      resource.name,
      resource.email,
      resource.jobTitle,
      resource.team,
      ...resource.periods.flatMap((period) => [period.skill, period.supplier]),
    ];
    if (query && !searchable.some((value) => normalized(value).includes(query))) return false;
    if (
      filters.classifications.length &&
      !filters.classifications.includes(resource.classification)
    )
      return false;
    if (filters.states.length && !filters.states.includes(resource.state)) return false;
    if (filters.teams.length && !filters.teams.includes(resource.team)) return false;
    if (filters.skills.length && !filters.skills.includes(resource.primaryPeriod?.skill ?? ''))
      return false;
    if (
      filters.suppliers.length &&
      !filters.suppliers.includes(resource.primaryPeriod?.supplier ?? '')
    )
      return false;
    if (filters.budgetYear !== null && getBudgetRows(resource, filters.budgetYear).length === 0)
      return false;
    if (filters.quarter !== null && getQuarterRows(resource, filters.quarter).length === 0)
      return false;
    return true;
  });
}

function sortValue(resource: DtddResource, key: SortKey): string | number {
  switch (key) {
    case 'classification':
      return resource.classification;
    case 'skill':
      return resource.primaryPeriod?.skill ?? '';
    case 'supplier':
      return resource.primaryPeriod?.supplier ?? '';
    case 'periodStart':
      return resource.primaryPeriod?.start ?? '';
    case 'periodEnd':
      return resource.primaryPeriod?.end ?? '9999-12-31';
    case 'assignedDays':
      return resource.assignedDays ?? -1;
    case 'dailyRate':
      return resource.dailyRate ?? -1;
    case 'totalCost':
      return resource.totalCost ?? -1;
    default:
      return resource[key];
  }
}

export function sortResources(
  resources: DtddResource[],
  key: SortKey,
  direction: SortDirection,
): DtddResource[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...resources].sort((a, b) => {
    const left = sortValue(a, key);
    const right = sortValue(b, key);
    if (typeof left === 'number' && typeof right === 'number') return (left - right) * multiplier;
    return (
      String(left).localeCompare(String(right), 'fr', { numeric: true, sensitivity: 'base' }) *
      multiplier
    );
  });
}

export function uniqueOptions(
  resources: DtddResource[],
  selector: (resource: DtddResource) => string,
): string[] {
  return [...new Set(resources.map(selector).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
}

export function summarizeResources(resources: DtddResource[]) {
  const dailyRates = resources
    .map((resource) => resource.dailyRate)
    .filter((dailyRate): dailyRate is number => dailyRate !== null);

  return {
    assignedDays: resources.reduce((total, resource) => total + (resource.assignedDays ?? 0), 0),
    averageDailyRate:
      dailyRates.length > 0
        ? dailyRates.reduce((total, dailyRate) => total + dailyRate, 0) / dailyRates.length
        : null,
    totalCost: resources.reduce((total, resource) => total + (resource.totalCost ?? 0), 0),
  };
}

const classificationLabels = {
  internal: 'Interne',
  external: 'Prestataire externe',
  unknown: 'Non renseigné',
} as const;

export function getGroupLabel(resource: DtddResource, groupBy: Exclude<GroupByKey, ''>): string {
  switch (groupBy) {
    case 'classification':
      return classificationLabels[resource.classification];
    case 'skill':
      return resource.primaryPeriod?.skill || 'Non renseigné';
    case 'supplier':
      return resource.primaryPeriod?.supplier || 'Non renseigné';
    default:
      return resource[groupBy] || 'Non renseigné';
  }
}

export function groupResources(resources: DtddResource[], groupBy: Exclude<GroupByKey, ''>) {
  const groups = new Map<string, DtddResource[]>();
  for (const resource of resources) {
    const label = getGroupLabel(resource, groupBy);
    groups.set(label, [...(groups.get(label) ?? []), resource]);
  }
  return [...groups.entries()]
    .map(([label, items]) => ({
      label,
      people: items.length,
      totalCost: summarizeResources(items).totalCost,
    }))
    .sort((a, b) => b.totalCost - a.totalCost || a.label.localeCompare(b.label, 'fr'));
}
