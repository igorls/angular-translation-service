import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslationService } from '@angular-translation-service/core';

@Component({
  selector: 'docs-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
  protected readonly i18n = inject(TranslationService);
  protected readonly common = this.i18n.select('common');
}
