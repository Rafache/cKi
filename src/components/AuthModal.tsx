import { FormEvent, useState } from 'react';
import { KeyRound, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { useAppStore } from '../store';
import { DataImportButton } from './DataImportButton';

export function AuthModal({ onClose }: { onClose?: () => void }) {
  const [tokenInput, setTokenInput] = useState('');
  const { token, authenticate, isLoading, error, warning, clearError } = useAppStore();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await authenticate(tokenInput.trim() || token || '')) onClose?.();
  };

  return (
    <main className={onClose ? '' : 'min-h-screen bg-bg grid place-items-center p-5'}>
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-white bg-white shadow-2xl shadow-brand/10">
        <div className="bg-brand px-8 py-7 text-white">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand shadow-lg">
            <span className="text-2xl font-black">cK</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="float-right rounded p-2"
              aria-label="Fermer la connexion"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <h1 id="auth-title" className="text-3xl font-black tracking-tight">
            {onClose ? 'Connexion Abraxio' : 'Bienvenue sur cKi'}
          </h1>
          <p className="mt-2 text-sm font-medium text-white/75">
            L’annuaire des ressources de la DTDD
          </p>
        </div>
        <form className="space-y-5 p-8" onSubmit={submit}>
          <div>
            <label htmlFor="token" className="mb-2 block text-sm font-bold text-slate-700">
              Token Abraxio
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="token"
                type="password"
                autoComplete="off"
                value={tokenInput}
                onChange={(event) => {
                  setTokenInput(event.target.value);
                  if (error) clearError();
                }}
                placeholder="Bearer eyJ… ou eyJ…"
                className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-accent focus:ring-3 focus:ring-accent/15"
              />
            </div>
            {token && (
              <p className="mt-2 text-xs text-slate-500">
                Un token est déjà enregistré. Laissez ce champ vide pour l’utiliser.
              </p>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          )}
          {warning && (
            <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {warning}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading || (!tokenInput.trim() && !token)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-black text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {isLoading ? 'Connexion…' : 'Actualiser depuis Abraxio'}
          </button>
          {!onClose && (
            <DataImportButton className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-brand" />
          )}
          <p className="text-xs leading-relaxed text-slate-400">
            Le token est conservé dans ce navigateur. Utilisez cKi uniquement depuis un poste de
            confiance. La déconnexion supprime le token ; les données locales restent consultables
            jusqu’à leur effacement explicite.
          </p>
        </form>
      </section>
    </main>
  );
}
