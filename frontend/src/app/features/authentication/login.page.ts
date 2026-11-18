import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthErrors, AuthService } from './auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly errors = signal<AuthErrors>({});
  protected readonly submitting = signal(false);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitting.set(true);
    this.errors.set({});
    const errors = await this.auth.login(this.username().trim(), this.password());
    this.submitting.set(false);
    if (errors) {
      this.errors.set(errors);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.auth.navigateHome(returnUrl?.startsWith('/') ? returnUrl : undefined);
  }

  protected updateUsername(event: Event): void { this.username.set((event.target as HTMLInputElement).value); }
  protected updatePassword(event: Event): void { this.password.set((event.target as HTMLInputElement).value); }
  protected messages(key: string): string[] { return this.errors()[key] ?? []; }
}
