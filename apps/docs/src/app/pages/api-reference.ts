import { Component, inject } from '@angular/core';
import { TranslationService } from '@angular-translation-service/core';

@Component({
  selector: 'docs-api-reference',
  templateUrl: './api-reference.html',
  styleUrl: './api-reference.css',
})
export class ApiReferencePage {
  private readonly i18n = inject(TranslationService);
  protected readonly api = this.i18n.select('api-reference');
}
