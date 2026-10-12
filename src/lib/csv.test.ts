import { describe, expect, it } from 'vitest';
import { mapMember } from '../api/mapper';
import { historicalMember, member } from '../test/fixtures';
import { resourcesToCsv } from './csv';

describe('resourcesToCsv', () => {
  it('exports the first start date and consolidated totals', () => {
    const resource = mapMember(historicalMember(), new Date('2026-09-02T12:00:00Z'));
    const row = resourcesToCsv([resource]).split('\r\n')[1].split(';');

    expect(row[8]).toBe('2024-08-01');
    expect(row[9]).toBe('2026-12-31');
    expect(row[10]).toBe('22.5');
    expect(Number(row[11])).toBeCloseTo(9900 / 20.5);
    expect(row[12]).toBe('9900');
  });

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
