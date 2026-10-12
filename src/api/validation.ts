type Shape = 'string' | 'number' | 'boolean' | { [key: string]: Shape } | readonly [Shape];

const label: Shape = { label: 'string' };
const scheduleItem: Shape = {
  year: 'number',
  month: 'number',
  days: 'number',
  off: 'number',
  tax: 'number',
  assigned: { days: 'number' },
  price: { net: 'number', total: 'number' },
};
const memberShape: Shape = {
  uid: 'string',
  name: 'string',
  firstName: 'string',
  lastName: 'string',
  email: 'string',
  jobTitle: 'string',
  readonly: 'boolean',
  state: { label: 'string' },
  team: { name: 'string', managed: 'boolean', parent: { name: 'string' } },
  timesheets: {
    enabled: 'boolean',
    autoValidated: 'boolean',
    isDefaultConfiguration: 'boolean',
    start: 'string',
    end: 'string',
  },
  periods: [
    {
      start: 'string',
      end: 'string',
      type: label,
      skill: { label: 'string', code: 'string' },
      supplier: { name: 'string' },
      calendar: {},
      workWeek: ['number'],
      assignments: { enabled: 'boolean' },
      pricing: { enabled: 'boolean' },
      capacity: {
        enabled: 'boolean',
        defaultCapacity: 'number',
        computationMode: label,
        schedule: { items: [scheduleItem] },
      },
    },
  ],
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matches(value: unknown, shape: Shape): boolean {
  if (value === undefined || value === null) return true;
  if (typeof shape === 'string') {
    return typeof value === shape && (shape !== 'number' || Number.isFinite(value));
  }
  if (Array.isArray(shape)) {
    return Array.isArray(value) && value.every((item) => item != null && matches(item, shape[0]));
  }
  return (
    isRecord(value) && Object.entries(shape).every(([key, child]) => matches(value[key], child))
  );
}

export function isValidMember(value: unknown): boolean {
  return isRecord(value) && matches(value, memberShape);
}
