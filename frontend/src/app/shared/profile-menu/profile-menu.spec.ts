import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { AuthService } from '../../features/authentication/auth.service';
import { ProfileMenu } from './profile-menu';

describe('ProfileMenu', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileMenu],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes)],
    }).compileComponents();
  });

  it('offers the real login route to a visitor', () => {
    const fixture = TestBed.createComponent(ProfileMenu);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('a[routerLink="/login"]')?.textContent?.trim()).toBe('Entrar');
    expect(host.querySelector('[aria-label="Alternar perfil de demonstração"]')).toBeNull();
  });

  it('shows the authenticated API profile and logs out through Django', async () => {
    TestBed.inject(AuthService).user.set({
      id: 7,
      username: 'marina',
      firstName: 'Marina',
      lastName: 'Silva',
      email: 'marina@example.test',
      profile: 'solicitante',
    });
    const fixture = TestBed.createComponent(ProfileMenu);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Marina · Solicitante');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    host.querySelector<HTMLButtonElement>('.profile-logout')!.click();

    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/logout/');
    expect(request.request.method).toBe('POST');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(AuthService).user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
    TestBed.inject(HttpTestingController).verify();
  });
});
