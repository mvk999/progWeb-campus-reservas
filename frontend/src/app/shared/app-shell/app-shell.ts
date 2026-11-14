import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ProfileMenu } from '../profile-menu/profile-menu';
import { DemoProfileService } from '../../features/authentication/demo-profile.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ProfileMenu],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly profile = inject(DemoProfileService);
}
