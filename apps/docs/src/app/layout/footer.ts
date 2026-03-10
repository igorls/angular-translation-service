import { Component, inject } from '@angular/core';
import { TranslationService } from '@angular-translation-service/core';

@Component({
  selector: 'docs-footer',
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class FooterComponent {
  private readonly i18n = inject(TranslationService);
  protected readonly common = this.i18n.select('common');
}
