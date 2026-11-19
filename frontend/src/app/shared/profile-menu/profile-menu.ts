import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../features/authentication/auth.service';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile-menu.html',
  styleUrl: './profile-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileMenu {
  protected readonly auth = inject(AuthService);

  protected async logout(): Promise<void> {
    await this.auth.logout();
  }
}
