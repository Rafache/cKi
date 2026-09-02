import {
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  ContactRound,
  UserRoundCheck,
} from 'lucide-react';
import { formatBudgetYear, formatQuarter, getResourcesBudgetSummaries } from '../lib/budget';
import { summarizeResources } from '../lib/resources';
import type { DtddResource } from '../types';

const currency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);

const compactCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);

export function MetricsStrip({
  resources,
  total,
  budgetYear,
  quarter,
}: {
  resources: DtddResource[];
  total: number;
  budgetYear: number | null;
  quarter: string | null;
}) {
  const totals = summarizeResources(resources);
  const allBudgetSummaries = getResourcesBudgetSummaries(resources);
  const budgetSummaries =
    quarter !== null
      ? []
      : budgetYear === null
        ? allBudgetSummaries
        : allBudgetSummaries.filter((summary) => summary.startYear === budgetYear);
  const maximumBudgetCost = Math.max(1, ...budgetSummaries.map((summary) => summary.totalCost));
  const metrics = [
    {
      label: 'Ressources',
      value: resources.length,
      detail: `${total} dans la DTDD`,
      icon: ContactRound,
      color: 'text-brand',
      bg: 'bg-brand/8',
    },
    {
      label: 'Internes',
      value: resources.filter((item) => item.classification === 'internal').length,
      detail: 'Période de référence',
      icon: UserRoundCheck,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Externes',
      value: resources.filter((item) => item.classification === 'external').length,
      detail: 'Prestataires',
      icon: BriefcaseBusiness,
      color: 'text-violet-700',
      bg: 'bg-violet-50',
    },
    {
      label: 'Coût total',
      value: currency(totals.totalCost),
      detail:
        quarter !== null
          ? formatQuarter(quarter)
          : budgetYear === null
            ? 'Ressources filtrées'
            : `Exercice ${formatBudgetYear(budgetYear)}`,
      icon: CircleDollarSign,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <section aria-label="Indicateurs" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {metrics.map(({ label, value, detail, icon: Icon, color, bg }) => (
        <article key={label} className="metric-card">
          <div className={`grid h-10 w-10 place-items-center rounded-lg ${bg} ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className="whitespace-nowrap text-2xl font-black text-slate-900">{value}</p>
            <p className="text-xs text-slate-400">{detail}</p>
          </div>
        </article>
      ))}
      <article className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:col-span-2 xl:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/8 text-brand">
            <BarChart3 className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              {quarter === null ? 'Coût par année budgétaire' : 'Coût du trimestre'}
            </p>
            <p className="text-[11px] text-slate-400">
              {quarter === null ? 'Du 1er juillet au 30 juin' : formatQuarter(quarter)}
            </p>
          </div>
        </div>
        {quarter !== null ? (
          <div className="flex items-center gap-3">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full w-full rounded-full bg-brand" />
            </span>
            <strong className="text-sm text-slate-700">{compactCurrency(totals.totalCost)}</strong>
            <span className="text-xs font-bold text-slate-500">{formatQuarter(quarter)}</span>
          </div>
        ) : budgetSummaries.length > 0 ? (
          <div
            className="space-y-1.5"
            role="img"
            aria-label="Répartition du coût filtré par année budgétaire"
          >
            {budgetSummaries.map((summary) => (
              <div
                key={summary.startYear}
                className="grid grid-cols-[4.5rem_minmax(4rem,1fr)_4.5rem] items-center gap-2 text-[11px]"
              >
                <span className="font-bold text-slate-500">
                  {formatBudgetYear(summary.startYear)}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{ width: `${(summary.totalCost / maximumBudgetCost) * 100}%` }}
                  />
                </span>
                <strong className="text-right text-slate-700">
                  {compactCurrency(summary.totalCost)}
                </strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Aucune donnée de coût pour les filtres actifs.</p>
        )}
      </article>
    </section>
  );
}
