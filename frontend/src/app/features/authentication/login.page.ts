import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  protected readonly storageError = this.profileService.storageError;

  protected enterProfile(id: 'solicitante' | 'responsavel' | 'administrador'): void {
    if (this.profileService.selectProfile(id)) void this.router.navigateByUrl(this.profileService.optionFor(id).homePath);
  }
}
