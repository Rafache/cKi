import { getBudgetYearStart, getConsolidatedSchedule, getQuarterKey } from './budget';
import { getFullTimeEquivalent } from './resources';
import type {
  ConsolidatedScheduleRow,
  DtddResource,
  GroupByKey,
  ResourceClassification,
} from '../types';

export interface MonthlyFullTimeEquivalentSegment {
  label: string;
  internal: number;
  external: number;
}

export interface MonthlyFullTimeEquivalentPoint {
  key: string;
  label: string;
  segments: MonthlyFullTimeEquivalentSegment[];
  totalInternal: number;
  totalExternal: number;
}

export interface MonthlyFullTimeEquivalentTrend {
  points: MonthlyFullTimeEquivalentPoint[];
  seriesLabels: string[];
}

interface ScheduleContribution {
  key: string;
  groupLabel: string;
  classification: ResourceClassification;
  fullTimeEquivalent: number;
}

const monthFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

function monthRange(startYear: number, startMonth: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const monthIndex = startYear * 12 + startMonth - 1 + index;
    return monthKey(Math.floor(monthIndex / 12), (monthIndex % 12) + 1);
  });
}

function rangeBetween(first: string, last: string): string[] {
  const [firstYear, firstMonth] = first.split('-').map(Number);
  const [lastYear, lastMonth] = last.split('-').map(Number);
  const count = (lastYear - firstYear) * 12 + lastMonth - firstMonth + 1;
  return monthRange(firstYear, firstMonth, count);
}

function getSelectedMonths(
  availableMonths: string[],
  budgetYear: number | null,
  quarter: string | null,
): string[] {
  if (quarter !== null) {
    const [year, quarterNumber] = quarter.split('-Q').map(Number);
    return monthRange(year, (quarterNumber - 1) * 3 + 1, 3);
  }
  if (budgetYear !== null) return monthRange(budgetYear, 7, 12);
  if (availableMonths.length === 0) return [];
  return rangeBetween(availableMonths[0], availableMonths.at(-1) ?? availableMonths[0]);
}

function getScheduleClassification(
  resource: DtddResource,
  row: ConsolidatedScheduleRow,
): ResourceClassification {
  if (row.period.type === 'Interne') return 'internal';
  if (row.period.type === 'Prestataire externe') return 'external';
  return resource.classification;
}

function getContributionGroupLabel(
  resource: DtddResource,
  row: ConsolidatedScheduleRow,
  groupBy: GroupByKey,
  classification: ResourceClassification,
): string {
  switch (groupBy) {
    case 'classification':
      return {
        internal: 'Interne',
        external: 'Prestataire externe',
        unknown: 'Non renseigné',
      }[classification];
    case 'state':
      return resource.state || 'Non renseigné';
    case 'team':
      return resource.team || 'Non renseignée';
    case 'skill':
      return row.period.skill || 'Non renseigné';
    case 'supplier':
      return row.period.supplier || 'Non renseigné';
    default:
      return classification === 'external' ? 'Externes' : 'Internes';
  }
}

function isRowSelected(
  row: ConsolidatedScheduleRow,
  budgetYear: number | null,
  quarter: string | null,
): boolean {
  if (quarter !== null) return getQuarterKey(row.year, row.month) === quarter;
  if (budgetYear !== null) return getBudgetYearStart(row.year, row.month) === budgetYear;
  return true;
}

export function buildMonthlyFullTimeEquivalentTrend(
  resources: DtddResource[],
  budgetYear: number | null,
  quarter: string | null,
  groupBy: GroupByKey,
): MonthlyFullTimeEquivalentTrend {
  const selectedRows = resources.flatMap((resource) =>
    getConsolidatedSchedule(resource)
      .filter((row) => isRowSelected(row, budgetYear, quarter))
      .map((row) => ({ resource, row })),
  );
  const availableMonths = [...new Set(selectedRows.map(({ row }) => row.key))].sort();
  const monthKeys = getSelectedMonths(availableMonths, budgetYear, quarter);
  const contributions: ScheduleContribution[] = selectedRows.map(({ resource, row }) => {
    const classification = getScheduleClassification(resource, row);
    return {
      key: row.key,
      groupLabel: getContributionGroupLabel(resource, row, groupBy, classification),
      classification,
      fullTimeEquivalent: getFullTimeEquivalent(row.item.assignedDays ?? 0, classification, 1 / 12),
    };
  });

  const totalsByGroup = new Map<string, number>();
  for (const contribution of contributions) {
    totalsByGroup.set(
      contribution.groupLabel,
      (totalsByGroup.get(contribution.groupLabel) ?? 0) + contribution.fullTimeEquivalent,
    );
  }
  const rankedLabels = [...totalsByGroup.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .map(([label]) => label);
  const seriesLabels = rankedLabels;

  const segmentsByMonth = new Map<string, Map<string, MonthlyFullTimeEquivalentSegment>>();
  for (const contribution of contributions) {
    const label = contribution.groupLabel;
    const monthSegments = segmentsByMonth.get(contribution.key) ?? new Map();
    const segment = monthSegments.get(label) ?? { label, internal: 0, external: 0 };
    if (contribution.classification === 'external') {
      segment.external += contribution.fullTimeEquivalent;
    } else {
      segment.internal += contribution.fullTimeEquivalent;
    }
    monthSegments.set(label, segment);
    segmentsByMonth.set(contribution.key, monthSegments);
  }

  const points = monthKeys.map((key) => {
    const monthSegments = segmentsByMonth.get(key) ?? new Map();
    const segments = seriesLabels.map(
      (label) => monthSegments.get(label) ?? { label, internal: 0, external: 0 },
    );
    return {
      key,
      label: formatMonth(key),
      segments,
      totalInternal: segments.reduce((total, segment) => total + segment.internal, 0),
      totalExternal: segments.reduce((total, segment) => total + segment.external, 0),
    };
  });

  return { points, seriesLabels };
}
