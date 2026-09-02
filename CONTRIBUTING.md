# Contributing

cKi is an internal directory for DTDD resources backed by the Abraxio API. Prefer small changes that improve behavior or maintainability without adding unnecessary dependencies, abstractions or data exposure.

## Setup

Requirements: Node.js `>=24 <25`, npm and Docker for the production image.

```bash
git clone https://github.com/Rafache/cKi.git
cd cKi
npm ci
npm run dev
```

## Development workflow

1. Keep each issue and pull request focused on one coherent objective.
2. Create a descriptive branch from the latest `main`.
3. Make the smallest change that solves the problem.
4. Run the full validation suite:

   ```bash
   npm run check
   ```

5. For proxy or container changes, also run `docker compose up --build` and verify the health check.
6. For UI changes, verify keyboard use and the relevant behavior on mobile and desktop.

## Code conventions

- Code, identifiers, tests, comments, JSDoc, issues and pull requests are written in English.
- User-facing application text remains French.
- Keep API normalization and business calculations in shared functions so tables, metrics and CSV exports use the same rules.
- Preserve keyboard behavior, focus handling and accessible names when changing interactive UI.
- Remove dead code before introducing a new abstraction.

## Data and security

- Never commit tokens, recorded production responses, CSV exports or screenshots containing personal or financial data.
- The Abraxio token must only be sent in the `Authorization` header through the restricted proxy route.
- A change to API fields must tolerate absent and nullable values.
- Changes to cost, TJM, period or classification rules require focused tests.
- Changes to `localStorage` must preserve the existing token lifecycle or use a new storage key.

## Commits

Use lightweight [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>: <description>
```

Allowed types are `feat`, `fix`, `refactor`, `test`, `ci`, `docs`, `style` and `chore`. Write the description in English, in imperative form, lowercase and without a trailing period.

Examples:

```text
feat: add quarterly cost filter
fix: ignore zero daily rates
ci: publish the nginx image to ghcr
```

## Pull requests

Use **Rebase and merge**. Clean temporary commits before merge, keep logical commits when they remain useful independently, and ensure CI is green. Remove all confidential information from screenshots and logs attached to issues or pull requests.

## Project map

```text
src/api/          Abraxio client and normalization
src/components/   UI components and interactions
src/lib/          filtering, budgeting and CSV rules
src/test/         shared test fixtures
nginx.conf        static delivery and restricted Abraxio proxy
Dockerfile        production image
```
