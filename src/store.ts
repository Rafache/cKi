import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { AbraxioApiError, fetchAbraxioResponse } from './api/client';
import { mapDtddResources } from './api/mapper';
import { createSnapshot, validateSnapshot, type DataSnapshot } from './lib/snapshot';
import { deleteSnapshot, readSnapshot, writeSnapshot } from './lib/snapshotStorage';
import type { DtddResource } from './types';

interface AppState {
  token: string | null;
  resources: DtddResource[];
  snapshot: DataSnapshot | null;
  source: 'api' | 'local' | 'import' | null;
  isRestoring: boolean;
  isLoading: boolean;
  error: string | null;
  warning: string | null;
  lastUpdatedAt: string | null;
  importRevision: number;
  restore: () => Promise<void>;
  authenticate: (token: string) => Promise<boolean>;
  loadResources: () => Promise<void>;
  importSnapshot: (snapshot: DataSnapshot) => Promise<boolean>;
  eraseData: () => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export function createAppStore() {
  let revision = 0;
  let controller: AbortController | null = null;
  let restoration: Promise<void> | null = null;

  function invalidate() {
    controller?.abort();
    controller = new AbortController();
    revision += 1;
    return { revision, signal: controller.signal };
  }

  return create<AppState>()(
    persist(
      (set, get) => {
        async function commit(
          snapshot: DataSnapshot,
          source: 'api' | 'import',
          operation: ReturnType<typeof invalidate>,
        ) {
          const resources = mapDtddResources(snapshot.payload.value);
          let warning: string | null = null;
          try {
            await writeSnapshot(snapshot, operation.signal);
          } catch {
            if (operation.revision !== revision) return false;
            warning =
              'Les données sont disponibles pour cette session, mais la sauvegarde locale a échoué. Exportez les données brutes pour les conserver. La sauvegarde précédente reste inchangée.';
          }
          if (operation.revision !== revision) return false;
          set({
            snapshot,
            resources,
            source,
            lastUpdatedAt: snapshot.fetchedAt,
            warning,
            error: null,
            isLoading: false,
            importRevision: get().importRevision + (source === 'import' ? 1 : 0),
          });
          return true;
        }

        async function refresh(token: string): Promise<boolean> {
          if (get().isLoading || get().isRestoring) return false;
          const operation = invalidate();
          set({ isLoading: true, error: null });
          try {
            const payload = await fetchAbraxioResponse(token, operation.signal);
            if (operation.revision !== revision) return false;
            const snapshot = createSnapshot(payload, new Date().toISOString());
            if (
              get().resources.length > 0 &&
              mapDtddResources(payload.value).length === 0 &&
              !window.confirm(
                'Abraxio ne renvoie aucune ressource DTDD. Remplacer les données sauvegardées par ce résultat vide ?',
              )
            ) {
              set({ isLoading: false });
              return false;
            }
            const accepted = await commit(snapshot, 'api', operation);
            if (accepted) set({ token });
            return accepted;
          } catch (error) {
            if (operation.revision !== revision) return false;
            const unauthorized = error instanceof AbraxioApiError && error.status === 401;
            set({
              token: unauthorized && get().token === token ? null : get().token,
              isLoading: false,
              error:
                error instanceof AbraxioApiError
                  ? error.message
                  : 'Impossible de charger les données Abraxio. Les données précédentes sont conservées.',
            });
            return false;
          }
        }

        return {
          token: null,
          resources: [],
          snapshot: null,
          source: null,
          isRestoring: true,
          isLoading: false,
          error: null,
          warning: null,
          lastUpdatedAt: null,
          importRevision: 0,
          restore: () => {
            if (restoration) return restoration;
            const initialRevision = revision;
            restoration = (async () => {
              try {
                const snapshot = await readSnapshot();
                if (initialRevision === revision && snapshot) {
                  set({
                    snapshot,
                    resources: mapDtddResources(snapshot.payload.value),
                    source: 'local',
                    lastUpdatedAt: snapshot.fetchedAt,
                  });
                }
              } catch {
                if (initialRevision === revision) {
                  set({
                    warning:
                      'La sauvegarde locale n’a pas pu être restaurée. Vous pouvez importer un fichier JSON ou actualiser depuis Abraxio.',
                  });
                }
              } finally {
                set({ isRestoring: false });
              }
            })();
            return restoration;
          },
          authenticate: async (rawToken) => {
            const token = rawToken.trim().replace(/^Bearer\s+/i, '');
            if (!token) {
              set({ error: 'Saisissez un token Abraxio.' });
              return false;
            }
            return refresh(token);
          },
          loadResources: async () => {
            const token = get().token;
            if (token) await refresh(token);
          },
          importSnapshot: async (value) => {
            let snapshot: DataSnapshot;
            try {
              snapshot = validateSnapshot(value);
            } catch {
              set({
                error:
                  'La sauvegarde importée est invalide. Les données précédentes sont conservées.',
              });
              return false;
            }
            const operation = invalidate();
            set({ isLoading: true, error: null });
            return commit(
              { ...snapshot, importedAt: new Date().toISOString() },
              'import',
              operation,
            );
          },
          eraseData: async () => {
            const operation = invalidate();
            set({ isLoading: true, error: null });
            try {
              await deleteSnapshot(operation.signal);
              if (operation.revision !== revision) return;
              set({
                snapshot: null,
                resources: [],
                source: null,
                lastUpdatedAt: null,
                warning: null,
                isLoading: false,
                importRevision: get().importRevision + 1,
              });
            } catch {
              if (operation.revision === revision)
                set({
                  isLoading: false,
                  error: 'Impossible d’effacer la sauvegarde locale. Les données sont conservées.',
                });
            }
          },
          logout: () => {
            invalidate();
            set({ token: null, isLoading: false, error: null });
          },
          clearError: () => set({ error: null }),
        };
      },
      {
        name: 'cki-auth',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ token: state.token }),
      },
    ),
  );
}

export const useAppStore = createAppStore();
