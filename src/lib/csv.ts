import type { DtddResource } from '../types';

const classificationLabels = {
  internal: 'Interne',
  external: 'Prestataire externe',
  unknown: 'Non renseigné',
} as const;

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function resourcesToCsv(resources: DtddResource[]): string {
  const headers = [
    'Nom',
    'E-mail',
    'Poste',
    'Équipe',
    'État',
    'Type',
    'Compétence',
    'Fournisseur',
    'Début de période',
    'Fin de période',
    'Jours affectés',
    'TJM HT',
    'Coût total HT',
  ];
  const rows = resources.map((resource) => [
    resource.name,
    resource.email,
    resource.jobTitle,
    resource.team,
    resource.state,
    classificationLabels[resource.classification],
    resource.primaryPeriod?.skill ?? '',
    resource.primaryPeriod?.supplier ?? '',
    resource.primaryPeriod?.start ?? '',
    resource.primaryPeriod?.end ?? '',
    resource.assignedDays ?? '',
    resource.dailyRate ?? '',
    resource.totalCost ?? '',
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(';')).join('\r\n')}`;
}

export function downloadResourcesCsv(resources: DtddResource[]): void {
  const blob = new Blob([resourcesToCsv(resources)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cki-ressources-dtdd-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
