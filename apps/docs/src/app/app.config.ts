import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideTranslation, importLoader } from '@angular-translation-service/core';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideTranslation({
      defaultLang: 'en',
      supportedLangs: ['en', 'pt-BR', 'de', 'fr', 'ja', 'zh', 'es', 'ru'],
      coreNamespaces: ['common'],
      loader: importLoader((lang, ns) => import(`../i18n/${lang}/${ns}.json`)),
      detectLanguage: true,
      storageKey: 'ats-docs-lang',
    }),
  ],
};
