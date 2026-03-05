import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header';
import { FooterComponent } from './layout/footer';

@Component({
  selector: 'docs-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <docs-header />
    <main>
      <router-outlet />
    </main>
    <docs-footer />
  `,
  styleUrl: './app.css',
})
export class App { }
