import { Component, inject } from '@angular/core';
import { TranslationService } from '@angular-translation-service/core';
import { PmTabsComponent } from '../shared/pm-tabs';

@Component({
    selector: 'docs-cli',
    imports: [PmTabsComponent],
    templateUrl: './cli.html',
    styleUrl: './cli.css',
})
export class CliPage {
  private readonly i18n = inject(TranslationService);
  protected readonly cli = this.i18n.select('cli');
}
