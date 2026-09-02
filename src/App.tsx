import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { FiltersBar } from './components/FiltersBar';
import { Header } from './components/Header';
import { GroupedCostsTable } from './components/GroupedCostsTable';
import { MetricsStrip } from './components/MetricsStrip';
import { ResourceDrawer } from './components/ResourceDrawer';
import { ResourcesTable } from './components/ResourcesTable';
import { downloadResourcesCsv } from './lib/csv';
import { scopeResourcesToBudgetYear, scopeResourcesToQuarter } from './lib/budget';
import { EMPTY_FILTERS, filterResources, sortResources } from './lib/resources';
import { useAppStore } from './store';
import type { DtddResource, ResourceFilters, SortDirection, SortKey } from './types';

export default function App() {
  const { token, resources, isLoading, error, loadResources, clearError } = useAppStore();
  const [filters, setFilters] = useState<ResourceFilters>({ ...EMPTY_FILTERS });
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selected, setSelected] = useState<DtddResource | null>(null);

  useEffect(() => {
    if (token && resources.length === 0) void loadResources();
  }, [token, resources.length, loadResources]);
  const filtered = useMemo(
    () =>
      sortResources(
        scopeResourcesToQuarter(
          scopeResourcesToBudgetYear(filterResources(resources, filters), filters.budgetYear),
          filters.quarter,
        ),
        sortKey,
        sortDirection,
      ),
    [resources, filters, sortKey, sortDirection],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const changeSort = (key: SortKey) => {
    if (key === sortKey) setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  const closeDrawer = useCallback(() => setSelected(null), []);

  if (!token) return <AuthModal />;
  return (
    <div className="min-h-screen bg-bg text-slate-700">
      <Header visibleCount={filtered.length} onExport={() => downloadResourcesCsv(filtered)} />
      <main className="mx-auto max-w-screen-2xl space-y-4 p-4 sm:p-6">
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => void loadResources()}
                className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-black text-white"
              >
                Réessayer
              </button>
              <button onClick={clearError} className="px-2 text-xs">
                Fermer
              </button>
            </div>
          </div>
        )}
        {isLoading && resources.length === 0 ? (
          <div className="grid min-h-[55vh] place-items-center">
            <div className="text-center">
              <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-brand" />
              <p className="mt-3 text-sm font-bold text-slate-500">
                Chargement des ressources DTDD…
              </p>
            </div>
          </div>
        ) : (
          <>
            <MetricsStrip
              resources={filtered}
              total={resources.length}
              budgetYear={filters.budgetYear}
              quarter={filters.quarter}
            />
            <FiltersBar
              resources={resources}
              filters={filters}
              onChange={(nextFilters) => {
                setFilters(nextFilters);
                setPage(1);
              }}
            />
            {filters.groupBy && (
              <GroupedCostsTable resources={filtered} groupBy={filters.groupBy} />
            )}
            <ResourcesTable
              resources={paginated}
              filteredResources={filtered}
              total={filtered.length}
              page={safePage}
              pageSize={pageSize}
              sortKey={sortKey}
              sortDirection={sortDirection}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              onSort={changeSort}
              onSelect={setSelected}
            />
          </>
        )}
      </main>
      <footer className="mx-auto max-w-screen-2xl px-6 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} cKi · Données issues d’Abraxio
      </footer>
      <ResourceDrawer resource={selected} onClose={closeDrawer} />
    </div>
  );
}
