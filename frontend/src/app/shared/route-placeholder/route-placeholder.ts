import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-route-placeholder',
  standalone: true,
  template: `
    <section class="route-placeholder" aria-live="polite">
      <p class="route-placeholder__eyebrow">Campus Reservas</p>
      <h1>{{ pageData()?.['title'] }}</h1>
      <p>Esta área ainda não está disponível nesta versão.</p>
    </section>
  `,
  styles: `
    .route-placeholder { max-width: 48rem; margin: 1rem auto; }
    .route-placeholder__eyebrow { margin: 0 0 .5rem; color: var(--text-muted); font-size: .8rem; }
    h1 { margin: 0 0 .65rem; color: var(--text); font-size: clamp(1.6rem, 3vw, 2rem); font-weight: 500; }
    p:last-child { margin: 0; color: var(--text-muted); }
  `,
})
export class RoutePlaceholder {
  private readonly route = inject(ActivatedRoute);
  protected readonly pageData = toSignal(this.route.data, {
    initialValue: this.route.snapshot.data,
  });
}
