import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useAppStore } from './store';
import { createSnapshot } from './lib/snapshot';
import { mapDtddResources } from './api/mapper';
import { member } from './test/fixtures';

vi.mock('./lib/snapshotStorage', () => ({
  readSnapshot: vi.fn().mockResolvedValue(null),
  writeSnapshot: vi.fn().mockResolvedValue(undefined),
  deleteSnapshot: vi.fn().mockResolvedValue(undefined),
}));

const snapshot = createSnapshot({ value: [member()] }, '2026-10-12T08:00:00.000Z');

function chooseFile(contents: string) {
  const file = new File([contents], 'backup.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(contents) });
  fireEvent.change(screen.getByLabelText('Fichier de données Abraxio'), {
    target: { files: [file] },
  });
}

describe('local data UI', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      token: null,
      snapshot,
      resources: mapDtddResources(snapshot.payload.value),
      source: 'local',
      isRestoring: false,
      isLoading: false,
      error: null,
      warning: null,
      importRevision: 0,
      lastUpdatedAt: snapshot.fetchedAt,
    });
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true;
      }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = false;
      }),
    });
  });
  afterEach(cleanup);

  it('shows saved resources and full retrieval date without auth or API access', async () => {
    render(<App />);
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText(/Récupération : 12\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exporter les données brutes' })).toBeEnabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps an empty snapshot accessible without a token', async () => {
    useAppStore.setState({
      snapshot: createSnapshot({ value: [] }, snapshot.fetchedAt),
      resources: [],
    });
    render(<App />);
    expect(
      await screen.findByRole('button', { name: 'Exporter les données brutes' }),
    ).toBeEnabled();
    expect(screen.queryByLabelText('Token Abraxio')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('opens a dismissible auth dialog while keeping local data visible', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Actualiser depuis Abraxio' }));
    expect(screen.getByLabelText('Token Abraxio')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fermer la connexion' }));
    expect(screen.queryByLabelText('Token Abraxio')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('previews an import, replaces data after confirmation and resets filters', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);
    fireEvent.change(screen.getByPlaceholderText('Nom, e-mail, poste…'), {
      target: { value: 'hidden' },
    });
    chooseFile(
      JSON.stringify({
        value: [member({ name: 'Imported resource' }), member({ id: 2, team: null })],
      }),
    );
    expect(await screen.findByText('Imported resource')).toBeInTheDocument();
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('2 membre(s), dont 1 ressource(s) DTDD'),
    );
    expect(screen.getByPlaceholderText('Nom, e-mail, poste…')).toHaveValue('');
    expect(screen.getByText(/Date de récupération inconnue/)).toBeInTheDocument();
    expect(screen.getByText(/^Import :/)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves data when import confirmation is declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    chooseFile(JSON.stringify({ value: [] }));
    await waitFor(() => expect(window.confirm).toHaveBeenCalledOnce());
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(useAppStore.getState().snapshot).toEqual(snapshot);
  });

  it('preserves current data after an invalid file', async () => {
    render(<App />);
    chooseFile('{');
    expect(await screen.findByRole('alert')).toHaveTextContent('JSON valide');
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
  });

  it('imports from the welcome screen without a token', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    useAppStore.setState({ snapshot: null, resources: [] });
    render(<App />);
    expect(screen.getByRole('button', { name: 'Importer des données' })).toBeEnabled();
    chooseFile(JSON.stringify(snapshot));
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refreshes with the saved token on explicit click when no snapshot exists', async () => {
    useAppStore.setState({ snapshot: null, resources: [], token: 'secret-test' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(snapshot.payload))),
    );
    render(<App />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Actualiser depuis Abraxio' }));
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('retains local data after logout and erases it only after confirmation', async () => {
    useAppStore.setState({ token: 'secret-test' });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Se déconnecter d’Abraxio' }));
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Effacer les données locales' }));
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    confirm.mockReturnValue(true);
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Effacer les données locales' })),
    );
    expect(screen.getByRole('heading', { name: 'Bienvenue sur cKi' })).toBeInTheDocument();
  });
});
