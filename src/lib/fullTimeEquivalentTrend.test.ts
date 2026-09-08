import { describe, expect, it } from 'vitest';
import { mapMember } from '../api/mapper';
import { member } from '../test/fixtures';
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

  it('affiche les douze mois d’une année budgétaire', () => {
    const trend = buildMonthlyFullTimeEquivalentTrend([internal], 2026, null, '');

    expect(trend.points).toHaveLength(12);
    expect(trend.points[0].key).toBe('2026-07');
    expect(trend.points.at(-1)?.key).toBe('2027-06');
  });
});
