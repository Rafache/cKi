import type {
  BudgetYearSummary,
  ConsolidatedScheduleRow,
  DtddResource,
  ResourcePeriod,
} from '../types';

export const BUDGET_YEAR_START_MONTH = 7;
export const MIN_BUDGET_YEAR = 2024;

function periodTimestamp(period: ResourcePeriod): number {
  const parsed = Date.parse(period.start ?? '');
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

export function getBudgetYearStart(year: number, month: number): number {
  return month >= BUDGET_YEAR_START_MONTH ? year : year - 1;
}

export function formatBudgetYear(startYear: number): string {
  return `${startYear}–${startYear + 1}`;
}

export function getConsolidatedSchedule(resource: DtddResource): ConsolidatedScheduleRow[] {
  const rowsByMonth = new Map<string, ConsolidatedScheduleRow>();
  const orderedPeriods = [...resource.periods].sort(
    (a, b) => periodTimestamp(a) - periodTimestamp(b),
  );
  for (const period of orderedPeriods) {
    for (const item of period.schedule) {
      if (item.year === null || item.month === null) continue;
      const key = `${item.year}-${String(item.month).padStart(2, '0')}`;
      rowsByMonth.set(key, { key, year: item.year, month: item.month, item, period });
    }
  }
  return [...rowsByMonth.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function getBudgetYears(resource: DtddResource): number[] {
  return [
    ...new Set(
      getConsolidatedSchedule(resource)
        .map((row) => getBudgetYearStart(row.year, row.month))
        .filter((year) => year >= MIN_BUDGET_YEAR),
    ),
  ].sort((a, b) => a - b);
}

export function getBudgetRows(
  resource: DtddResource,
  startYear: number,
): ConsolidatedScheduleRow[] {
  return getConsolidatedSchedule(resource).filter(
    (row) => getBudgetYearStart(row.year, row.month) === startYear,
  );
}

export function getQuarterKey(year: number, month: number): string {
  return `${year}-Q${Math.ceil(month / 3)}`;
}

export function formatQuarter(quarter: string): string {
  const [year, value] = quarter.split('-Q');
  return `T${value} ${year}`;
}

export function getQuarterRows(resource: DtddResource, quarter: string): ConsolidatedScheduleRow[] {
  return getConsolidatedSchedule(resource).filter(
    (row) => getQuarterKey(row.year, row.month) === quarter,
  );
}

export function summarizeRows(
  rows: ConsolidatedScheduleRow[],
  startYear: number,
): BudgetYearSummary {
  const totals = rows.reduce(
    (sum, row) => {
      const assigned = row.item.assignedDays ?? 0;
      const rate = row.item.priceNet;
      return {
        assignedDays: sum.assignedDays + assigned,
        workedDays: sum.workedDays + (row.item.days ?? 0),
        pricedAssignedDays: sum.pricedAssignedDays + (rate === null ? 0 : assigned),
        totalCost: sum.totalCost + (rate === null ? 0 : assigned * rate),
      };
    },
    { assignedDays: 0, workedDays: 0, pricedAssignedDays: 0, totalCost: 0 },
  );
  return {
    startYear,
    assignedDays: totals.assignedDays,
    pricedAssignedDays: totals.pricedAssignedDays,
    workedDays: totals.workedDays,
    averageDailyRate:
      totals.pricedAssignedDays > 0 ? totals.totalCost / totals.pricedAssignedDays : null,
    totalCost: totals.totalCost,
  };
}

export function getBudgetSummaries(resource: DtddResource): BudgetYearSummary[] {
  return getBudgetYears(resource).map((year) => summarizeRows(getBudgetRows(resource, year), year));
}

export function getResourcesBudgetSummaries(resources: DtddResource[]): BudgetYearSummary[] {
  const years = [...new Set(resources.flatMap(getBudgetYears))].sort((a, b) => a - b);
  return years.map((year) =>
    summarizeRows(
      resources.flatMap((resource) => getBudgetRows(resource, year)),
      year,
    ),
  );
}

export function getResourcesBudgetYears(resources: DtddResource[]): number[] {
  return [...new Set(resources.flatMap(getBudgetYears))].sort((a, b) => a - b);
}

export function getResourcesQuarters(resources: DtddResource[]): string[] {
  return [
    ...new Set(
      resources
        .flatMap(getConsolidatedSchedule)
        .filter((row) => row.year >= 2025)
        .map((row) => getQuarterKey(row.year, row.month)),
    ),
  ].sort();
}

export function scopeResourcesToBudgetYear(
  resources: DtddResource[],
  startYear: number | null,
): DtddResource[] {
  if (startYear === null) return resources;
  return resources.map((resource) => {
    const summary = summarizeRows(getBudgetRows(resource, startYear), startYear);
    return {
      ...resource,
      assignedDays: summary.assignedDays,
      dailyRate: summary.averageDailyRate,
      totalCost: summary.totalCost,
    };
  });
}

export function scopeResourcesToQuarter(
  resources: DtddResource[],
  quarter: string | null,
): DtddResource[] {
  if (quarter === null) return resources;
  return resources.map((resource) => {
    const rows = getQuarterRows(resource, quarter);
    const summary = summarizeRows(rows, Number(quarter.slice(0, 4)));
    return {
      ...resource,
      assignedDays: summary.assignedDays,
      dailyRate: summary.averageDailyRate,
      totalCost: summary.totalCost,
    };
  });
}

export function getTotalBudgetSummary(summaries: BudgetYearSummary[]): BudgetYearSummary {
  const total = summaries.reduce(
    (sum, item) => ({
      assignedDays: sum.assignedDays + item.assignedDays,
      pricedAssignedDays: sum.pricedAssignedDays + item.pricedAssignedDays,
      workedDays: sum.workedDays + item.workedDays,
      totalCost: sum.totalCost + item.totalCost,
    }),
    { assignedDays: 0, pricedAssignedDays: 0, workedDays: 0, totalCost: 0 },
  );
  return {
    startYear: MIN_BUDGET_YEAR,
    ...total,
    averageDailyRate:
      total.pricedAssignedDays > 0 ? total.totalCost / total.pricedAssignedDays : null,
  };
}
