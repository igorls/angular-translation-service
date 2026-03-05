import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/home').then((m) => m.HomePage),
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
