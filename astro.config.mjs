import { defineConfig } from 'astro/config';

// Site de comparaison Astro — même contenu que le site Hugo (../site).
// i18n MANUEL : les pages vivent dans src/pages/fr/ et src/pages/en/ (pas le
// i18n d'Astro). On ne déclare donc PAS de `defaultLocale` : sinon Astro
// génère un redirect automatique / -> /{defaultLocale}/ qui écrase la page
// racine, où l'on veut rediriger selon la langue du navigateur.
export default defineConfig({
  site: 'http://localhost:4321',
});
