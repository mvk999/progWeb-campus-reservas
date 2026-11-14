import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, QueryList, ViewChild, ViewChildren, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DemoProfileId } from '../../features/authentication/auth.models';
import { DemoProfileService } from '../../features/authentication/demo-profile.service';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  templateUrl: './profile-menu.html',
  styleUrl: './profile-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileMenu {
  protected readonly profiles = inject(DemoProfileService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly dialogOpen = signal(false);
  @ViewChild('profileTrigger') private profileTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('profileDialog') private profileDialog?: ElementRef<HTMLElement>;
  @ViewChildren('profileOption') private profileOptions?: QueryList<ElementRef<HTMLButtonElement>>;

  protected openDialog(): void {
    this.dialogOpen.set(true);
    this.changeDetector.detectChanges();
    this.profileOptions?.first.nativeElement.focus();
  }

  protected closeDialog(): void {
    this.dialogOpen.set(false);
    this.changeDetector.detectChanges();
    this.profileTrigger?.nativeElement.focus();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeDialog();
  }

  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...(this.profileDialog?.nativeElement.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled])',
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

  protected selectProfile(profile: DemoProfileId): void {
    if (!this.profiles.selectProfile(profile)) return;
    const destination = this.profiles.optionFor(profile).homePath;
    this.closeDialog();
    void this.router.navigateByUrl(destination);
  }

  protected goToLogin(): void {
    this.closeDialog();
    void this.router.navigateByUrl('/login');
  }
}
