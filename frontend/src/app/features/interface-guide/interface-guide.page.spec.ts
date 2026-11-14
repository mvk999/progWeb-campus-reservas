import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { InterfaceGuidePage } from './interface-guide.page';

describe('InterfaceGuidePage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InterfaceGuidePage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('renders the design guide, exact color tokens and type/spacing rules', () => {
    const fixture = TestBed.createComponent(InterfaceGuidePage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.guide-eyebrow')?.textContent).toContain('Campus Reservas · Fundamentos');
    expect(host.querySelector('#page-title')?.textContent).toContain('Guia de interface');
    expect([...host.querySelectorAll('.color-card code')].map((item) => item.textContent?.trim())).toEqual([
      '#2C4E70', '#58748F', '#263340', '#516171',
    ]);
    expect(host.textContent).toContain('Georgia, serif');
    expect(host.textContent).toContain('Arial, sans-serif');
    expect(host.textContent).toContain('múltiplos de 4 e 8');
    expect(host.textContent).toContain('1340 px');
    expect(host.textContent).toContain('1150px');
    expect(host.textContent).toContain('780px');
    expect(host.textContent).toContain('480px');
    expect([...host.querySelectorAll<HTMLElement>('.swatch')].map((item) => item.style.backgroundColor)).toEqual([
      'rgb(44, 78, 112)', 'rgb(88, 116, 143)', 'rgb(38, 51, 64)', 'rgb(81, 97, 113)',
    ]);
  });

  it('shows status, validation and focus examples without decorative operations', () => {
    const fixture = TestBed.createComponent(InterfaceGuidePage);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.status--approved')).not.toBeNull();
    expect(host.querySelector('.status--pending')).not.toBeNull();
    expect(host.querySelector('.status--rejected')).not.toBeNull();
    expect(host.querySelector('.status--cancelled')).not.toBeNull();
    expect(host.querySelectorAll('.status').length).toBe(4);
    expect(host.querySelectorAll('.sample-field input[readonly]').length).toBe(4);
    expect(host.querySelector('input[type="time"][aria-invalid="true"][aria-describedby="sample-error"]')).not.toBeNull();
    expect(host.querySelector('#sample-error')?.textContent?.trim()).toBe('O término precisa ser posterior ao início.');
    expect(host.querySelector('#form-title')?.parentElement?.parentElement?.parentElement?.textContent).toContain('não é um formulário operacional');
    expect(host.querySelectorAll('.button-examples button').length).toBe(0);
    expect(host.querySelector('.focus-example')).not.toBeNull();
  });

  it('registers /design as the interface guide route', () => {
    expect(routes.find((route) => route.path === 'design')?.component).toBe(InterfaceGuidePage);
  });
});
