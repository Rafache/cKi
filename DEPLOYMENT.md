# Deployment

cKi can be delivered either as an Nginx container or through Cloudflare Pages. In both cases, the browser calls Abraxio through a restricted same-origin proxy:

- `nginx.conf` provides the proxy in the container;
- `functions/api/abraxio/members.ts` provides the equivalent Cloudflare Pages Function.

The canonical CI/CD workflow is `.github/workflows/ci.yml`:

- pull requests run formatting, lint, type checks, tests, the Vite build and the Docker build;
- pushes to `main` run the same checks and publish the container;
- published images are tagged `latest` and with the exact Git commit SHA;
- GitHub Actions use immutable commit SHAs and minimal permissions.

Published image:

```text
ghcr.io/rafache/cki
```

Run the production image locally:

```bash
docker pull ghcr.io/rafache/cki:latest
docker run --rm -p 8080:80 ghcr.io/rafache/cki:latest
```

The site is then available at <http://localhost:8080>.

## Cloudflare Pages

The existing `cki` project uses Direct Upload. Dashboard drag-and-drop deployments contain only static assets and do not compile Pages Functions. Deploy it from the repository root with Wrangler so the root `functions` directory is included:

```bash
npm run deploy:pages
```

The predeploy script runs the complete quality suite and rebuilds `dist`. Wrangler then deploys the static bundle and compiles `functions/api/abraxio/members.ts` as `GET /api/abraxio/members`. The `functions` directory must remain at the repository root. No Abraxio token is configured at build time.

Authenticate the local Wrangler installation with `npx wrangler login` when requested. Because Cloudflare does not allow an existing Direct Upload project to be converted to Git integration, future automatic deployments require either a new Git-integrated Pages project or a scoped Cloudflare API token configured in GitHub Actions.

After deployment, verify the restricted route without using a real token:

```bash
curl -i https://<project>.pages.dev/api/abraxio/members
curl -i -X POST https://<project>.pages.dev/api/abraxio/members
```

The first request must return `401`, the second `405`, and both must include `Cache-Control: no-store`.

## Runtime requirements

- outbound HTTPS access to `https://app.abraxio.com`;
- no token or Abraxio credential configured on the server;
- TLS termination in front of the container in production, or Cloudflare Pages HTTPS;
- access restricted to the intended internal audience.

Each user provides an individual Abraxio token in the browser. The token is stored in that browser's `localStorage` until logout and forwarded only to `GET /api/abraxio/members`.

The GitHub workflow uses the repository `GITHUB_TOKEN` with `packages: write`; no custom deployment secret is required for GHCR publication. A target server rollout remains environment-specific and is intentionally not automated until its host and authentication method are defined.
