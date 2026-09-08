import { describe, expect, it } from 'vitest';
import { mapMember } from '../api/mapper';
import { member } from '../test/fixtures';
import {
  EMPTY_FILTERS,
  filterResources,
  getFullTimeEquivalent,
  groupResources,
  sortGroupedResources,
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

  it('calcule les ETP sur la base de 185 jours annuels', () => {
    expect(getFullTimeEquivalent(185)).toBe(1);
    expect(getFullTimeEquivalent(92.5)).toBe(0.5);
  });
});

describe('groupResources', () => {
  it('regroupe les personnes et additionne leurs jours et leurs coûts', () => {
    const rows = [
      {
        ...resources[0],
        classification: 'internal' as const,
        assignedDays: 1.5,
        totalCost: 100,
      },
      {
        ...resources[1],
        classification: 'external' as const,
        assignedDays: 2,
        totalCost: 250,
      },
      {
        ...resources[1],
        id: '3',
        classification: 'external' as const,
        assignedDays: 3.5,
        totalCost: 300,
      },
    ];
    expect(groupResources(rows, 'classification')).toEqual([
      {
        label: 'Prestataire externe',
        people: 2,
        assignedDays: 5.5,
        fullTimeEquivalent: 5.5 / 185,
        totalCost: 550,
      },
      {
        label: 'Interne',
        people: 1,
        assignedDays: 1.5,
        fullTimeEquivalent: 1.5 / 185,
        totalCost: 100,
      },
    ]);
  });

  it('trie les regroupements par libellé ou par valeur numérique', () => {
    const groups = [
      {
        label: 'Équipe 10',
        people: 1,
        assignedDays: 12,
        fullTimeEquivalent: 12 / 185,
        totalCost: 1200,
      },
      {
        label: 'Équipe 2',
        people: 3,
        assignedDays: 8,
        fullTimeEquivalent: 8 / 185,
        totalCost: 2400,
      },
      {
        label: 'Équipe 1',
        people: 2,
        assignedDays: 8,
        fullTimeEquivalent: 8 / 185,
        totalCost: 1600,
      },
    ];

    expect(sortGroupedResources(groups, 'label', 'asc').map((group) => group.label)).toEqual([
      'Équipe 1',
      'Équipe 2',
      'Équipe 10',
    ]);
    expect(sortGroupedResources(groups, 'people', 'desc').map((group) => group.people)).toEqual([
      3, 2, 1,
    ]);
    expect(sortGroupedResources(groups, 'assignedDays', 'asc').map((group) => group.label)).toEqual(
      ['Équipe 1', 'Équipe 2', 'Équipe 10'],
    );
    expect(
      sortGroupedResources(groups, 'fullTimeEquivalent', 'desc').map((group) => group.label),
    ).toEqual(['Équipe 10', 'Équipe 1', 'Équipe 2']);
  });
});
