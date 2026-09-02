# Deployment

cKi is delivered as an Nginx container because the browser must call Abraxio through the restricted same-origin proxy defined in `nginx.conf`. A static-only host such as Cloudflare Pages is not sufficient without an equivalent server-side proxy.

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

## Runtime requirements

- outbound HTTPS access to `https://app.abraxio.com`;
- no token or Abraxio credential configured on the server;
- TLS termination in front of the container in production;
- access restricted to the intended internal audience.

Each user provides an individual Abraxio token in the browser. The token is stored in that browser's `localStorage` until logout and forwarded only to `GET /api/abraxio/members`.

The GitHub workflow uses the repository `GITHUB_TOKEN` with `packages: write`; no custom deployment secret is required for GHCR publication. A target server rollout remains environment-specific and is intentionally not automated until its host and authentication method are defined.
