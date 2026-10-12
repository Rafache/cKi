import type { AbraxioMember, AbraxioMembersResponse } from '../types';
import { isRecord, isValidMember } from './validation';

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

export function parseMembersResponse(payload: unknown): AbraxioMember[] {
  if (!isRecord(payload) || !Array.isArray(payload.value)) {
    throw new AbraxioApiError('Le format de la réponse Abraxio est inattendu.', null);
  }
  if (payload.value.some((item) => !isValidMember(item))) {
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

export async function fetchAbraxioResponse(
  token: string,
  signal?: AbortSignal,
): Promise<AbraxioMembersResponse> {
  const requestSignal = AbortSignal.any([AbortSignal.timeout(30_000), ...(signal ? [signal] : [])]);
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: requestSignal,
      cache: 'no-store',
    });
  } catch (error) {
    if (requestSignal.reason?.name === 'TimeoutError') {
      throw new AbraxioApiError(
        'Abraxio ne répond pas après 30 secondes. Les données précédentes sont conservées.',
        null,
      );
    }
    if (requestSignal.aborted) throw requestSignal.reason;
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new AbraxioApiError('Impossible de contacter Abraxio. Vérifiez votre connexion.', null);
  }

  if (!response.ok) throw new AbraxioApiError(errorMessage(response.status), response.status);

  try {
    const payload: unknown = await response.json();
    parseMembersResponse(payload);
    return payload as AbraxioMembersResponse;
  } catch (error) {
    if (requestSignal.reason?.name === 'TimeoutError') {
      throw new AbraxioApiError(
        'Abraxio ne répond pas après 30 secondes. Les données précédentes sont conservées.',
        null,
      );
    }
    if (signal?.aborted) throw signal.reason;
    if (error instanceof AbraxioApiError) throw error;
    throw new AbraxioApiError("La réponse d'Abraxio n'est pas un JSON valide.", null);
  }
}

export async function fetchAbraxioMembers(
  token: string,
  signal?: AbortSignal,
): Promise<AbraxioMember[]> {
  return (await fetchAbraxioResponse(token, signal)).value;
}
