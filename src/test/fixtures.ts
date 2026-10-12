import type { AbraxioMember } from '../types';

export function member(overrides: Partial<AbraxioMember> = {}): AbraxioMember {
  return {
    id: 1,
    uid: 'uid-1',
    name: 'Ada Lovelace',
    email: 'ada@example.test',
    state: { label: 'Actif' },
    team: { name: 'DATA', parent: { name: 'DTDD' } },
    periods: [
      { id: 10, start: '2026-01-01', type: { label: 'Interne' }, skill: { label: 'Data' } },
    ],
    ...overrides,
  };
}

export function historicalMember(): AbraxioMember {
  return member({
    periods: [
      {
        id: 20,
        start: '2026-07-01',
        end: '2026-12-31',
        type: { label: 'Prestataire externe' },
        capacity: {
          schedule: {
            items: [{ year: 2026, month: 7, assigned: { days: 8.5 }, price: { net: 600 } }],
          },
        },
      },
      {
        id: 10,
        start: '2024-08-01',
        end: '2026-06-30',
        type: { label: 'Interne' },
        capacity: {
          schedule: {
            items: [
              { year: 2024, month: 8, assigned: { days: 2 } },
              { year: 2024, month: 9, assigned: { days: 12 }, price: { net: 400 } },
            ],
          },
        },
      },
    ],
  });
}
