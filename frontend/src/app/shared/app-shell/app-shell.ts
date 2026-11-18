import { ChangeDetectorRef, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { AuthService } from '../../features/authentication/auth.service';
import { DemoResetService } from './demo-reset.service';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ProfileMenu],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly resetService = inject(DemoResetService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly resetDialogOpen = signal(false);
  protected readonly resetError = signal('');
  @ViewChild('resetTrigger') private resetTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('resetCancel') private resetCancel?: ElementRef<HTMLButtonElement>;
  @ViewChild('resetDialog') private resetDialog?: ElementRef<HTMLElement>;

  protected requestDemoReset(): void {
    this.resetError.set('');
    this.resetDialogOpen.set(true);
    this.changeDetector.detectChanges();
    this.resetCancel?.nativeElement.focus();
  }

  protected cancelDemoReset(): void {
    this.resetDialogOpen.set(false);
    this.resetError.set('');
    this.changeDetector.detectChanges();
    this.resetTrigger?.nativeElement.focus();
  }

  protected confirmDemoReset(): void {
    const result = this.resetService.resetLocalDemonstration();
    if (!result.ok) {
      this.resetError.set(result.message);
      return;
    }
    this.resetDialogOpen.set(false);
    this.changeDetector.detectChanges();
    void this.router.navigateByUrl('/mapa');
  }

  protected onResetDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelDemoReset();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(this.resetDialog?.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href]',
    ) ?? [])];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
