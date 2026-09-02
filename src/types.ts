export type ResourceClassification = 'internal' | 'external' | 'unknown';

export interface AbraxioLabel {
  id?: number | string | null;
  label?: string | null;
}

export interface AbraxioScheduleItem {
  year?: number | null;
  month?: number | null;
  days?: number | null;
  off?: number | null;
  tax?: number | null;
  assigned?: { days?: number | null } | null;
  price?: { net?: number | null; total?: number | null } | null;
}

export interface AbraxioPeriod {
  id?: number | string | null;
  start?: string | null;
  end?: string | null;
  type?: AbraxioLabel | null;
  skill?: AbraxioLabel & { code?: string | null };
  supplier?: { id?: number | string | null; name?: string | null } | null;
  calendar?: { id?: number | string | null } | null;
  workWeek?: number[] | null;
  assignments?: { enabled?: boolean | null } | null;
  pricing?: { enabled?: boolean | null } | null;
  payroll?: unknown;
  capacity?: {
    id?: number | string | null;
    enabled?: boolean | null;
    defaultCapacity?: number | null;
    computationMode?: AbraxioLabel | null;
    schedule?: { items?: AbraxioScheduleItem[] | null } | null;
  } | null;
}

export interface AbraxioMember {
  id?: number | string | null;
  uid?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  readonly?: boolean | null;
  state?: AbraxioLabel | null;
  team?: {
    id?: number | string | null;
    name?: string | null;
    managed?: boolean | null;
    parent?: { id?: number | string | null; name?: string | null } | null;
  } | null;
  timesheets?: {
    enabled?: boolean | null;
    autoValidated?: boolean | null;
    isDefaultConfiguration?: boolean | null;
    start?: string | null;
    end?: string | null;
  } | null;
  periods?: AbraxioPeriod[] | null;
}

export interface AbraxioMembersResponse {
  value: AbraxioMember[];
}

export interface CapacityScheduleItem {
  year: number | null;
  month: number | null;
  days: number | null;
  off: number | null;
  tax: number | null;
  assignedDays: number | null;
  priceNet: number | null;
  priceTotal: number | null;
  priceInherited: boolean;
}

export interface ResourcePeriod {
  id: string;
  start: string | null;
  end: string | null;
  type: string;
  skillCode: string;
  skill: string;
  supplierId: string;
  supplier: string;
  calendarId: string;
  workWeek: number[];
  assignmentsEnabled: boolean | null;
  pricingEnabled: boolean | null;
  payroll: unknown;
  capacityId: string;
  capacityEnabled: boolean | null;
  defaultCapacity: number | null;
  computationMode: string;
  schedule: CapacityScheduleItem[];
}

export interface TimesheetSettings {
  enabled: boolean | null;
  autoValidated: boolean | null;
  isDefaultConfiguration: boolean | null;
  start: string | null;
  end: string | null;
}

export interface DtddResource {
  id: string;
  uid: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  readonly: boolean | null;
  stateId: string;
  state: string;
  teamId: string;
  team: string;
  teamManaged: boolean | null;
  parentTeamId: string;
  parentTeam: string;
  timesheets: TimesheetSettings;
  periods: ResourcePeriod[];
  primaryPeriod: ResourcePeriod | null;
  classification: ResourceClassification;
  assignedDays: number | null;
  dailyRate: number | null;
  totalCost: number | null;
  source: AbraxioMember;
}

export interface ConsolidatedScheduleRow {
  key: string;
  year: number;
  month: number;
  item: CapacityScheduleItem;
  period: ResourcePeriod;
}

export interface BudgetYearSummary {
  startYear: number;
  assignedDays: number;
  pricedAssignedDays: number;
  workedDays: number;
  averageDailyRate: number | null;
  totalCost: number;
}

export interface ResourceFilters {
  search: string;
  classifications: ResourceClassification[];
  states: string[];
  teams: string[];
  skills: string[];
  suppliers: string[];
  budgetYear: number | null;
  quarter: string | null;
  groupBy: GroupByKey;
}

export type GroupByKey = '' | 'classification' | 'state' | 'team' | 'skill' | 'supplier';

export type SortKey =
  | 'name'
  | 'email'
  | 'jobTitle'
  | 'team'
  | 'state'
  | 'classification'
  | 'skill'
  | 'supplier'
  | 'periodStart'
  | 'periodEnd'
  | 'assignedDays'
  | 'dailyRate'
  | 'totalCost';

export type SortDirection = 'asc' | 'desc';
