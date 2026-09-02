import type { ResourceClassification } from '../types';

const labels: Record<ResourceClassification, string> = {
  internal: 'Interne',
  external: 'Prestataire externe',
  unknown: 'Non renseigné',
};
const styles: Record<ResourceClassification, string> = {
  internal: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  external: 'bg-violet-50 text-violet-700 ring-violet-600/15',
  unknown: 'bg-amber-50 text-amber-700 ring-amber-600/15',
};

export function ClassificationBadge({ value }: { value: ResourceClassification }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ring-1 ring-inset ${styles[value]}`}
    >
      {labels[value]}
    </span>
  );
}
