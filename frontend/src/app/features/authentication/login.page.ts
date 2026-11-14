import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DemoProfileService } from './demo-profile.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly profileService = inject(DemoProfileService);
  private readonly router = inject(Router);
  protected readonly credentialError = signal('');
  protected readonly storageError = this.profileService.storageError;

  protected submitCredentials(event: Event): void {
    event.preventDefault();
    this.credentialError.set('O acesso por e-mail e senha não está conectado a uma autenticação. Use o acesso demonstrativo abaixo.');
  }

  protected continueAsRequester(): void {
    if (this.profileService.loginAsRequester()) void this.router.navigateByUrl('/mapa');
  }
}
