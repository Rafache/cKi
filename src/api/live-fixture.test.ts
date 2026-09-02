import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMembersResponse } from './client';
import { mapDtddResources } from './mapper';

const fixturePath = process.env.CKI_API_FIXTURE_PATH;

describe.skipIf(!fixturePath)('réponse Abraxio réelle', () => {
  it('valide et normalise toutes les ressources DTDD de la réponse', () => {
    const members = parseMembersResponse(JSON.parse(readFileSync(fixturePath!, 'utf8')));
    const expected = members.filter(
      (member) => member.team?.parent?.name?.trim() === 'DTDD',
    ).length;
    const resources = mapDtddResources(members, new Date('2026-09-02T12:00:00Z'));

    expect(resources).toHaveLength(expected);
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.every((resource) => resource.parentTeam === 'DTDD')).toBe(true);
    expect(
      resources.every((resource) =>
        ['internal', 'external', 'unknown'].includes(resource.classification),
      ),
    ).toBe(true);
  });
});
