import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { buildMonthlyFullTimeEquivalentTrend } from '../lib/fullTimeEquivalentTrend';
import type { DtddResource, GroupByKey } from '../types';

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

const groupLabels: Record<Exclude<GroupByKey, ''>, string> = {
  classification: 'type',
  state: 'état',
  team: 'équipe',
  skill: 'compétence',
  supplier: 'fournisseur',
};

function niceMaximum(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => candidate >= normalized) ?? 10;
  return factor * magnitude;
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
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const trend = useMemo(
    () => buildMonthlyFullTimeEquivalentTrend(resources, budgetYear, quarter, groupBy),
    [resources, budgetYear, quarter, groupBy],
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
            <h2 className="font-black text-slate-900">Évolution mensuelle des ETP</h2>
          </div>
        </div>
      </div>
      {hasValues ? (
        <>
          <div
            ref={chartContainerRef}
            className="overflow-x-auto"
            role="region"
            aria-label="Graphique des ETP mensuels, défilement horizontal"
          >
            <svg
              width={chartWidth}
              height={chartHeight}
              role="img"
              aria-label="ETP internes positifs et ETP externes négatifs par mois"
              className="block"
            >
              <title>Évolution mensuelle des ETP internes et externes</title>
              <desc>
                Les barres internes sont affichées au-dessus de l’axe zéro et les barres externes en
                dessous. Les valeurs sont empilées lorsque le regroupement est actif.
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
                              <title>{`${point.label} · Internes · ${segment.label} : ${number(segment.internal)} ETP`}</title>
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
                              <title>{`${point.label} · Externes · ${segment.label} : ${number(segment.external)} ETP`}</title>
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
        <p className="p-6 text-sm text-slate-500">Aucune donnée ETP pour les filtres actifs.</p>
      )}
    </section>
  );
}
