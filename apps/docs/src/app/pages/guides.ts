import { Component, inject } from '@angular/core';
import { TranslationService } from '@angular-translation-service/core';

@Component({
  selector: 'docs-guides',
  templateUrl: './guides.html',
  styleUrl: './guides.css',
})
export class GuidesPage {
  private readonly i18n = inject(TranslationService);
  protected readonly g = this.i18n.select('guides');
}
