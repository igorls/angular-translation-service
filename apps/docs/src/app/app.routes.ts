import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { TranslationService } from '@angular-translation-service/core';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/home').then((m) => m.HomePage),
        resolve: {
            i18n: () => inject(TranslationService).ensureNamespaces(['home']),
        },
    },
    {
        path: 'getting-started',
        loadComponent: () => import('./pages/getting-started').then((m) => m.GettingStartedPage),
    },
    {
        path: 'api',
        loadComponent: () => import('./pages/api-reference').then((m) => m.ApiReferencePage),
    },
    {
        path: 'cli',
        loadComponent: () => import('./pages/cli').then((m) => m.CliPage),
    },
];
