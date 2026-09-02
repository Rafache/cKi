# Security policy

## Supported versions

Security fixes are applied to the latest state of `main` and the latest published container image.

## Reporting a vulnerability

Do not report vulnerabilities through a public issue or pull request.

Use GitHub private vulnerability reporting:

https://github.com/Rafache/cKi/security/advisories/new

If private reporting is unavailable, contact [@Rafache](https://github.com/Rafache) through GitHub before sharing sensitive details.

Include a short description and impact, reproduction steps, the affected version or image digest, and any suggested mitigation. Never include a real Abraxio token, production API response, personal data or financial data.

## Scope

The React client, token lifecycle, API normalization, Nginx proxy, Docker image, dependencies and GitHub workflows are in scope.

Important security properties:

- the repository and production bundle contain no token;
- the proxy exposes only `GET /api/abraxio/members` and forwards authorization only to Abraxio;
- the application never logs tokens or includes them in error messages;
- confidential resource and pricing data are not committed as fixtures or screenshots;
- production deployments use HTTPS and restrict access to the intended internal audience.

Browser `localStorage` is not encrypted. cKi must only be used on trusted devices, and users must log out after use.
