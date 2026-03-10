import { Component, inject, HostListener, signal } from '@angular/core';
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

  isMobileMenuOpen = signal(false);
  isLangDropdownOpen = signal(false);

  toggleMobileMenu() {
    this.isMobileMenuOpen.update((v) => !v);
    if (this.isMobileMenuOpen()) {
      this.isLangDropdownOpen.set(false);
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  toggleLangDropdown(event: Event) {
    event.stopPropagation();
    this.isLangDropdownOpen.update((v) => !v);
  }

  setLang(lang: string) {
    this.i18n.setLang(lang);
    this.isLangDropdownOpen.set(false);
    this.closeMobileMenu();
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.isLangDropdownOpen.set(false);
  }
}
