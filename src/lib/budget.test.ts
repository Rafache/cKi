import { describe, expect, it } from 'vitest';
import { mapMember } from '../api/mapper';
import { member } from '../test/fixtures';
import {
  formatBudgetYear,
  formatQuarter,
  getBudgetSummaries,
  getBudgetYearStart,
  getConsolidatedSchedule,
  getResourcesBudgetSummaries,
  scopeResourcesToBudgetYear,
  scopeResourcesToQuarter,
} from './budget';

describe('années budgétaires', () => {
  it('affecte juillet à juin à la même année budgétaire', () => {
    expect(getBudgetYearStart(2025, 7)).toBe(2025);
    expect(getBudgetYearStart(2026, 6)).toBe(2025);
    expect(formatBudgetYear(2025)).toBe('2025–2026');
  });

  it('formate et recalcule un trimestre civil', () => {
    expect(formatQuarter('2025-Q3')).toBe('T3 2025');
    const resource = mapMember(
      member({
        periods: [
          {
            start: '2025-01-01',
            capacity: {
              schedule: {
                items: [
                  { year: 2025, month: 7, assigned: { days: 10 }, price: { net: 800 } },
                  { year: 2025, month: 10, assigned: { days: 20 }, price: { net: 900 } },
                ],
              },
            },
          },
        ],
      }),
    );
    const [scoped] = scopeResourcesToQuarter([resource], '2025-Q3');
    expect(scoped.assignedDays).toBe(10);
    expect(scoped.totalCost).toBe(8000);
  });

  it('déduplique les mois et calcule les coûts sur les jours affectés', () => {
    const resource = mapMember(
      member({
        periods: [
          {
            start: '2024-07-01',
            capacity: {
              schedule: {
                items: [
                  { year: 2024, month: 7, days: 20, assigned: { days: 10 }, price: { net: 800 } },
                  { year: 2025, month: 6, days: 18, assigned: { days: 12 }, price: null },
                ],
              },
            },
          },
        ],
      }),
    );
    expect(getConsolidatedSchedule(resource)).toHaveLength(2);
    expect(getBudgetSummaries(resource)).toEqual([
      {
        startYear: 2024,
        assignedDays: 22,
        pricedAssignedDays: 22,
        workedDays: 38,
        averageDailyRate: 800,
        totalCost: 17600,
      },
    ]);
  });

  it('agrège les coûts de toutes les ressources filtrées par année budgétaire', () => {
    const makeResource = (id: number, assignedDays: number, rate: number) =>
      mapMember(
        member({
          id,
          periods: [
            {
              start: '2024-07-01',
              capacity: {
                schedule: {
                  items: [
                    {
                      year: 2024,
                      month: 9,
                      days: 20,
                      assigned: { days: assignedDays },
                      price: { net: rate },
                    },
                  ],
                },
              },
            },
          ],
        }),
      );

    expect(
      getResourcesBudgetSummaries([makeResource(1, 10, 800), makeResource(2, 5, 1000)]),
    ).toEqual([
      {
        startYear: 2024,
        assignedDays: 15,
        pricedAssignedDays: 15,
        workedDays: 40,
        averageDailyRate: 866.6666666666666,
        totalCost: 13000,
      },
    ]);
  });

  it('recalcule le TJM et le coût de chaque ressource sur un exercice sélectionné', () => {
    const resource = mapMember(
      member({
        periods: [
          {
            start: '2024-07-01',
            capacity: {
              schedule: {
                items: [
                  { year: 2024, month: 9, assigned: { days: 10 }, price: { net: 800 } },
                  { year: 2025, month: 9, assigned: { days: 5 }, price: { net: 1000 } },
                ],
              },
            },
          },
        ],
      }),
    );

    const [scoped] = scopeResourcesToBudgetYear([resource], 2024);
    expect(scoped.assignedDays).toBe(10);
    expect(scoped.dailyRate).toBe(800);
    expect(scoped.totalCost).toBe(8000);
    expect(resource.totalCost).toBe(13000);
  });
});
