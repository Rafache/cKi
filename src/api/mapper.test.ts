import { describe, expect, it } from 'vitest';
import {
  getPeriodFinancials,
  mapDtddResources,
  mapMember,
  normalizePeriod,
  selectPrimaryPeriod,
} from './mapper';
import { member } from '../test/fixtures';

const now = new Date('2026-09-02T12:00:00Z');

describe('mapDtddResources', () => {
  it('conserve uniquement les ressources rattachées à la DTDD, indépendamment de leur état', () => {
    const archived = member({ id: 2, state: { label: 'Archivé' } });
    const outside = member({
      id: 3,
      team: { name: 'AUTRE', parent: { name: 'DIRECTION GENERALE' } },
    });
    expect(mapDtddResources([archived, outside], now)).toHaveLength(1);
    expect(mapDtddResources([archived, outside], now)[0].state).toBe('Archivé');
  });

  it('normalise les champs absents sans planter', () => {
    const result = mapMember({ team: { parent: { name: 'DTDD' } }, periods: null }, now);
    expect(result.name).toBe('Sans nom');
    expect(result.classification).toBe('unknown');
    expect(result.periods).toEqual([]);
  });
});

describe('selectPrimaryPeriod', () => {
  const base = {
    id: '',
    end: null,
    type: '',
    skillCode: '',
    skill: '',
    supplierId: '',
    supplier: '',
    calendarId: '',
    workWeek: [],
    assignmentsEnabled: null,
    pricingEnabled: null,
    payroll: null,
    capacityId: '',
    capacityEnabled: null,
    defaultCapacity: null,
    computationMode: '',
    schedule: [],
  };

  it('choisit la période courante avec le début le plus récent en cas de chevauchement', () => {
    const older = { ...base, start: '2026-01-01', type: 'Interne' };
    const newer = { ...base, start: '2026-08-01', type: 'Prestataire externe' };
    expect(selectPrimaryPeriod([older, newer], now)).toBe(newer);
  });

  it('utilise la période la plus récente si aucune période ne couvre la date courante', () => {
    const past = { ...base, start: '2025-01-01', end: '2025-12-31' };
    const future = { ...base, start: '2027-01-01', end: null };
    expect(selectPrimaryPeriod([past, future], now)).toBe(future);
  });

  it('classe correctement les types Abraxio et les historiques mixtes', () => {
    const mapped = mapMember(
      member({
        periods: [
          { start: '2025-01-01', end: '2025-12-31', type: { label: 'Interne' } },
          { start: '2026-01-01', type: { label: 'Prestataire externe' } },
        ],
      }),
      now,
    );
    expect(mapped.classification).toBe('external');
    expect(mapped.periods).toHaveLength(2);
  });
});

describe('getPeriodFinancials', () => {
  it('calcule le TJM HT moyen pondéré et cumule les jours affectés multipliés par le TJM', () => {
    const mapped = mapMember(
      member({
        periods: [
          {
            start: '2026-01-01',
            type: { label: 'Prestataire externe' },
            capacity: {
              schedule: {
                items: [
                  {
                    year: 2026,
                    month: 8,
                    days: 2,
                    off: 4,
                    assigned: { days: 1 },
                    price: { net: 500, total: 600 },
                  },
                  {
                    year: 2026,
                    month: 9,
                    days: 3,
                    off: 2,
                    assigned: { days: 8 },
                    price: { net: 550, total: 660 },
                  },
                ],
              },
            },
          },
        ],
      }),
      now,
    );

    expect(mapped.assignedDays).toBe(9);
    expect(mapped.dailyRate).toBeCloseTo(544.44, 2);
    expect(mapped.totalCost).toBe(4900);
  });

  it('renvoie des valeurs absentes lorsqu’aucun tarif n’existe', () => {
    expect(getPeriodFinancials(null)).toEqual({ dailyRate: null, totalCost: null });
  });
});

describe('tarif par défaut', () => {
  it('prolonge le dernier TJM strictement positif sans reprendre une valeur à zéro', () => {
    const period = normalizePeriod({
      capacity: {
        schedule: {
          items: [
            { year: 2025, month: 4, days: 10, assigned: { days: 10 }, price: { net: 850 } },
            { year: 2025, month: 8, days: 5, assigned: { days: 5 }, price: null },
            { year: 2025, month: 7, days: 8, assigned: { days: 8 }, price: { net: 0 } },
            { year: 2025, month: 11, days: 12, assigned: { days: 12 }, price: { net: 900 } },
            { year: 2025, month: 12, days: 10, assigned: { days: 10 }, price: null },
          ],
        },
      },
    });

    expect(period.schedule.map((item) => item.priceNet)).toEqual([850, 850, 850, 900, 900]);
    expect(period.schedule.map((item) => item.priceInherited)).toEqual([
      false,
      true,
      true,
      false,
      true,
    ]);
    const financials = getPeriodFinancials(period);
    expect(financials.totalCost).toBe(39350);
    expect(financials.dailyRate).toBeCloseTo(874.44, 2);
  });
});
