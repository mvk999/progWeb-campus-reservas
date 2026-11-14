import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DEMO_PROFILE_STORAGE_KEY } from './features/authentication/auth.fixtures';

describe('Campus Reservas shell', () => {
  beforeEach(async () => {
    localStorage.removeItem(DEMO_PROFILE_STORAGE_KEY);
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
    expect(host.querySelectorAll('button[aria-label="Alternar perfil de demonstração"]').length).toBe(1);
  });

  it('routes the main navigation to the rooms agenda', async () => {
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
    expect(host.querySelector('.agenda-table tbody tr')).toBeTruthy();
    expect(host.textContent).toContain('24 ambientes');
  });

  it('shows role-specific navigation after selecting a demonstrative profile', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('[aria-label="Alternar perfil de demonstração"]')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.profile-option:nth-child(2)')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/gestao');
    expect(host.querySelector('.primary-nav a.is-active')?.textContent).toContain('Gestão de reservas');
    expect(host.querySelector('.primary-nav a[href="/minhas-reservas"]')).toBeNull();
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Responsável');
  });
});
