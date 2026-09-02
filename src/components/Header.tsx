import { Download, LogOut, RefreshCw, UsersRound } from 'lucide-react';
import { useAppStore } from '../store';

interface HeaderProps {
  visibleCount: number;
  onExport: () => void;
}

export function Header({ visibleCount, onExport }: HeaderProps) {
  const { isLoading, loadResources, logout, lastUpdatedAt } = useAppStore();

  return (
    <header className="sticky top-0 z-30 bg-brand text-white shadow-lg">
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
          {lastUpdatedAt && (
            <span className="hidden text-xs text-white/60 lg:inline">
              Actualisé à{' '}
              {new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(
                new Date(lastUpdatedAt),
              )}
            </span>
          )}
          <button
            onClick={onExport}
            disabled={!visibleCount}
            className="header-button"
            title="Exporter les résultats filtrés"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV ({visibleCount})</span>
          </button>
          <button
            onClick={() => void loadResources()}
            disabled={isLoading}
            className="header-button"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Actualiser</span>
          </button>
          <button onClick={logout} className="header-button" title="Se déconnecter">
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Se déconnecter</span>
          </button>
        </div>
      </div>
      <div className="border-t border-white/10 bg-brand-dark/45 px-4 py-1.5 text-center text-xs font-semibold text-white/70">
        <UsersRound className="mr-1 inline h-3.5 w-3.5" /> Données réservées à un usage interne
      </div>
    </header>
  );
}
