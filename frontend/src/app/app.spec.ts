import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('Campus Reservas shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('renders the shared brand, context, navigation, and footer', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.brand__word')?.textContent?.trim()).toBe('campus');
    expect(host.querySelector('.brand__name')?.textContent?.trim()).toBe('RESERVAS');
    expect(host.textContent).toContain('UFLA · Salas');
    expect(host.textContent).toContain('Campus sede · Lavras, MG');
    expect(host.querySelector('nav[aria-label="Navegação principal"]')).toBeTruthy();
    expect(host.querySelector('footer')?.textContent).toContain('Campus Reservas · UFLA');
    expect(host.querySelectorAll('nav a').length).toBe(4);
    expect(host.querySelectorAll('button').length).toBe(0);
  });

  it('routes the main navigation to its explicit not-yet-available state', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/salas');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Salas');
    expect(host.querySelector('.primary-nav a.is-active')?.textContent?.trim()).toBe('Salas');
    expect(host.textContent).toContain('Esta área ainda não está disponível nesta versão.');
  });
});
