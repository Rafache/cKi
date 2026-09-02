import { describe, expect, it } from 'vitest';
import { mapMember } from '../api/mapper';
import { member } from '../test/fixtures';
import {
  EMPTY_FILTERS,
  filterResources,
  groupResources,
  sortResources,
  summarizeResources,
} from './resources';

const resources = [
  mapMember(
    member({ id: 1, name: 'Élodie Alpha', team: { name: 'DATA', parent: { name: 'DTDD' } } }),
  ),
  mapMember(
    member({
      id: 2,
      name: 'Bruno Beta',
      email: 'bruno@test.fr',
      team: { name: 'CLOUD', parent: { name: 'DTDD' } },
      periods: [{ type: { label: 'Prestataire externe' }, supplier: { name: 'ACME' } }],
    }),
  ),
];

describe('filterResources', () => {
  it('recherche sans tenir compte des accents et filtre plusieurs dimensions', () => {
    expect(filterResources(resources, { ...EMPTY_FILTERS, search: 'elodie' })).toHaveLength(1);
    expect(
      filterResources(resources, {
        ...EMPTY_FILTERS,
        classifications: ['external'],
        teams: ['CLOUD'],
        suppliers: ['ACME'],
      }),
    ).toHaveLength(1);
  });
  it('retourne zéro lorsqu’un filtre ne correspond pas', () =>
    expect(filterResources(resources, { ...EMPTY_FILTERS, states: ['Archivé'] })).toEqual([]));

  it('accepte plusieurs valeurs dans un même filtre', () => {
    expect(
      filterResources(resources, { ...EMPTY_FILTERS, classifications: ['internal', 'external'] }),
    ).toHaveLength(2);
  });

  it('conserve uniquement les ressources présentes sur l’année budgétaire', () => {
    const scheduled = mapMember(
      member({
        id: 3,
        periods: [
          {
            start: '2024-07-01',
            capacity: { schedule: { items: [{ year: 2024, month: 8, assigned: { days: 2 } }] } },
          },
        ],
      }),
    );
    expect(
      filterResources([...resources, scheduled], { ...EMPTY_FILTERS, budgetYear: 2024 }),
    ).toEqual([scheduled]);
    expect(
      filterResources([...resources, scheduled], { ...EMPTY_FILTERS, quarter: '2024-Q3' }),
    ).toEqual([scheduled]);
  });
});

describe('sortResources', () => {
  it('trie en français dans les deux directions', () => {
    expect(sortResources(resources, 'name', 'asc').map((item) => item.name)).toEqual([
      'Bruno Beta',
      'Élodie Alpha',
    ]);
    expect(sortResources(resources, 'name', 'desc').map((item) => item.name)).toEqual([
      'Élodie Alpha',
      'Bruno Beta',
    ]);
  });
});

describe('summarizeResources', () => {
  it('additionne les jours affectés et coûts, et moyenne les TJM renseignés', () => {
    const rows = [
      { ...resources[0], assignedDays: 10, dailyRate: 800, totalCost: 10000 },
      { ...resources[1], assignedDays: 20, dailyRate: 1000, totalCost: 20000 },
      { ...resources[1], assignedDays: null, dailyRate: null, totalCost: null },
    ];

    expect(summarizeResources(rows)).toEqual({
      assignedDays: 30,
      averageDailyRate: 900,
      totalCost: 30000,
    });
  });
});

describe('groupResources', () => {
  it('regroupe les personnes et additionne leurs coûts', () => {
    const rows = [
      { ...resources[0], classification: 'internal' as const, totalCost: 100 },
      { ...resources[1], classification: 'external' as const, totalCost: 250 },
      { ...resources[1], id: '3', classification: 'external' as const, totalCost: 300 },
    ];
    expect(groupResources(rows, 'classification')).toEqual([
      { label: 'Prestataire externe', people: 2, totalCost: 550 },
      { label: 'Interne', people: 1, totalCost: 100 },
    ]);
  });
});
