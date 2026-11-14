import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { DEMO_PROFILE_STORAGE_KEY } from '../../features/authentication/auth.fixtures';
import { DemoProfileService } from '../../features/authentication/demo-profile.service';
import { ProfileMenu } from './profile-menu';

describe('ProfileMenu', () => {
  beforeEach(async () => {
    localStorage.removeItem(DEMO_PROFILE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [ProfileMenu],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createMenu() {
    const fixture = TestBed.createComponent(ProfileMenu);
    fixture.detectChanges();
    return fixture;
  }

  it('opens a modal dialog, focuses an option and closes with Escape restoring focus', () => {
    const fixture = createMenu();
    const host = fixture.nativeElement as HTMLElement;
    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Alternar perfil de demonstração"]')!;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    const dialog = host.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(host.querySelectorAll('.profile-option').length).toBe(3);
    expect(document.activeElement?.textContent).toContain('Solicitante');

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('persists the selected role, routes accordingly and shows a toast', async () => {
    const fixture = createMenu();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('[aria-label="Alternar perfil de demonstração"]')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.profile-option:nth-child(3)')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(DemoProfileService).profileId()).toBe('administrador');
    expect(localStorage.getItem(DEMO_PROFILE_STORAGE_KEY)).toBe('administrador');
    expect(TestBed.inject(Router).url).toBe('/admin');
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Administrador');
  });

  it('reports a storage failure without changing the active profile or navigating', () => {
    const fixture = createMenu();
    const host = fixture.nativeElement as HTMLElement;
    const writeSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    host.querySelector<HTMLButtonElement>('[aria-label="Alternar perfil de demonstração"]')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.profile-option:nth-child(2)')!.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível salvar');
    expect(TestBed.inject(DemoProfileService).profileId()).toBe('solicitante');
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(TestBed.inject(Router).url).not.toBe('/gestao');
    writeSpy.mockRestore();
  });

  it('reports an invalid stored profile and allows a valid replacement', () => {
    localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, 'superuser');
    const fixture = createMenu();
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('[aria-label="Alternar perfil de demonstração"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('perfil salvo está inválido');
    host.querySelector<HTMLButtonElement>('.profile-option:nth-child(2)')!.click();
    fixture.detectChanges();
    expect(TestBed.inject(DemoProfileService).profileId()).toBe('responsavel');
    expect(localStorage.getItem(DEMO_PROFILE_STORAGE_KEY)).toBe('responsavel');
  });
});
