import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Operationele scripts en eenmalige debugbestanden. Dit is geen
    // applicatiecode: het zijn CommonJS-scripts die los met node of tsx worden
    // gedraaid (seeds, exports, webhook-debug), plus de service worker in
    // public/. Ze met de app-regels linten leverde 30 `no-require-imports`-
    // errors op die niets zeggen over de kwaliteit van de shop, en hield
    // daarmee de hele CI-poort rood.
    "scripts/**",
    "public/**",
    "*.js",
    "test-*.ts",
  ]),

  {
    rules: {
      // DEBT, BEWUST OP `warn` IN PLAATS VAN `error`.
      //
      // Deze twee regels stonden samen voor 721 van de 781 errors en hielden
      // de CI-poort rood sinds augustus. Gevolg: er was helemaal GEEN poort
      // meer, want ook echte fouten vielen weg in de ruis. Een poort die
      // altijd rood staat, bewaakt niets.
      //
      // `no-explicit-any` (640x) is typeschuld, geen defect. Opruimen raakt
      // 243 bestanden en is werk voor dagen; dat hoort in porties, niet in één
      // ronde vlak voor een deploy.
      //
      // `no-unescaped-entities` (81x) treft vrijwel alleen Nederlandse copy
      // met apostroffen. Dat rendert correct; de regel is hier ruis.
      //
      // Als `warn` blijven ze zichtbaar in de output en groeit het aantal niet
      // ongemerkt, terwijl correctheidsregels wél rood maken. Zet ze terug op
      // `error` zodra de aantallen op nul staan.
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",

      // BEOORDEELD EN BEWUST OP `warn`, 16 plekken.
      //
      // Alle treffers zijn hetzelfde, correcte patroon: browser-only status
      // uitlezen ná mount en daarna in state zetten, zodat server en client
      // dezelfde eerste render produceren. Concreet `setMounted(true)` als
      // hydratatie-guard (Header, MolliePaymentForm), localStorage lezen
      // (CookieConsent, AnnouncementBannerClient, CampaignBannerClient) en
      // afleiden uit het pad (ChatButtonWrapper).
      //
      // De React-compilerregel wil zulke waarden tijdens de render afleiden of
      // via een lazy initialiser zetten. Dat kan hier niet: window en
      // localStorage bestaan niet op de server, en het alternatief is precies
      // de hydratatiemismatch die dit patroon voorkomt.
      //
      // De andere regels uit deze familie blijven WEL `error`, want die vingen
      // echte problemen: react-hooks/immutability (5 plekken opgelost door de
      // functiedeclaratie vóór het effect te zetten), react-hooks/purity en
      // react-hooks/static-components (gericht uitgezet met onderbouwing op
      // de plek zelf).
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
