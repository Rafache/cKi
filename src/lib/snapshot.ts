import { parseMembersResponse } from '../api/client';
import { mapDtddResources } from '../api/mapper';
import { isRecord } from '../api/validation';
import type { AbraxioMembersResponse } from '../types';

export interface DataSnapshot {
  format: 'cki-abraxio';
  version: 1;
  fetchedAt: string | null;
  importedAt: string | null;
  payload: AbraxioMembersResponse;
}

function validDate(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

export function createSnapshot(payload: unknown, fetchedAt: string | null): DataSnapshot {
  const members = parseMembersResponse(payload);
  mapDtddResources(members);
  return {
    format: 'cki-abraxio',
    version: 1,
    fetchedAt,
    importedAt: null,
    payload: payload as AbraxioMembersResponse,
  };
}

export function validateSnapshot(value: unknown): DataSnapshot {
  if (!isRecord(value) || value.format !== 'cki-abraxio') {
    throw new Error('Ce fichier n’est pas une sauvegarde cKi.');
  }
  if (value.version !== 1)
    throw new Error('Cette version de sauvegarde cKi n’est pas prise en charge.');
  if (!validDate(value.fetchedAt) || !validDate(value.importedAt)) {
    throw new Error('Les dates de la sauvegarde sont invalides.');
  }
  return { ...createSnapshot(value.payload, value.fetchedAt), importedAt: value.importedAt };
}

export function parseSnapshotFile(contents: string): DataSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error('Le fichier n’est pas un JSON valide.');
  }
  if (isRecord(value) && 'value' in value && !('format' in value))
    return createSnapshot(value, null);
  return validateSnapshot(value);
}

export function serializeSnapshot(snapshot: DataSnapshot): string {
  return JSON.stringify(validateSnapshot(snapshot), null, 2);
}

export function downloadSnapshot(snapshot: DataSnapshot): void {
  const blob = new Blob([serializeSnapshot(snapshot)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cki-abraxio-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function formatSnapshotDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }).format(
        new Date(value),
      )
    : 'Date de récupération inconnue';
}
