import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { RESERVATION_STORAGE_KEY } from './reservation-request.fixtures';
import { DemoReservationStore } from './demo-reservation-store.service';
import { ReservationRequestPage } from './reservation-request.page';

describe('ReservationRequestPage', () => {
  beforeEach(async () => {
    localStorage.removeItem(RESERVATION_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [ReservationRequestPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage() {
    const fixture = TestBed.createComponent(ReservationRequestPage);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidForm(host: HTMLElement, participants = '12') {
    const purpose = host.querySelector<HTMLTextAreaElement>('#purpose')!;
    purpose.value = 'Aula demonstrativa';
    purpose.dispatchEvent(new Event('input', { bubbles: true }));
    const count = host.querySelector<HTMLInputElement>('#participants')!;
    count.value = participants;
    count.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLInputElement>('.rules-check input')!.click();
  }

  it('validates the required purpose, participants and rules agreement', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLFormElement>('.request-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(host.textContent).toContain('Informe a finalidade da reserva.');
    expect(host.textContent).toContain('Informe a quantidade de participantes.');
    expect(host.textContent).toContain('Confirme o compromisso com as regras de utilização.');
    expect(host.querySelector('[role="status"]')).toBeNull();
    expect(TestBed.inject(DemoReservationStore).getAll()).toHaveLength(0);
  });

  it('enforces room capacity and a valid available period', async () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    fillValidForm(host, '41');
    host.querySelector<HTMLFormElement>('.request-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(host.textContent).toContain('A capacidade máxima é de 40 pessoas.');
    expect(TestBed.inject(DemoReservationStore).getAll()).toHaveLength(0);

    TestBed.resetTestingModule();
    const routeParams = convertToParamMap({ codigo: 'AMB-001' });
    const queryParams = convertToParamMap({ data: '2026-10-22', inicio: '12:00', fim: '14:00' });
    const routeMock = {
      snapshot: { paramMap: routeParams, queryParamMap: queryParams },
      paramMap: of(routeParams),
      queryParamMap: of(queryParams),
    };
    await TestBed.configureTestingModule({
      imports: [ReservationRequestPage],
      providers: [provideRouter(routes), { provide: ActivatedRoute, useValue: routeMock }],
    }).compileComponents();
    const blockedFixture = TestBed.createComponent(ReservationRequestPage);
    blockedFixture.detectChanges();
    const blockedHost = blockedFixture.nativeElement as HTMLElement;
    fillValidForm(blockedHost);
    blockedHost.querySelector<HTMLFormElement>('.request-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    blockedFixture.detectChanges();
    expect(blockedHost.textContent).toContain('Este período não está disponível na demonstração local.');
    expect(blockedHost.textContent).toContain('12:00–14:00');
  });

  it('saves a successful demo request locally and shows an explicit success state', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    fillValidForm(host);
    host.querySelector<HTMLFormElement>('.request-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(host.querySelector('.success-message')?.textContent).toContain('Nenhum pedido real foi enviado.');
    expect(TestBed.inject(DemoReservationStore).getAll()).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(RESERVATION_STORAGE_KEY) ?? '[]')[0].source).toBe('demo-local');
    host.querySelector<HTMLFormElement>('.request-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    expect(TestBed.inject(DemoReservationStore).getAll()).toHaveLength(1);
  });

  it('reports local storage write failures without showing success or deleting existing records', () => {
    const store = TestBed.inject(DemoReservationStore);
    store.save({
      environmentCode: 'AMB-001', date: '2026-10-22', startTime: '08:00', endTime: '10:00',
      purpose: 'Registro existente', participants: 5, observations: '', acceptedRules: true,
    });
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    fillValidForm(host);
    const writeSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    host.querySelector<HTMLFormElement>('.request-form')!.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível salvar');
    expect(host.querySelector('.success-message')).toBeNull();
    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0].purpose).toBe('Registro existente');
    writeSpy.mockRestore();
  });

  it('keeps the environment and period on Alterar período and Cancelar links', async () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const changePeriod = host.querySelector<HTMLAnchorElement>('.change-period')!;
    expect(changePeriod.getAttribute('href')).toContain('/ambientes/AMB-001');
    expect(changePeriod.getAttribute('href')).toContain('data=2026-10-22');
    expect(changePeriod.getAttribute('href')).toContain('inicio=08:00');
    expect(host.querySelector<HTMLAnchorElement>('.form-actions .button--quiet')?.getAttribute('href'))
      .toContain('/ambientes/AMB-001');

    changePeriod.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toContain('/ambientes/AMB-001');
    expect(TestBed.inject(Router).url).toContain('data=2026-10-22');
  });
});
