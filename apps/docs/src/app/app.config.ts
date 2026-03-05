import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideTranslation, httpLoader } from 'angular-translation-service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions()),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
    provideTranslation({
      defaultLang: 'en',
      supportedLangs: ['en', 'pt-BR', 'de', 'fr', 'ja', 'zh'],
      coreNamespaces: ['common'],
      loader: httpLoader('/angular-translation-service/i18n'),
      detectLanguage: true,
      storageKey: 'ats-docs-lang',
    }),
  ],
};
