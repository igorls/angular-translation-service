import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '@angular-translation-service/core';
import { PmTabsComponent } from '../shared/pm-tabs';

@Component({
  selector: 'docs-getting-started',
  imports: [RouterLink, PmTabsComponent],
  templateUrl: './getting-started.html',
  styleUrl: './getting-started.css',
})
export class GettingStartedPage {
  private readonly i18n = inject(TranslationService);
  protected readonly gs = this.i18n.select('getting-started');
}
