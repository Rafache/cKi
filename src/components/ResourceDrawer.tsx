import { useEffect } from 'react';
import { Building2, CalendarDays, CircleDollarSign, Clock3, Code2, X } from 'lucide-react';
import { getPeriodFinancials } from '../api/mapper';
import {
  formatBudgetYear,
  getBudgetSummaries,
  getConsolidatedSchedule,
  getTotalBudgetSummary,
} from '../lib/budget';
import type { DtddResource, ResourcePeriod } from '../types';
import { ClassificationBadge } from './ClassificationBadge';

const date = (input: string | null) =>
  input
    ? new Intl.DateTimeFormat('fr-FR').format(new Date(`${input.slice(0, 10)}T00:00:00`))
    : 'Non renseignée';
const yesNo = (input: boolean | null) => (input === null ? 'Non renseigné' : input ? 'Oui' : 'Non');
const value = (input: string | number | null | undefined) =>
  input === '' || input === null || input === undefined ? 'Non renseigné' : String(input);
const money = (input: number | null) =>
  input === null
    ? '—'
    : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(input);
const number = (input: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(input);
const WEEK_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const TODAY_TIMESTAMP = Date.now();

function workDayLabel(day: number): string {
  if (day === 0) return 'Repos';
  if (day === 0.5) return 'Demi-journée';
  if (day === 1) return 'Journée';
  return `${number(day * 100)} %`;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-700">{children}</dd>
    </div>
  );
}

function PeriodCard({ period, primary }: { period: ResourcePeriod; primary: boolean }) {
  const financials = getPeriodFinancials(period);
  const workPercentage = period.workWeek.length
    ? (period.workWeek.reduce((sum, day) => sum + day, 0) / 5) * 100
    : null;
  const isPast = period.end !== null && Date.parse(period.end) < TODAY_TIMESTAMP;

  return (
    <details
      className={`rounded-xl border ${primary ? 'border-brand/25 bg-brand/3' : 'border-slate-200'}`}
      open={!isPast}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 marker:hidden">
        <div>
          <h4 className="font-black text-slate-800">{period.type || 'Période sans type'}</h4>
          <p className="text-xs text-slate-400">
            {date(period.start)} → {period.end ? date(period.end) : 'sans fin'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPast && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
              Passée
            </span>
          )}
          {primary && (
            <span className="rounded-full bg-brand px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white">
              Référence
            </span>
          )}
          <span className="text-brand" aria-hidden="true">
            ▾
          </span>
        </div>
      </summary>
      <div className="border-t border-slate-100 p-4">
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <Detail label="Compétence">{value(period.skill)}</Detail>
          <Detail label="Capacité activée">{yesNo(period.capacityEnabled)}</Detail>
          <Detail label="Capacité par défaut">{value(period.defaultCapacity)}</Detail>
          <Detail label="Affectations activées">{yesNo(period.assignmentsEnabled)}</Detail>
          <Detail label="Tarification activée">{yesNo(period.pricingEnabled)}</Detail>
          <Detail label="TJM moyen HT">{money(financials.dailyRate)}</Detail>
          <Detail label="Coût total HT">{money(financials.totalCost)}</Detail>
        </dl>
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Semaine travaillée
            </p>
            <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-black text-emerald-800">
              {workPercentage === null ? 'Non renseigné' : `${number(workPercentage)} %`}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {WEEK_DAYS.map((day, index) => {
              const workload = period.workWeek[index] ?? 0;
              return (
                <div
                  key={day}
                  className={`rounded-md px-1 py-2 text-center ${workload > 0 ? 'bg-brand/8 text-brand' : 'bg-slate-50 text-slate-400'}`}
                  title={workDayLabel(workload)}
                >
                  <span className="block text-[10px] font-black uppercase">{day}</span>
                  <span className="mt-1 block text-xs font-bold">
                    {workload > 0 ? number(workload) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </details>
  );
}

function CostSummary({ resource }: { resource: DtddResource }) {
  const summaries = getBudgetSummaries(resource);
  const total = getTotalBudgetSummary(summaries);

  return (
    <section>
      <h3 className="drawer-title">
        <CircleDollarSign />
        Coût
      </h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Année budgétaire</th>
              <th>Jours affectés</th>
              <th>TJM moyen HT</th>
              <th>Coût HT</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.startYear}>
                <td>{formatBudgetYear(summary.startYear)}</td>
                <td>{number(summary.assignedDays)}</td>
                <td>{money(summary.averageDailyRate)}</td>
                <td>{money(summary.totalCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total</th>
              <th>{number(total.assignedDays)}</th>
              <th>{money(total.averageDailyRate)}</th>
              <th>{money(total.totalCost)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-xs font-semibold text-amber-800">
        <CircleDollarSign className="h-4 w-4 shrink-0" />
        Les informations tarifaires sont confidentielles et réservées à un usage interne.
      </p>
    </section>
  );
}

function DetailedCalendar({ resource }: { resource: DtddResource }) {
  const rows = getConsolidatedSchedule(resource);
  const totals = rows.reduce(
    (sum, { item }) => ({
      days: sum.days + (item.days ?? 0),
      off: sum.off + (item.off ?? 0),
      assigned: sum.assigned + (item.assignedDays ?? 0),
      cost: sum.cost + (item.assignedDays ?? 0) * (item.priceNet ?? 0),
      pricedDays: sum.pricedDays + (item.priceNet === null ? 0 : (item.assignedDays ?? 0)),
    }),
    { days: 0, off: 0, assigned: 0, cost: 0, pricedDays: 0 },
  );
  const averageRate = totals.pricedDays > 0 ? totals.cost / totals.pricedDays : null;

  if (rows.length === 0) return null;
  return (
    <details className="mt-4 rounded-xl border border-slate-200">
      <summary className="cursor-pointer p-4 text-xs font-black uppercase tracking-wider text-brand">
        Données mensuelles détaillées ({rows.length})
      </summary>
      <p className="px-4 text-xs text-slate-400">
        Du {String(rows[0].item.month).padStart(2, '0')}/{rows[0].item.year} au{' '}
        {String(rows.at(-1)!.item.month).padStart(2, '0')}/{rows.at(-1)!.item.year} · Les TJM
        marqués « repris » utilisent la dernière valeur positive connue.
      </p>
      <div className="mt-3 overflow-x-auto px-4 pb-4">
        <table className="schedule-table">
          <thead>
            <tr>
              <th>Mois</th>
              <th>Jours</th>
              <th>Abs.</th>
              <th>Affectés</th>
              <th>TJM HT</th>
              <th>Taxes</th>
              <th>Coût HT</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, item }) => (
              <tr key={key}>
                <td>
                  {key.slice(5, 7)}/{key.slice(0, 4)}
                </td>
                <td>{item.days ?? '—'}</td>
                <td>{item.off ?? '—'}</td>
                <td>{item.assignedDays ?? '—'}</td>
                <td className={item.priceInherited ? 'italic text-slate-400' : ''}>
                  {money(item.priceNet)}
                  {item.priceInherited && <span className="ml-1 text-[9px] uppercase">repris</span>}
                </td>
                <td>{item.tax ?? '—'}</td>
                <td>
                  {money(
                    item.assignedDays === null || item.priceNet === null
                      ? null
                      : item.assignedDays * item.priceNet,
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th>Total personne</th>
              <th>{number(totals.days)}</th>
              <th>{number(totals.off)}</th>
              <th>{number(totals.assigned)}</th>
              <th>{money(averageRate)}</th>
              <th>—</th>
              <th>{money(totals.cost)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </details>
  );
}

export function ResourceDrawer({
  resource,
  onClose,
}: {
  resource: DtddResource | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!resource) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', close);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', close);
      document.body.style.overflow = '';
    };
  }, [resource, onClose]);

  if (!resource) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resource-title"
    >
      <button
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Fermer la fiche"
      />
      <aside className="relative h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <header className="sticky top-0 z-10 bg-brand px-5 py-5 text-white shadow-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <ClassificationBadge value={resource.classification} />
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wider text-white ring-1 ring-white/25">
                  {resource.state}
                </span>
              </div>
              <h2 id="resource-title" className="text-2xl font-black">
                {resource.name}
              </h2>
              <p className="text-sm text-white/70">{resource.jobTitle || 'Poste non renseigné'}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="space-y-6 p-5 sm:p-6">
          <section>
            <h3 className="drawer-title">
              <Building2 />
              Organisation
            </h3>
            <dl className="detail-grid">
              <Detail label="Entreprise">{value(resource.primaryPeriod?.supplier)}</Detail>
              <Detail label="Secteur">{value(resource.parentTeam)}</Detail>
              <Detail label="Service">{resource.team}</Detail>
            </dl>
          </section>
          <section>
            <h3 className="drawer-title">
              <Clock3 />
              Feuilles de temps
            </h3>
            <dl className="detail-grid">
              <Detail label="Activées">{yesNo(resource.timesheets.enabled)}</Detail>
              <Detail label="Auto-validées">{yesNo(resource.timesheets.autoValidated)}</Detail>
              <Detail label="Période">
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>{date(resource.timesheets.start)}</span>
                  <span className="text-slate-300">→</span>
                  <span>{date(resource.timesheets.end)}</span>
                </span>
              </Detail>
            </dl>
          </section>
          <CostSummary resource={resource} />
          <section>
            <h3 className="drawer-title">
              <CalendarDays />
              Périodes ({resource.periods.length})
            </h3>
            <div className="space-y-4">
              {resource.periods.length ? (
                resource.periods.map((period, index) => (
                  <PeriodCard
                    key={period.id || index}
                    period={period}
                    primary={period === resource.primaryPeriod}
                  />
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                  Aucune période renseignée.
                </p>
              )}
            </div>
            <DetailedCalendar resource={resource} />
          </section>
          <section>
            <h3 className="drawer-title">
              <Code2 />
              Source JSON
            </h3>
            <details className="rounded-xl border border-slate-200 bg-slate-950 text-slate-100">
              <summary className="cursor-pointer p-4 text-xs font-black uppercase tracking-wider">
                Afficher le JSON complet
              </summary>
              <pre className="max-h-[32rem] overflow-auto border-t border-white/10 p-4 text-xs leading-relaxed">
                {JSON.stringify(resource.source, null, 2)}
              </pre>
            </details>
          </section>
        </div>
      </aside>
    </div>
  );
}
