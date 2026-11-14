import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { EnvironmentDetailPage } from './environment-detail.page';

describe('EnvironmentDetailPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvironmentDetailPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage() {
    const fixture = TestBed.createComponent(EnvironmentDetailPage);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the observed AMB-001 details and labels the local illustration', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('h1')?.textContent?.trim()).toBe('Sala 101');
    expect(host.textContent).toContain('Sala de aula · AMB-001');
    expect(host.textContent).toContain('Pavilhão 4');
    expect(host.textContent).toContain('capacidade máxima de 40 pessoas');
    expect(host.textContent).toContain('Quadro branco');
    expect(host.textContent).toContain('Projetor');
    expect(host.textContent).toContain('Wi-Fi');
    expect(host.querySelector('[aria-label="Imagem ilustrativa do ambiente"]')).toBeTruthy();
    expect(host.querySelector('.demo-disclaimer')?.textContent).toContain('Disponibilidade demonstrativa local');
  });

  it('shows October 2026 with 1–18 disabled and the two unavailable periods', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.month-navigation h3')?.textContent?.trim()).toBe('outubro de 2026');
    expect(host.querySelectorAll('.calendar-day:disabled').length).toBe(18);
    expect(host.querySelector<HTMLButtonElement>('.calendar-day[data-date="2026-10-22"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelectorAll('.period-option').length).toBe(6);
    expect(host.querySelector<HTMLButtonElement>('.period-option[aria-label^="12:00–14:00"]')?.disabled).toBe(true);
    expect(host.querySelector<HTMLButtonElement>('.period-option[aria-label^="14:00–16:00"]')?.disabled).toBe(true);
    expect(host.querySelector<HTMLAnchorElement>('.request-button')?.textContent?.trim()).toBe('Solicitar reserva');
  });

  it('keeps the request action unavailable for blocked and unverified periods', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.period-option[aria-label^="12:00–14:00"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector<HTMLButtonElement>('.period-option[aria-label^="12:00–14:00"]')?.disabled).toBe(true);
    expect(host.querySelector('.period-option--selected')?.getAttribute('aria-label')).toContain('08:00–10:00');

    host.querySelector<HTMLButtonElement>('.calendar-day[data-date="2026-10-23"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.period-feedback')?.textContent).toContain('Não há disponibilidade demonstrativa');
    expect(host.querySelector<HTMLButtonElement>('.request-button')?.disabled).toBe(true);
    expect(host.querySelectorAll('.period-option--unknown').length).toBe(6);
  });

  it('opens the local request route with the selected available period', async () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.period-option[aria-label^="10:00–12:00"]')!.click();
    fixture.detectChanges();
    const link = host.querySelector<HTMLAnchorElement>('.request-button')!;
    expect(link.getAttribute('href')).toContain('/solicitar/AMB-001');
    expect(link.getAttribute('href')).toContain('data=2026-10-22');
    expect(link.getAttribute('href')).toContain('inicio=10:00');

    link.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toContain('/solicitar/AMB-001');
  });

  it('moves between months and allows selecting dates without inventing availability', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('[aria-label="Próximo mês"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.month-navigation h3')?.textContent?.trim()).toBe('novembro de 2026');
    expect(host.querySelector('.selected-date')?.textContent).toContain('22/11/2026');
    expect(host.querySelector<HTMLButtonElement>('.calendar-day[data-date="2026-11-22"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('.period-feedback')?.textContent).toContain('Não há disponibilidade demonstrativa');
    expect(host.querySelector<HTMLButtonElement>('.request-button')?.disabled).toBe(true);

    host.querySelector<HTMLButtonElement>('.calendar-day[data-date="2026-11-10"]')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.selected-date')?.textContent).toContain('10/11/2026');
    expect(host.querySelector('.period-feedback')?.textContent).toContain('Não há disponibilidade demonstrativa');
    expect(host.querySelector<HTMLButtonElement>('.request-button')?.disabled).toBe(true);
  });
});
