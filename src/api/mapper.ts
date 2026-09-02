import type {
  AbraxioMember,
  AbraxioPeriod,
  DtddResource,
  ResourceClassification,
  ResourcePeriod,
} from '../types';

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const identifier = (value: unknown): string =>
  typeof value === 'number' || typeof value === 'string' ? String(value) : '';
const nullableBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;
const nullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

function timestamp(date: string | null, fallback: number): number {
  if (!date) return fallback;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function normalizePeriod(period: AbraxioPeriod): ResourcePeriod {
  const schedule = Array.isArray(period.capacity?.schedule?.items)
    ? period.capacity.schedule.items
        .map((item) => ({
          year: nullableNumber(item.year),
          month: nullableNumber(item.month),
          days: nullableNumber(item.days),
          off: nullableNumber(item.off),
          tax: nullableNumber(item.tax),
          assignedDays: nullableNumber(item.assigned?.days),
          priceNet: nullableNumber(item.price?.net),
          priceTotal: nullableNumber(item.price?.total),
          priceInherited: false,
        }))
        .sort((a, b) => (a.year ?? 0) * 12 + (a.month ?? 0) - ((b.year ?? 0) * 12 + (b.month ?? 0)))
    : [];
  let defaultPriceNet: number | null = null;
  let defaultPriceTotal: number | null = null;
  for (const item of schedule) {
    const hasExplicitPrice = item.priceNet !== null && item.priceNet > 0;
    if (item.priceNet !== null && item.priceNet > 0) defaultPriceNet = item.priceNet;
    else item.priceNet = defaultPriceNet;
    if (item.priceTotal !== null && item.priceTotal > 0) defaultPriceTotal = item.priceTotal;
    else item.priceTotal = defaultPriceTotal;
    item.priceInherited = !hasExplicitPrice && defaultPriceNet !== null;
  }

  return {
    id: identifier(period.id),
    start: text(period.start) || null,
    end: text(period.end) || null,
    type: text(period.type?.label),
    skillCode: text(period.skill?.code),
    skill: text(period.skill?.label),
    supplierId: identifier(period.supplier?.id),
    supplier: text(period.supplier?.name),
    calendarId: identifier(period.calendar?.id),
    workWeek: Array.isArray(period.workWeek)
      ? period.workWeek.filter(
          (day): day is number => typeof day === 'number' && Number.isFinite(day),
        )
      : [],
    assignmentsEnabled: nullableBoolean(period.assignments?.enabled),
    pricingEnabled: nullableBoolean(period.pricing?.enabled),
    payroll: period.payroll ?? null,
    capacityId: identifier(period.capacity?.id),
    capacityEnabled: nullableBoolean(period.capacity?.enabled),
    defaultCapacity: nullableNumber(period.capacity?.defaultCapacity),
    computationMode: text(period.capacity?.computationMode?.label),
    schedule,
  };
}

export function selectPrimaryPeriod(
  periods: ResourcePeriod[],
  now = new Date(),
): ResourcePeriod | null {
  if (periods.length === 0) return null;
  const instant = now.getTime();
  const byMostRecentStart = [...periods].sort(
    (a, b) =>
      timestamp(b.start, Number.NEGATIVE_INFINITY) - timestamp(a.start, Number.NEGATIVE_INFINITY),
  );
  const current = byMostRecentStart.find(
    (period) =>
      timestamp(period.start, Number.NEGATIVE_INFINITY) <= instant &&
      timestamp(period.end, Number.POSITIVE_INFINITY) >= instant,
  );
  return current ?? byMostRecentStart[0];
}

export function classifyPeriod(period: ResourcePeriod | null): ResourceClassification {
  if (period?.type === 'Interne') return 'internal';
  if (period?.type === 'Prestataire externe') return 'external';
  return 'unknown';
}

export function getPeriodFinancials(period: ResourcePeriod | null): {
  dailyRate: number | null;
  totalCost: number | null;
} {
  if (!period) return { dailyRate: null, totalCost: null };
  const pricedItems = period.schedule.filter((item) => item.priceNet !== null);
  if (pricedItems.length === 0) return { dailyRate: null, totalCost: null };

  const assignedDays = pricedItems.reduce((total, item) => total + (item.assignedDays ?? 0), 0);
  const totalCost = pricedItems.reduce(
    (total, item) => total + (item.assignedDays ?? 0) * (item.priceNet ?? 0),
    0,
  );
  const lastPositiveRate =
    [...pricedItems].reverse().find((item) => (item.priceNet ?? 0) > 0)?.priceNet ?? null;
  const dailyRate = assignedDays > 0 ? totalCost / assignedDays : lastPositiveRate;

  return { dailyRate, totalCost };
}

export function getPeriodAssignedDays(period: ResourcePeriod | null): number | null {
  if (!period || !period.schedule.some((item) => item.assignedDays !== null)) return null;
  return period.schedule.reduce((total, item) => total + (item.assignedDays ?? 0), 0);
}

export function mapMember(member: AbraxioMember, now = new Date()): DtddResource {
  const periods = Array.isArray(member.periods) ? member.periods.map(normalizePeriod) : [];
  const primaryPeriod = selectPrimaryPeriod(periods, now);
  const financials = getPeriodFinancials(primaryPeriod);
  const firstName = text(member.firstName);
  const lastName = text(member.lastName);
  return {
    id: identifier(member.id),
    uid: text(member.uid),
    name: text(member.name) || [firstName, lastName].filter(Boolean).join(' ') || 'Sans nom',
    firstName,
    lastName,
    email: text(member.email),
    jobTitle: text(member.jobTitle),
    readonly: nullableBoolean(member.readonly),
    stateId: identifier(member.state?.id),
    state: text(member.state?.label) || 'Non renseigné',
    teamId: identifier(member.team?.id),
    team: text(member.team?.name) || 'Non renseignée',
    teamManaged: nullableBoolean(member.team?.managed),
    parentTeamId: identifier(member.team?.parent?.id),
    parentTeam: text(member.team?.parent?.name),
    timesheets: {
      enabled: nullableBoolean(member.timesheets?.enabled),
      autoValidated: nullableBoolean(member.timesheets?.autoValidated),
      isDefaultConfiguration: nullableBoolean(member.timesheets?.isDefaultConfiguration),
      start: text(member.timesheets?.start) || null,
      end: text(member.timesheets?.end) || null,
    },
    periods,
    primaryPeriod,
    classification: classifyPeriod(primaryPeriod),
    assignedDays: getPeriodAssignedDays(primaryPeriod),
    ...financials,
    source: member,
  };
}

export function mapDtddResources(members: AbraxioMember[], now = new Date()): DtddResource[] {
  return members
    .filter((member) => text(member.team?.parent?.name) === 'DTDD')
    .map((member) => mapMember(member, now))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}
