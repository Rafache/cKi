import { Download, LogOut, RefreshCw, Trash2, UsersRound } from 'lucide-react';
import { useAppStore } from '../store';
import { downloadSnapshot, formatSnapshotDate } from '../lib/snapshot';
import { DataImportButton } from './DataImportButton';

interface HeaderProps {
  visibleCount: number;
  onExport: () => void;
  onRefresh: () => void;
}

export function Header({ visibleCount, onExport, onRefresh }: HeaderProps) {
  const { token, snapshot, source, isLoading, logout, eraseData } = useAppStore();

  return (
    <header className="relative z-30 bg-brand text-white shadow-lg sm:sticky sm:top-0">
      <div className="mx-auto flex min-h-18 max-w-screen-2xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-white font-black text-brand shadow-md">
            cK
          </div>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tight">cKi</h1>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/65">
              Ressources DTDD · Abraxio
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onExport}
            disabled={!visibleCount}
            className="header-button"
            title="Exporter les résultats filtrés"
            aria-label={`Exporter les résultats filtrés en CSV (${visibleCount})`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV ({visibleCount})</span>
          </button>
          <button
            onClick={() => snapshot && downloadSnapshot(snapshot)}
            disabled={!snapshot}
            className="header-button"
          >
            <Download className="h-4 w-4" /> Exporter les données brutes
          </button>
          <DataImportButton className="header-button" />
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="header-button"
            title="Actualiser depuis Abraxio"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualiser depuis Abraxio</span>
          </button>
          {token && (
            <button onClick={logout} className="header-button" title="Se déconnecter d’Abraxio">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Se déconnecter d’Abraxio</span>
            </button>
          )}
          <button
            onClick={() => {
              if (
                window.confirm(
                  'Effacer les données locales ? Les fichiers JSON déjà téléchargés seront conservés.',
                )
              )
                void eraseData();
            }}
            disabled={isLoading || !snapshot}
            className="header-button"
          >
            <Trash2 className="h-4 w-4" /> Effacer les données locales
          </button>
        </div>
      </div>
      {snapshot && (
        <div className="mx-auto max-w-screen-2xl px-4 pb-3 text-xs text-white/80 sm:px-6">
          <p>
            {source === 'api'
              ? 'Données récupérées depuis Abraxio'
              : source === 'import'
                ? 'Données importées depuis un fichier JSON'
                : 'Données restaurées depuis la sauvegarde locale'}{' '}
            · Récupération : {formatSnapshotDate(snapshot.fetchedAt)}
          </p>
          {snapshot.importedAt && <p>Import : {formatSnapshotDate(snapshot.importedAt)}</p>}
        </div>
      )}
      <div className="border-t border-white/10 bg-brand-dark/45 px-4 py-1.5 text-center text-xs font-semibold text-white/70">
        <UsersRound className="mr-1 inline h-3.5 w-3.5" /> Données réservées à un usage interne
      </div>
    </header>
  );
}
