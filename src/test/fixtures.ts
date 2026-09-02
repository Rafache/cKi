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
