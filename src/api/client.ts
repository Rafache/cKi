import type { AbraxioMember, AbraxioMembersResponse } from '../types';

const ENDPOINT = '/api/abraxio/members';

export class AbraxioApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = 'AbraxioApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseMembersResponse(payload: unknown): AbraxioMember[] {
  if (!isRecord(payload) || !Array.isArray(payload.value)) {
    throw new AbraxioApiError('Le format de la réponse Abraxio est inattendu.', null);
  }
  if (payload.value.some((item) => !isRecord(item))) {
    throw new AbraxioApiError('Certaines ressources Abraxio sont invalides.', null);
  }
  return (payload as unknown as AbraxioMembersResponse).value;
}

function errorMessage(status: number): string {
  if (status === 401) return 'Token Abraxio invalide ou expiré.';
  if (status === 403) return "Ce token n'autorise pas l'accès aux ressources.";
  if (status === 429) return 'Trop de requêtes vers Abraxio. Réessayez dans quelques instants.';
  if (status >= 500) return 'Abraxio est momentanément indisponible.';
  return `Erreur Abraxio (${status}).`;
}

export async function fetchAbraxioMembers(
  token: string,
  signal?: AbortSignal,
): Promise<AbraxioMember[]> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AbraxioApiError('Impossible de contacter Abraxio. Vérifiez votre connexion.', null);
  }

  if (!response.ok) throw new AbraxioApiError(errorMessage(response.status), response.status);

  try {
    return parseMembersResponse(await response.json());
  } catch (error) {
    if (error instanceof AbraxioApiError) throw error;
    throw new AbraxioApiError("La réponse d'Abraxio n'est pas un JSON valide.", null);
  }
}
