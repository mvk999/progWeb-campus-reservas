import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { DEMO_PROFILE_STORAGE_KEY } from './auth.fixtures';
import { DemoProfileService } from './demo-profile.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  beforeEach(async () => {
    localStorage.removeItem(DEMO_PROFILE_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('shows the three local profile options and the demonstration notice', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const profiles = [...host.querySelectorAll('[aria-label="Perfis de acesso"] button strong')];
    expect(profiles.map(profile => profile.textContent?.trim())).toEqual(['Solicitante', 'Responsável', 'Administrador']);
    expect(host.querySelector('header p')?.textContent).toContain('demonstração');
  });

  it.each([
    ['Solicitante', 'solicitante', '/mapa'],
    ['Responsável', 'responsavel', '/gestao'],
    ['Administrador', 'administrador', '/admin'],
  ])('opens and persists the demonstration profile %s', async (label, id, path) => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const buttons = [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Perfis de acesso"] button')];
    buttons.find(button => button.querySelector('strong')?.textContent === label)!.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(path);
    expect(TestBed.inject(DemoProfileService).profileId()).toBe(id);
    expect(localStorage.getItem(DEMO_PROFILE_STORAGE_KEY)).toBe(id);
  });
});
