# cKi

Annuaire interne des ressources de la DTDD, alimenté par l’API Abraxio.

[Contribuer](CONTRIBUTING.md) · [Déploiement](DEPLOYMENT.md) · [Sécurité](SECURITY.md)

## Fonctionnalités

- filtrage strict des membres rattachés à la DTDD, quel que soit leur état ;
- distinction entre ressources internes, prestataires externes et ressources non classées ;
- recherche, filtres multivalués, périodes budgétaires, trimestres, regroupements, tri et pagination ;
- calcul des jours affectés, TJM moyens et coûts HT sur le périmètre filtré ;
- fiche détaillée avec périodes, organisation, feuilles de temps, coûts et source JSON ;
- export CSV UTF-8 des résultats filtrés ;
- sauvegarde locale automatique de la réponse Abraxio complète et import/export JSON.

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

Le projet Pages existant utilise Direct Upload. Comme KesKiFon, la CI GitHub déploie donc avec Wrangler afin de compiler et publier également la Function.

## Sécurité et confidentialité

Chaque utilisateur saisit son propre token Abraxio. Il est envoyé exclusivement dans l’en-tête `Authorization` et conservé dans le `localStorage` jusqu’à la déconnexion.

Aucun token, export, enregistrement de réponse API ou capture contenant des données réelles ne doit être versionné. Les informations de ressources et de tarification sont confidentielles. cKi doit être utilisé uniquement sur un poste de confiance et derrière un accès interne en production.

## Sauvegarde locale et import/export

cKi conserve la dernière réponse complète d’Abraxio dans IndexedDB, séparément du token. Tous les membres et champs bruts sont sauvegardés ; l’affichage reste limité à la DTDD. À l’ouverture, les données sont restaurées sans appel API, même sans token valide. La date de récupération et, le cas échéant, la date d’import sont affichées.

Le bouton **Actualiser depuis Abraxio** récupère une nouvelle version avec une limite de 30 secondes. Les erreurs réseau, réponses invalides et tokens expirés conservent les données précédentes. Le remplacement par un résultat DTDD vide demande confirmation. Si la sauvegarde locale échoue, les nouvelles données restent disponibles pour la session et peuvent être exportées.

**Exporter les données brutes** télécharge toute la sauvegarde dans un fichier JSON versionné, indépendamment des filtres, sans token ni en-têtes d’authentification. **Importer des données** accepte ce fichier ou une réponse API native au format `{ "value": [...] }`, même depuis l’écran d’accueil sans token. Le nombre de membres et la date disponible sont présentés avant confirmation du remplacement. Les fichiers invalides ne remplacent aucune donnée. La date de récupération d’une réponse native est inconnue ; la date d’import est enregistrée séparément.

La déconnexion supprime uniquement le token. **Effacer les données locales** supprime la sauvegarde et les données en mémoire après confirmation, sans supprimer les fichiers téléchargés. Conservez un export JSON sur votre ordinateur : les données du navigateur peuvent être effacées par ses réglages. Le site cKi doit rester accessible ; l’ouverture de l’application sans connexion Internet n’est pas prise en charge.

Les sauvegardes IndexedDB et fichiers JSON ne sont pas chiffrés et contiennent les données confidentielles de la réponse API complète. Utilisez un poste de confiance et conservez les fichiers dans un emplacement approprié.

## Licence

Projet distribué sous [licence MIT](LICENSE).
