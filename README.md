# cKi

Annuaire interne des ressources de la DTDD, alimenté par l’API Abraxio.

[Contribuer](CONTRIBUTING.md) · [Déploiement](DEPLOYMENT.md) · [Sécurité](SECURITY.md)

## Fonctionnalités

- filtrage strict des membres rattachés à la DTDD, quel que soit leur état ;
- distinction entre ressources internes, prestataires externes et ressources non classées ;
- recherche, filtres multivalués, périodes budgétaires, trimestres, regroupements, tri et pagination ;
- calcul des jours affectés, TJM moyens et coûts HT sur le périmètre filtré ;
- fiche détaillée avec périodes, organisation, feuilles de temps, coûts et source JSON ;
- export CSV UTF-8 des résultats filtrés.

## Architecture

Le client utilise React 19, TypeScript, Vite, Tailwind CSS et Zustand. La production peut utiliser une image Docker multi-stage avec Nginx ou Cloudflare Pages avec une Pages Function.

Le navigateur appelle uniquement `GET /api/abraxio/members`. Nginx ou la Pages Function transmet cette route à l’API Abraxio et refuse les autres méthodes sans exposer le token.

## Développement

Prérequis : Node.js `>=24 <25` et npm.

```bash
npm ci
npm run dev
```

Le serveur Vite affiche l’URL locale dans le terminal et fournit le même proxy Abraxio pour le développement.

Exécuter tous les contrôles avant une contribution :

```bash
npm run check
```

Une réponse API enregistrée localement peut être contrôlée sans être ajoutée au dépôt :

```bash
CKI_API_FIXTURE_PATH=/chemin/reponse.json npm test
```

## Docker

```bash
docker compose up --build
```

Le site est disponible sur <http://localhost:8080>. Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour l’image GHCR et les contraintes de production.

## Cloudflare Pages

Le dépôt inclut une Pages Function pour fournir le proxy Abraxio sur le même domaine que le site. Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour les réglages de build et les contrôles après déploiement.

## Sécurité et confidentialité

Chaque utilisateur saisit son propre token Abraxio. Il est envoyé exclusivement dans l’en-tête `Authorization` et conservé dans le `localStorage` jusqu’à la déconnexion.

Aucun token, export, enregistrement de réponse API ou capture contenant des données réelles ne doit être versionné. Les informations de ressources et de tarification sont confidentielles. cKi doit être utilisé uniquement sur un poste de confiance et derrière un accès interne en production.

## Licence

Projet distribué sous [licence MIT](LICENSE).
