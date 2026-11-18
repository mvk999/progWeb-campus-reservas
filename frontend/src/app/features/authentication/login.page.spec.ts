import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
  });

  it('shows the credential form and account registration link', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('input[name="username"]')).not.toBeNull();
    expect(host.querySelector('input[name="password"]')).not.toBeNull();
    expect(host.querySelector('a[routerLink="/cadastro"]')?.textContent).toContain('Criar uma conta');
    expect(host.querySelector('[aria-label="Perfis de acesso"]')).toBeNull();
  });

  it('sends credentials to Django and displays the returned login error', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const username = host.querySelector<HTMLInputElement>('input[name="username"]')!;
    const password = host.querySelector<HTMLInputElement>('input[name="password"]')!;
    username.value = 'aluna';
    username.dispatchEvent(new Event('input'));
    password.value = 'incorreta';
    password.dispatchEvent(new Event('input'));
    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/login/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ username: 'aluna', password: 'incorreta' });
    request.flush({ non_field_errors: ['Usuário ou senha inválidos.'] }, { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Usuário ou senha inválidos.');
    TestBed.inject(HttpTestingController).verify();
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
