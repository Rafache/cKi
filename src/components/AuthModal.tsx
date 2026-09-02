import { FormEvent, useState } from 'react';
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store';

export function AuthModal() {
  const [tokenInput, setTokenInput] = useState('');
  const { authenticate, isLoading, error, clearError } = useAppStore();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await authenticate(tokenInput);
  };

  return (
    <main className="min-h-screen bg-bg grid place-items-center p-5">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-white bg-white shadow-2xl shadow-brand/10">
        <div className="bg-brand px-8 py-7 text-white">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand shadow-lg">
            <span className="text-2xl font-black">cK</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Bienvenue sur cKi</h1>
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
          </div>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading || !tokenInput.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-black text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {isLoading ? 'Connexion…' : 'Accéder aux ressources'}
          </button>
          <p className="text-xs leading-relaxed text-slate-400">
            Le token est conservé dans ce navigateur. Utilisez cKi uniquement depuis un poste de
            confiance et déconnectez-vous après usage.
          </p>
        </form>
      </section>
    </main>
  );
}
