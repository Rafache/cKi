import { describe, expect, it } from 'vitest';
import { mapMember } from '../api/mapper';
import { member } from '../test/fixtures';
import { summarizeRows, getConsolidatedSchedule } from './budget';
import { buildMonthlyFullTimeEquivalentTrend } from './fullTimeEquivalentTrend';

const internal = mapMember(
  member({
    id: 1,
    team: { name: 'DATA', parent: { name: 'DTDD' } },
    periods: [
      {
        start: '2026-01-01',
        type: { label: 'Interne' },
        capacity: {
          schedule: {
            items: [
              { year: 2026, month: 4, assigned: { days: 194 / 12 } },
              { year: 2026, month: 5, assigned: { days: 194 / 24 } },
            ],
          },
        },
      },
    ],
  }),
);

const external = mapMember(
  member({
    id: 2,
    team: { name: 'CLOUD', parent: { name: 'DTDD' } },
    periods: [
      {
        start: '2026-01-01',
        type: { label: 'Prestataire externe' },
        capacity: {
          schedule: {
            items: [{ year: 2026, month: 4, assigned: { days: 218 / 12 } }],
          },
        },
      },
    ],
  }),
);

describe('buildMonthlyFullTimeEquivalentTrend', () => {
  const pricedResources = [
    mapMember(
      member({
        id: 10,
        jobTitle: 'Engineer',
        periods: [
          {
            start: '2025-01-01',
            type: { label: 'Interne' },
            capacity: {
              schedule: {
                items: [{ year: 2026, month: 4, assigned: { days: 99 }, price: { net: 900 } }],
              },
            },
          },
          {
            start: '2026-01-01',
            type: { label: 'Interne' },
            capacity: {
              schedule: {
                items: [
                  { year: 2026, month: 4, assigned: { days: 2.5 }, price: { net: 100 } },
                  { year: 2026, month: 5, assigned: { days: 3 }, price: { net: 200 } },
                  { year: 2026, month: 6, assigned: { days: 1 } },
                  { year: 2026, month: 7, assigned: { days: 8 }, price: { net: 300 } },
                ],
              },
            },
          },
        ],
      }),
    ),
    mapMember(
      member({
        id: 11,
        jobTitle: 'Engineer',
        periods: [
          {
            start: '2026-01-01',
            type: { label: 'Prestataire externe' },
            capacity: {
              schedule: {
                items: [
                  { year: 2026, month: 4, assigned: { days: 4 }, price: { net: 50 } },
                  { year: 2026, month: 5, assigned: { days: 2 } },
                ],
              },
            },
          },
        ],
      }),
    ),
  ];

  it.each(['month', 'quarter', 'year'] as const)(
    'sums days and costs per %s without averaging or counting overlapping schedules twice',
    (granularity) => {
      for (const metric of ['days', 'cost'] as const) {
        const trend = buildMonthlyFullTimeEquivalentTrend(
          pricedResources,
          null,
          '2026-Q2',
          'jobTitle',
          metric,
          granularity,
        );

        expect(trend.seriesLabels).toEqual(['Engineer']);
        expect(trend.points.reduce((sum, point) => sum + point.totalInternal, 0)).toBe(
          metric === 'days' ? 6.5 : 1050,
        );
        expect(trend.points.reduce((sum, point) => sum + point.totalExternal, 0)).toBe(
          metric === 'days' ? 6 : 300,
        );
        if (granularity === 'month') {
          expect(trend.points[0].segments).toEqual([
            {
              label: 'Engineer',
              internal: metric === 'days' ? 2.5 : 250,
              external: metric === 'days' ? 4 : 200,
            },
          ]);
        }
      }
    },
  );

  it('matches budget totals and applies the July boundary for days and costs', () => {
    const summary = summarizeRows(pricedResources.flatMap(getConsolidatedSchedule), 2026);
    for (const metric of ['days', 'cost'] as const) {
      const fullTrend = buildMonthlyFullTimeEquivalentTrend(
        pricedResources,
        null,
        null,
        '',
        metric,
      );
      expect(
        fullTrend.points.reduce((sum, point) => sum + point.totalInternal + point.totalExternal, 0),
      ).toBe(metric === 'days' ? summary.assignedDays : summary.totalCost);
      const budgetTrend = buildMonthlyFullTimeEquivalentTrend(
        pricedResources,
        2026,
        null,
        '',
        metric,
        'year',
      );
      expect(budgetTrend.points).toHaveLength(1);
      expect(budgetTrend.points[0].key).toBe('2026');
      expect(budgetTrend.points[0].totalInternal).toBe(metric === 'days' ? 8 : 2400);
      expect(budgetTrend.points[0].totalExternal).toBe(0);
    }
  });

  it('keeps unpriced days visible and treats missing days or prices as zero cost', () => {
    const resource = mapMember(
      member({
        periods: [
          {
            type: { label: 'Interne' },
            capacity: {
              schedule: {
                items: [
                  { year: 2026, month: 4, assigned: { days: 3 } },
                  { year: 2026, month: 5, price: { net: 100 } },
                ],
              },
            },
          },
        ],
      }),
    );
    const days = buildMonthlyFullTimeEquivalentTrend([resource], null, '2026-Q2', '', 'days');
    const cost = buildMonthlyFullTimeEquivalentTrend([resource], null, '2026-Q2', '', 'cost');
    expect(days.points.map((point) => point.totalInternal)).toEqual([3, 0, 0]);
    expect(cost.points.map((point) => point.totalInternal)).toEqual([0, 0, 0]);
  });

  it.each(['fte', 'headcount'] as const)(
    'groups %s by job title across classifications and includes missing titles',
    (metric) => {
      const resources = [
        { ...internal, jobTitle: 'Data engineer' },
        { ...external, jobTitle: 'Data engineer' },
        { ...internal, id: '3', jobTitle: '' },
      ];
      const trend = buildMonthlyFullTimeEquivalentTrend(
        resources,
        null,
        '2026-Q2',
        'jobTitle',
        metric,
      );
      const april = trend.points[0];

      expect(trend.seriesLabels).toEqual(['Data engineer', 'Non renseigné']);
      expect(april.segments[0].internal).toBeCloseTo(1);
      expect(april.segments[0].external).toBeCloseTo(1);
      expect(april.segments[1].internal).toBeCloseTo(1);
      expect(april.segments[1].external).toBe(0);
      expect(april.totalInternal).toBeCloseTo(2);
      expect(april.totalExternal).toBeCloseTo(1);
    },
  );

  it('place les ETP internes et externes dans leurs séries mensuelles', () => {
    const trend = buildMonthlyFullTimeEquivalentTrend([internal, external], null, '2026-Q2', '');

    expect(trend.points.map((point) => point.key)).toEqual(['2026-04', '2026-05', '2026-06']);
    expect(trend.seriesLabels).toEqual(['Internes', 'Externes']);
    expect(trend.points[0].totalInternal).toBeCloseTo(1);
    expect(trend.points[0].totalExternal).toBeCloseTo(1);
    expect(trend.points[1].totalInternal).toBeCloseTo(0.5);
    expect(trend.points[2].totalInternal).toBe(0);
  });

  it('empile les séries selon le regroupement actif', () => {
    const trend = buildMonthlyFullTimeEquivalentTrend(
      [internal, external],
      null,
      '2026-Q2',
      'team',
    );
    const april = trend.points[0];

    expect(trend.seriesLabels).toEqual(['DATA', 'CLOUD']);
    expect(april.segments.map((segment) => segment.label)).toEqual(['DATA', 'CLOUD']);
    expect(april.segments[0].internal).toBeCloseTo(1);
    expect(april.segments[0].external).toBe(0);
    expect(april.segments[1].internal).toBe(0);
    expect(april.segments[1].external).toBeCloseTo(1);
  });

  it('conserve toutes les séries lorsque le regroupement contient de nombreuses valeurs', () => {
    const resources = Array.from({ length: 7 }, (_, index) =>
      mapMember(
        member({
          id: index + 10,
          team: { name: `TEAM-${index + 1}`, parent: { name: 'DTDD' } },
          periods: [
            {
              start: '2026-01-01',
              type: { label: 'Interne' },
              capacity: {
                schedule: {
                  items: [{ year: 2026, month: 4, assigned: { days: 194 / 12 } }],
                },
              },
            },
          ],
        }),
      ),
    );

    const trend = buildMonthlyFullTimeEquivalentTrend(resources, null, '2026-Q2', 'team');

    expect(trend.seriesLabels).toHaveLength(7);
    expect(trend.seriesLabels).toEqual([
      'TEAM-1',
      'TEAM-2',
      'TEAM-3',
      'TEAM-4',
      'TEAM-5',
      'TEAM-6',
      'TEAM-7',
    ]);
    expect(trend.points[0].segments).toHaveLength(7);
  });

  it('affiche les douze mois d’une année budgétaire', () => {
    const trend = buildMonthlyFullTimeEquivalentTrend([internal], 2026, null, '');

    expect(trend.points).toHaveLength(12);
    expect(trend.points[0].key).toBe('2026-07');
    expect(trend.points.at(-1)?.key).toBe('2027-06');
  });

  it('compte les personnes présentes pour chaque mois en mode nombre de personnes', () => {
    const trend = buildMonthlyFullTimeEquivalentTrend(
      [internal, external],
      null,
      '2026-Q2',
      '',
      'headcount',
    );

    expect(trend.points.map((point) => point.key)).toEqual(['2026-04', '2026-05', '2026-06']);
    expect(trend.seriesLabels).toEqual(['Internes', 'Externes']);
    expect(trend.points[0].totalInternal).toBe(1);
    expect(trend.points[0].totalExternal).toBe(1);
    expect(trend.points[1].totalInternal).toBe(1);
    expect(trend.points[1].totalExternal).toBe(0);
    expect(trend.points[2].totalInternal).toBe(0);
    expect(trend.points[2].totalExternal).toBe(0);
  });

  it('empile le nombre de personnes selon le regroupement actif', () => {
    const trend = buildMonthlyFullTimeEquivalentTrend(
      [internal, external],
      null,
      '2026-Q2',
      'team',
      'headcount',
    );
    const april = trend.points[0];

    expect(trend.seriesLabels).toEqual(['DATA', 'CLOUD']);
    expect(april.segments[0].internal).toBe(1);
    expect(april.segments[0].external).toBe(0);
    expect(april.segments[1].internal).toBe(0);
    expect(april.segments[1].external).toBe(1);
  });

  it('agrège les ETP par trimestre', () => {
    const trend = buildMonthlyFullTimeEquivalentTrend(
      [internal, external],
      null,
      '2026-Q2',
      '',
      'fte',
      'quarter',
    );

    expect(trend.points).toHaveLength(1);
    expect(trend.points[0].key).toBe('2026-Q2');
    expect(trend.points[0].label).toBe('T2 2026');
    expect(trend.points[0].totalInternal).toBeCloseTo(0.5);
    expect(trend.points[0].totalExternal).toBeCloseTo(1 / 3);
  });

  it('compte les personnes uniques par trimestre en mode headcount', () => {
    const trend = buildMonthlyFullTimeEquivalentTrend(
      [internal, external],
      null,
      '2026-Q2',
      '',
      'headcount',
      'quarter',
    );

    expect(trend.points).toHaveLength(1);
    expect(trend.points[0].key).toBe('2026-Q2');
    expect(trend.points[0].totalInternal).toBe(1);
    expect(trend.points[0].totalExternal).toBe(1);
  });

  it('agrège les ETP et effectifs par année budgétaire', () => {
    const trendFte = buildMonthlyFullTimeEquivalentTrend(
      [internal],
      null,
      '2026-Q2',
      '',
      'fte',
      'year',
    );

    expect(trendFte.points).toHaveLength(1);
    expect(trendFte.points[0].key).toBe('2025');
    expect(trendFte.points[0].label).toBe('2025–2026');
    expect(trendFte.points[0].totalInternal).toBeCloseTo(0.125);

    const trendHeadcount = buildMonthlyFullTimeEquivalentTrend(
      [internal],
      null,
      '2026-Q2',
      '',
      'headcount',
      'year',
    );

    expect(trendHeadcount.points).toHaveLength(1);
    expect(trendHeadcount.points[0].totalInternal).toBe(1);
  });
});
