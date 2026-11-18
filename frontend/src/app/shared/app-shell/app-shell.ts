import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { AuthService } from '../../features/authentication/auth.service';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-shell', standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ProfileMenu],
  templateUrl: './app-shell.html', styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
}
