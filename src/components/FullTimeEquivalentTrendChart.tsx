import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { buildMonthlyFullTimeEquivalentTrend } from '../lib/fullTimeEquivalentTrend';
import type { DtddResource, GroupByKey, TrendGranularity, TrendMetric } from '../types';

const GROUP_COLORS = [
  '#0f1ea0',
  '#d97706',
  '#7c3aed',
  '#0f766e',
  '#be185d',
  '#2563eb',
  '#a16207',
  '#6d28d9',
  '#047857',
  '#db2777',
  '#0369a1',
  '#c2410c',
];
const INTERNAL_COLOR = '#0f1ea0';
const EXTERNAL_COLOR = '#7c3aed';

const number = (value: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value);

function formatMetricValue(value: number, metric: TrendMetric): string {
  if (metric === 'headcount') {
    return `${number(value)} ${value > 1 ? 'personnes' : 'personne'}`;
  }
  return `${number(value)} ETP`;
}

function getPeriodAdjective(granularity: TrendGranularity): string {
  return granularity === 'quarter'
    ? 'trimestrielle'
    : granularity === 'year'
      ? 'annuelle'
      : 'mensuelle';
}

function getPeriodNoun(granularity: TrendGranularity): string {
  return granularity === 'quarter' ? 'trimestre' : granularity === 'year' ? 'année' : 'mois';
}

function getTrendChartTitle(metric: TrendMetric, granularity: TrendGranularity): string {
  const metricLabel = metric === 'headcount' ? 'du nombre de personnes' : 'des ETP';
  return `Évolution ${getPeriodAdjective(granularity)} ${metricLabel}`;
}

const groupLabels: Record<Exclude<GroupByKey, ''>, string> = {
  classification: 'type',
  state: 'état',
  team: 'équipe',
  skill: 'compétence',
  supplier: 'fournisseur',
};

function niceMaximum(value: number, integerSteps = false): number {
  if (value <= 0) return integerSteps ? 2 : 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const factors = integerSteps && magnitude >= 1 ? [2, 4, 6, 8, 10] : [1, 2, 2.5, 5, 10];
  const factor = factors.find((candidate) => candidate >= normalized) ?? 10;
  return Math.max(integerSteps ? 2 : 1, factor * magnitude);
}

export function FullTimeEquivalentTrendChart({
  resources,
  budgetYear,
  quarter,
  groupBy,
}: {
  resources: DtddResource[];
  budgetYear: number | null;
  quarter: string | null;
  groupBy: GroupByKey;
}) {
  const [metric, setMetric] = useState<TrendMetric>('fte');
  const [granularity, setGranularity] = useState<TrendGranularity>('month');
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const trend = useMemo(
    () =>
      buildMonthlyFullTimeEquivalentTrend(
        resources,
        budgetYear,
        quarter,
        groupBy,
        metric,
        granularity,
      ),
    [resources, budgetYear, quarter, groupBy, metric, granularity],
  );
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const hasValues = trend.points.some(
    (point) => point.totalInternal > 0 || point.totalExternal > 0,
  );
  const maximum = niceMaximum(
    Math.max(0, ...trend.points.flatMap((point) => [point.totalInternal, point.totalExternal])),
    metric === 'headcount',
  );
  const colors = new Map(
    trend.seriesLabels.map((label, index) => [
      label,
      groupBy
        ? GROUP_COLORS[index % GROUP_COLORS.length]
        : label === 'Externes'
          ? EXTERNAL_COLOR
          : INTERNAL_COLOR,
    ]),
  );

  const chartWidth = Math.max(760, trend.points.length * 64 + 76, containerWidth);
  const chartHeight = 380;
  const left = 54;
  const right = 18;
  const top = 24;
  const bottom = 48;
  const plotWidth = chartWidth - left - right;
  const plotHeight = chartHeight - top - bottom;
  const zeroY = top + plotHeight / 2;
  const halfHeight = plotHeight / 2;
  const monthWidth = trend.points.length > 0 ? plotWidth / trend.points.length : plotWidth;
  const barWidth = Math.min(36, monthWidth * 0.58);
  const scaledHeight = (value: number) => (value / maximum) * (halfHeight - 12);
  const ticks = [maximum, maximum / 2, 0, -maximum / 2, -maximum];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-brand">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-black text-slate-900">{getTrendChartTitle(metric, granularity)}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-semibold"
            role="group"
            aria-label="Périodicité de l’évolution"
          >
            <button
              type="button"
              onClick={() => setGranularity('month')}
              aria-pressed={granularity === 'month'}
              className={`rounded-md px-2.5 py-1 transition ${
                granularity === 'month'
                  ? 'bg-white font-bold text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mois
            </button>
            <button
              type="button"
              onClick={() => setGranularity('quarter')}
              aria-pressed={granularity === 'quarter'}
              className={`rounded-md px-2.5 py-1 transition ${
                granularity === 'quarter'
                  ? 'bg-white font-bold text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trimestre
            </button>
            <button
              type="button"
              onClick={() => setGranularity('year')}
              aria-pressed={granularity === 'year'}
              className={`rounded-md px-2.5 py-1 transition ${
                granularity === 'year'
                  ? 'bg-white font-bold text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Année
            </button>
          </div>
          <div
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-semibold"
            role="group"
            aria-label="Métrique de l’évolution"
          >
            <button
              type="button"
              onClick={() => setMetric('fte')}
              aria-pressed={metric === 'fte'}
              className={`rounded-md px-2.5 py-1 transition ${
                metric === 'fte'
                  ? 'bg-white font-bold text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ETP
            </button>
            <button
              type="button"
              onClick={() => setMetric('headcount')}
              aria-pressed={metric === 'headcount'}
              className={`rounded-md px-2.5 py-1 transition ${
                metric === 'headcount'
                  ? 'bg-white font-bold text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nombre de personnes
            </button>
          </div>
        </div>
      </div>
      {hasValues ? (
        <>
          <div
            ref={chartContainerRef}
            className="overflow-x-auto"
            role="region"
            aria-label={`Graphique ${metric === 'headcount' ? 'du nombre de personnes' : 'des ETP'} ${granularity === 'quarter' ? 'trimestriel' : granularity === 'year' ? 'annuel' : 'mensuel'}, défilement horizontal`}
          >
            <svg
              width={chartWidth}
              height={chartHeight}
              role="img"
              aria-label={
                metric === 'headcount'
                  ? `Personnes internes positives et personnes externes négatives par ${getPeriodNoun(granularity)}`
                  : `ETP internes positifs et ETP externes négatifs par ${getPeriodNoun(granularity)}`
              }
              className="block"
            >
              <title>
                {`Évolution ${getPeriodAdjective(granularity)} ${metric === 'headcount' ? 'du nombre de personnes internes et externes' : 'des ETP internes et externes'}`}
              </title>
              <desc>
                {metric === 'headcount'
                  ? 'Les barres internes représentent le nombre de personnes au-dessus de l’axe zéro et les barres externes en dessous. Les valeurs sont empilées lorsque le regroupement est actif.'
                  : 'Les barres internes sont affichées au-dessus de l’axe zéro et les barres externes en dessous. Les valeurs sont empilées lorsque le regroupement est actif.'}
              </desc>
              {ticks.map((tick) => {
                const y = zeroY - (tick / maximum) * (halfHeight - 12);
                return (
                  <g key={tick}>
                    <line
                      x1={left}
                      x2={chartWidth - right}
                      y1={y}
                      y2={y}
                      stroke={tick === 0 ? '#334155' : '#e2e8f0'}
                      strokeWidth={tick === 0 ? 1.5 : 1}
                    />
                    <text
                      x={left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px] font-semibold"
                    >
                      {number(tick)}
                    </text>
                  </g>
                );
              })}
              <text x={left} y={14} className="fill-brand text-[10px] font-black uppercase">
                Internes
              </text>
              <text
                x={left}
                y={chartHeight - 6}
                className="fill-violet-700 text-[10px] font-black uppercase"
              >
                Externes
              </text>
              {trend.points.map((point, pointIndex) => {
                const centerX = left + monthWidth * pointIndex + monthWidth / 2;
                let internalOffset = 0;
                let externalOffset = 0;
                return (
                  <g key={point.key}>
                    {point.segments.map((segment) => {
                      const internalHeight = scaledHeight(segment.internal);
                      const externalHeight = scaledHeight(segment.external);
                      const internalY = zeroY - scaledHeight(internalOffset) - internalHeight;
                      const externalY = zeroY + scaledHeight(externalOffset);
                      internalOffset += segment.internal;
                      externalOffset += segment.external;
                      return (
                        <g key={segment.label}>
                          {segment.internal > 0 && (
                            <rect
                              x={centerX - barWidth / 2}
                              y={internalY}
                              width={barWidth}
                              height={internalHeight}
                              fill={colors.get(segment.label) ?? INTERNAL_COLOR}
                              stroke="#ffffff"
                              strokeWidth="0.75"
                            >
                              <title>{`${point.label} · Internes · ${segment.label} : ${formatMetricValue(segment.internal, metric)}`}</title>
                            </rect>
                          )}
                          {segment.external > 0 && (
                            <rect
                              x={centerX - barWidth / 2}
                              y={externalY}
                              width={barWidth}
                              height={externalHeight}
                              fill={colors.get(segment.label) ?? EXTERNAL_COLOR}
                              fillOpacity={groupBy ? 0.68 : 0.86}
                              stroke="#ffffff"
                              strokeWidth="0.75"
                            >
                              <title>{`${point.label} · Externes · ${segment.label} : ${formatMetricValue(segment.external, metric)}`}</title>
                            </rect>
                          )}
                        </g>
                      );
                    })}
                    <text
                      x={centerX}
                      y={chartHeight - 25}
                      textAnchor="middle"
                      className="fill-slate-500 text-[10px] font-semibold"
                    >
                      {point.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div
            className="overflow-x-auto border-t border-slate-100"
            role="region"
            aria-label="Légende du graphique, défilement horizontal"
          >
            <div className="flex min-w-max items-center gap-4 px-4 py-2 text-xs font-semibold text-slate-600">
              {trend.seriesLabels.map((label) => (
                <span key={label} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className="h-2.5 w-2.5 rounded-sm border border-black/10"
                    style={{ backgroundColor: colors.get(label) }}
                  />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
            {groupBy
              ? `Barres empilées par ${groupLabels[groupBy]}`
              : 'Survolez une barre pour afficher sa valeur exacte'}
          </div>
        </>
      ) : (
        <p className="p-6 text-sm text-slate-500">
          {metric === 'headcount'
            ? 'Aucune personne pour les filtres actifs.'
            : 'Aucune donnée ETP pour les filtres actifs.'}
        </p>
      )}
    </section>
  );
}
