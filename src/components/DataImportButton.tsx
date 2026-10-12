import { useRef, useState, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { mapDtddResources } from '../api/mapper';
import { formatSnapshotDate, parseSnapshotFile } from '../lib/snapshot';
import { useAppStore } from '../store';

export function DataImportButton({ className }: { className: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importSnapshot = useAppStore((state) => state.importSnapshot);

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setIsReading(true);
    setError(null);
    try {
      const snapshot = parseSnapshotFile(await file.text());
      const count = mapDtddResources(snapshot.payload.value).length;
      const accepted = window.confirm(
        `Importer ${snapshot.payload.value.length} membre(s), dont ${count} ressource(s) DTDD ?\nRécupération : ${formatSnapshotDate(snapshot.fetchedAt)}\nCette opération remplace les données locales actuelles.`,
      );
      if (accepted) await importSnapshot(snapshot);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Impossible de lire le fichier JSON.');
    } finally {
      setIsReading(false);
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Fichier de données Abraxio"
        onChange={(event) => void importFile(event)}
      />
      <button
        type="button"
        className={className}
        onClick={() => input.current?.click()}
        disabled={isReading}
      >
        <Upload className="h-4 w-4" />
        {isReading ? 'Lecture du fichier…' : 'Importer des données'}
      </button>
      {error && (
        <p role="alert" className="mt-2 max-w-sm text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
