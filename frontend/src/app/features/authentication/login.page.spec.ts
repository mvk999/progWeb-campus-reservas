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

  it('shows the observed sign-in fields without inventing credential values', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('#institutional-email')).toBeTruthy();
    expect(host.querySelector('#password')).toBeTruthy();
    expect(host.textContent).toContain('Acesso demonstrativo');
    expect(host.textContent).toContain('nenhum par de credenciais foi inventado');
  });

  it('does not authenticate through the credential form and offers a local requester access', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLFormElement>('form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('não está conectado');
    expect(TestBed.inject(Router).url).not.toBe('/mapa');

    host.querySelector<HTMLButtonElement>('.button--demo')!.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/mapa');
    expect(TestBed.inject(DemoProfileService).profileId()).toBe('solicitante');
    expect(localStorage.getItem(DEMO_PROFILE_STORAGE_KEY)).toBe('solicitante');
  });
});
