import { describe, expect, it } from 'vitest';
import { mapMember } from '../api/mapper';
import { member } from '../test/fixtures';
import { resourcesToCsv } from './csv';

describe('resourcesToCsv', () => {
  it('génère un CSV Excel UTF-8, séparé par des points-virgules et échappé', () => {
    const csv = resourcesToCsv([mapMember(member({ name: 'Martin; Jeanne' }))]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Nom;E-mail;Poste');
    expect(csv).toContain('Jours affectés;TJM HT;Coût total HT');
    expect(csv).toContain('TJM HT;Coût total HT');
    expect(csv).not.toContain('Feuilles de temps');
    expect(csv).toContain('"Martin; Jeanne"');
    expect(csv.split('\r\n')).toHaveLength(2);
  });
});
