import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ADMINISTRATION_MENU_FIXTURE } from './administration-demo.fixtures';
import { AdministrationDemoService } from './administration-demo.service';

@Component({
  selector: 'app-administration-demo-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './administration-demo.page.html',
  styleUrl: './administration-demo.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdministrationDemoPage {
  protected readonly menu = ADMINISTRATION_MENU_FIXTURE;
  protected readonly environments = inject(AdministrationDemoService).getEnvironments();
  protected trackMenu(_index: number, item: (typeof ADMINISTRATION_MENU_FIXTURE)[number]): string { return item.label; }
  protected trackEnvironment(_index: number, item: (typeof this.environments)[number]): string { return item.code; }
}
