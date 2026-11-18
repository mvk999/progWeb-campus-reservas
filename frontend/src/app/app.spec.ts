import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { AuthService } from './features/authentication/auth.service';
import { RESERVATION_STORAGE_KEY } from './features/reservation-request/reservation-request.fixtures';
import { MANAGEMENT_DECISIONS_STORAGE_KEY } from './features/reservation-management/reservation-management.fixtures';

describe('Campus Reservas shell', () => {
  beforeEach(async () => {
    localStorage.removeItem(RESERVATION_STORAGE_KEY);
    localStorage.removeItem(MANAGEMENT_DECISIONS_STORAGE_KEY);
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
    expect(host.querySelector('.footer-demo-note')?.textContent).toBe('Dados fictícios para demonstração');
    expect(host.querySelectorAll('nav[aria-label="Navegação principal"] a').length).toBe(3);
    expect(host.querySelector('button[aria-label="Alternar perfil de demonstração"]')).toBeNull();
    expect(host.querySelector('.footer-actions a[routerLink="/design"]')).toBeNull();
    expect(host.querySelector('.primary-nav__external')).toBeNull();
    expect(host.textContent).toContain('Restaurar demonstração');
  });

  it('routes the main navigation to the room cards', async () => {
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
    expect(host.querySelectorAll('.room-card').length).toBeGreaterThan(0);
  });

  it('links administrators directly to Django Admin', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(AuthService).user.set({
      id: 1,
      username: 'admin',
      firstName: 'Admin',
      lastName: '',
      email: 'admin@example.test',
      profile: 'administrador',
    });
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const adminLink = host.querySelector<HTMLAnchorElement>('.primary-nav a[href="/admin/"]');
    expect(adminLink?.textContent?.trim()).toBe('Administração');
    expect(adminLink?.hasAttribute('routerLink')).toBe(false);
  });

  it('removes the legacy, design, and Angular admin routes', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    for (const removedPath of ['/versao-anterior', '/design', '/admin']) {
      await router.navigateByUrl(removedPath);
      expect(router.url).toBe('/mapa');
    }
  });

  it('asks before restoring and clears only known local demo keys', async () => {
    localStorage.setItem(RESERVATION_STORAGE_KEY, '[{"source":"demo-local"}]');
    localStorage.setItem(MANAGEMENT_DECISIONS_STORAGE_KEY, '[{"status":"Aprovada"}]');
    localStorage.setItem('user:unrelated', 'preserve');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const resetTrigger = [...host.querySelectorAll<HTMLButtonElement>('.footer-actions button')]
      .find((button) => button.textContent?.includes('Restaurar demonstração'))!;
    resetTrigger.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"] h2')?.textContent).toContain('Restaurar demonstração?');
    expect(localStorage.getItem(RESERVATION_STORAGE_KEY)).not.toBeNull();
    host.querySelector<HTMLButtonElement>('.reset-actions button')!.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(localStorage.getItem(RESERVATION_STORAGE_KEY)).not.toBeNull();

    resetTrigger.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.reset-confirm')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/mapa');
    expect(localStorage.getItem(RESERVATION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(MANAGEMENT_DECISIONS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('user:unrelated')).toBe('preserve');
  });

});
