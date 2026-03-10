import { Component, input } from '@angular/core';

@Component({
    selector: 'pm-tabs',
    templateUrl: './pm-tabs.html',
    styleUrl: './pm-tabs.css',
})
export class PmTabsComponent {
    /** The base command — e.g. 'add angular-translation-service' */
    readonly command = input.required<string>();

    /** Override specific manager commands if they differ */
    readonly npmCommand = input<string>();
    readonly pnpmCommand = input<string>();
    readonly bunCommand = input<string>();

    protected active: 'npm' | 'pnpm' | 'bun' = 'npm';

    protected get npmCmd(): string {
        return this.npmCommand() ?? `npm ${this.command()}`;
    }

    protected get pnpmCmd(): string {
        return this.pnpmCommand() ?? `pnpm ${this.command()}`;
    }

    protected get bunCmd(): string {
        return this.bunCommand() ?? `bun ${this.command()}`;
    }

    protected get activeCmd(): string {
        switch (this.active) {
            case 'npm': return this.npmCmd;
            case 'pnpm': return this.pnpmCmd;
            case 'bun': return this.bunCmd;
        }
    }
}
