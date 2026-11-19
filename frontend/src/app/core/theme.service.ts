import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

const THEME_STORAGE_KEY = 'campus-reservas:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly isDark = signal(this.readInitialTheme());

  constructor() {
    this.applyTheme();
  }

  toggle(): void {
    this.isDark.update(value => !value);
    this.applyTheme();
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, this.isDark() ? 'dark' : 'light');
    } catch {
      // A private browser session can still use the selected theme in memory.
    }
  }

  private readInitialTheme(): boolean {
    try {
      return this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  }

  private applyTheme(): void {
    this.document.documentElement.setAttribute('data-bs-theme', this.isDark() ? 'dark' : 'light');
  }
}
