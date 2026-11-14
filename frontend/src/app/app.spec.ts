import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DEMO_PROFILE_STORAGE_KEY } from './features/authentication/auth.fixtures';
import { RESERVATION_STORAGE_KEY } from './features/reservation-request/reservation-request.fixtures';
import { MANAGEMENT_DECISIONS_STORAGE_KEY } from './features/reservation-management/reservation-management.fixtures';
import { DemoProfileService } from './features/authentication/demo-profile.service';

describe('Campus Reservas shell', () => {
  beforeEach(async () => {
    localStorage.removeItem(DEMO_PROFILE_STORAGE_KEY);
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
    expect(host.querySelectorAll('nav[aria-label="Navegação principal"] a').length).toBe(4);
    expect(host.querySelectorAll('button[aria-label="Alternar perfil de demonstração"]').length).toBe(1);
    expect(host.querySelector('.footer-actions a[routerLink="/design"]')?.textContent).toContain('Sobre o protótipo');
    expect(host.textContent).toContain('Trocar perfil');
    expect(host.textContent).toContain('Restaurar demonstração');
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

  it('opens the existing profile dialog from the footer and restores focus to that trigger', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const trigger = [...host.querySelectorAll<HTMLButtonElement>('.footer-actions button')]
      .find((button) => button.textContent?.includes('Trocar perfil'))!;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    expect(host.querySelector('#profile-dialog')).not.toBeNull();
    host.querySelector<HTMLButtonElement>('.profile-dialog__header button')!.click();
    fixture.detectChanges();
    expect(host.querySelector('#profile-dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('asks before restoring and clears only known local demo keys', async () => {
    localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, 'administrador');
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
    expect(localStorage.getItem(DEMO_PROFILE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(RESERVATION_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(MANAGEMENT_DECISIONS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem('user:unrelated')).toBe('preserve');
    expect(TestBed.inject(DemoProfileService).profileId()).toBe('solicitante');
  });
});
