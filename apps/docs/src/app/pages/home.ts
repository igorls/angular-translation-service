import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '@angular-translation-service/core';

@Component({
  selector: 'docs-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  private readonly i18n = inject(TranslationService);
  protected readonly home = this.i18n.select('home');

  copyInstall() {
    navigator.clipboard?.writeText('bun add @angular-translation-service/core');
  }

  copySkill() {
    navigator.clipboard?.writeText('npx skills add igorls/angular-translation-service');
  }
}
