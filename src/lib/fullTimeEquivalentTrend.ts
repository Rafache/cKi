import {
  formatBudgetYear,
  formatQuarter,
  getBudgetYearStart,
  getConsolidatedSchedule,
  getQuarterKey,
} from './budget';
import { getFullTimeEquivalent } from './resources';
import type {
  ConsolidatedScheduleRow,
  DtddResource,
  GroupByKey,
  ResourceClassification,
  TrendGranularity,
  TrendMetric,
} from '../types';

export type { TrendGranularity, TrendMetric };

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
  value: number;
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

function getTrendPeriods(
  monthKeys: string[],
  granularity: TrendGranularity,
): { key: string; label: string }[] {
  if (granularity === 'quarter') {
    const uniqueKeys = [
      ...new Set(
        monthKeys.map((key) => {
          const [year, month] = key.split('-').map(Number);
          return getQuarterKey(year, month);
        }),
      ),
    ];
    return uniqueKeys.map((key) => ({ key, label: formatQuarter(key) }));
  }

  if (granularity === 'year') {
    const uniqueKeys = [
      ...new Set(
        monthKeys.map((key) => {
          const [year, month] = key.split('-').map(Number);
          return String(getBudgetYearStart(year, month));
        }),
      ),
    ];
    return uniqueKeys.map((key) => ({ key, label: formatBudgetYear(Number(key)) }));
  }

  return monthKeys.map((key) => ({ key, label: formatMonth(key) }));
}

function getRowPeriodKey(year: number, month: number, granularity: TrendGranularity): string {
  if (granularity === 'quarter') return getQuarterKey(year, month);
  if (granularity === 'year') return String(getBudgetYearStart(year, month));
  return monthKey(year, month);
}

export function buildMonthlyFullTimeEquivalentTrend(
  resources: DtddResource[],
  budgetYear: number | null,
  quarter: string | null,
  groupBy: GroupByKey,
  metric: TrendMetric = 'fte',
  granularity: TrendGranularity = 'month',
): MonthlyFullTimeEquivalentTrend {
  const selectedRows = resources.flatMap((resource) =>
    getConsolidatedSchedule(resource)
      .filter((row) => isRowSelected(row, budgetYear, quarter))
      .map((row) => ({ resource, row })),
  );
  const availableMonths = [...new Set(selectedRows.map(({ row }) => row.key))].sort();
  const monthKeys = getSelectedMonths(availableMonths, budgetYear, quarter);
  const periods = getTrendPeriods(monthKeys, granularity);

  const periodMultiplier = granularity === 'quarter' ? 1 / 4 : granularity === 'year' ? 1 : 1 / 12;

  interface AggregatedEntry {
    periodKey: string;
    groupLabel: string;
    classification: ResourceClassification;
    assignedDays: number;
  }

  const aggregated = new Map<string, AggregatedEntry>();
  for (const { resource, row } of selectedRows) {
    const classification = getScheduleClassification(resource, row);
    const groupLabel = getContributionGroupLabel(resource, row, groupBy, classification);
    const periodKey = getRowPeriodKey(row.year, row.month, granularity);
    const aggKey = `${periodKey}__${resource.id}__${groupLabel}__${classification}`;
    const entry = aggregated.get(aggKey) ?? {
      periodKey,
      groupLabel,
      classification,
      assignedDays: 0,
    };
    entry.assignedDays += row.item.assignedDays ?? 0;
    aggregated.set(aggKey, entry);
  }

  const contributions: ScheduleContribution[] = [...aggregated.values()].map((entry) => {
    const value =
      metric === 'headcount'
        ? entry.assignedDays > 0
          ? 1
          : 0
        : getFullTimeEquivalent(entry.assignedDays, entry.classification, periodMultiplier);
    return {
      key: entry.periodKey,
      groupLabel: entry.groupLabel,
      classification: entry.classification,
      value,
    };
  });

  const totalsByGroup = new Map<string, number>();
  for (const contribution of contributions) {
    totalsByGroup.set(
      contribution.groupLabel,
      (totalsByGroup.get(contribution.groupLabel) ?? 0) + contribution.value,
    );
  }
  const rankedLabels = [...totalsByGroup.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
    .map(([label]) => label);
  const seriesLabels = rankedLabels;

  const segmentsByPeriod = new Map<string, Map<string, MonthlyFullTimeEquivalentSegment>>();
  for (const contribution of contributions) {
    const label = contribution.groupLabel;
    const periodSegments = segmentsByPeriod.get(contribution.key) ?? new Map();
    const segment = periodSegments.get(label) ?? { label, internal: 0, external: 0 };
    if (contribution.classification === 'external') {
      segment.external += contribution.value;
    } else {
      segment.internal += contribution.value;
    }
    periodSegments.set(label, segment);
    segmentsByPeriod.set(contribution.key, periodSegments);
  }

  const points = periods.map(({ key, label }) => {
    const periodSegments = segmentsByPeriod.get(key) ?? new Map();
    const segments = seriesLabels.map(
      (sLabel) => periodSegments.get(sLabel) ?? { label: sLabel, internal: 0, external: 0 },
    );
    return {
      key,
      label,
      segments,
      totalInternal: segments.reduce((total, segment) => total + segment.internal, 0),
      totalExternal: segments.reduce((total, segment) => total + segment.external, 0),
    };
  });

  return { points, seriesLabels };
}
