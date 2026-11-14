import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { vi } from 'vitest';
import { RESERVATION_STORAGE_KEY } from '../reservation-request/reservation-request.fixtures';
import { DemoReservationStore } from '../reservation-request/demo-reservation-store.service';
import { MyReservationsPage } from './my-reservations.page';

describe('MyReservationsPage', () => {
  beforeEach(async () => {
    localStorage.removeItem(RESERVATION_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [MyReservationsPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage() {
    const fixture = TestBed.createComponent(MyReservationsPage);
    fixture.detectChanges();
    return fixture;
  }

  function dateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  }

  function saveLocalRequest(date: string, purpose: string): void {
    TestBed.inject(DemoReservationStore).save({
      environmentCode: 'AMB-001', date, startTime: '08:00', endTime: '10:00',
      purpose, participants: 8, observations: '', acceptedRules: true,
    });
  }

  it('shows zero indicators and the observed empty state without seeded reservations', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.indicator strong')[0].textContent).toBe('0');
    expect(host.querySelectorAll('.indicator strong')[1].textContent).toBe('0');
    expect(host.querySelectorAll('.indicator strong')[2].textContent).toBe('0');
    expect(host.textContent).toContain('Nenhuma solicitação encontrada');
    expect(host.querySelector('.page-heading p')?.textContent).toContain('Solicitações de demonstração salvas neste navegador');
    host.querySelector<HTMLButtonElement>('.tabs button:nth-child(3)')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.empty-state')).not.toBeNull();
  });

  it('reads only saved local requests and separates upcoming from history by date', () => {
    saveLocalRequest(dateOffset(3), 'Atividade futura');
    saveLocalRequest(dateOffset(-3), 'Atividade passada');
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.reservation-card').length).toBe(1);
    expect(host.textContent).toContain('Atividade futura');
    expect(host.textContent).not.toContain('Atividade passada');
    expect(host.querySelectorAll('.indicator strong')[2].textContent).toBe('2');
    expect(host.querySelectorAll('.indicator strong')[0].textContent).toBe('—');
    expect(host.querySelectorAll('.indicator strong')[1].textContent).toBe('—');

    host.querySelector<HTMLButtonElement>('.tabs button:nth-child(2)')!.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.reservation-card').length).toBe(1);
    expect(host.textContent).toContain('Atividade passada');
    expect(host.textContent).not.toContain('Atividade futura');
    expect(host.textContent).toContain('Não informada');
  });

  it('shows saved requests in the personal calendar and keeps the situation filter at all', () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-15`;
    saveLocalRequest(date, 'Reunião local');
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.tabs button:nth-child(3)')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.calendar-panel')).not.toBeNull();
    expect(host.querySelector('.calendar-event')?.textContent).toContain('Sala 101');
    expect(host.querySelector('.calendar-event')?.getAttribute('href')).toContain('/ambientes/AMB-001');
    expect(host.querySelector('.calendar-grid')?.hasAttribute('role')).toBe(false);
    expect(host.querySelector<HTMLSelectElement>('.situation-filter select')?.value).toBe('all');
    expect(host.querySelector('.situation-filter select option')?.textContent).toBe('Todas as situações');
  });

  it('links environment consultation and new request to the rooms listing', async () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector<HTMLAnchorElement>('.page-heading .button')?.getAttribute('href')).toBe('/salas');
    host.querySelector<HTMLAnchorElement>('.page-heading .button')!.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/salas');
  });

  it('shows an accessible storage error instead of the empty state for malformed JSON', () => {
    localStorage.setItem(RESERVATION_STORAGE_KEY, '{broken json');
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('inválidos e não podem ser exibidos');
    expect(host.querySelector('.empty-state')).toBeNull();
    expect(host.querySelectorAll('.indicator strong')[0].textContent).toBe('—');
    expect(host.querySelectorAll('.indicator strong')[1].textContent).toBe('—');
    expect(host.querySelectorAll('.indicator strong')[2].textContent).toBe('—');
  });

  it('distinguishes storage read exceptions and malformed reservation records from empty storage', () => {
    const readSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError');
    });
    const failedReadFixture = createPage();
    const failedReadHost = failedReadFixture.nativeElement as HTMLElement;
    expect(failedReadHost.querySelector('[role="alert"]')?.textContent).toContain('Não foi possível ler');
    expect(failedReadHost.querySelector('.empty-state')).toBeNull();
    readSpy.mockRestore();

    localStorage.setItem(RESERVATION_STORAGE_KEY, JSON.stringify([{ date: '2026-99-99', source: 'demo-local' }]));
    const invalidRecordFixture = createPage();
    const invalidRecordHost = invalidRecordFixture.nativeElement as HTMLElement;
    expect(invalidRecordHost.querySelector('[role="alert"]')?.textContent).toContain('formato inválido');
    expect(invalidRecordHost.querySelector('.empty-state')).toBeNull();
  });

  it('uses a toggle button group rather than incomplete tab semantics', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const group = host.querySelector('.tabs');
    expect(group?.getAttribute('role')).toBe('group');
    expect(host.querySelectorAll('.tabs [role="tab"]')).toHaveLength(0);
    expect(host.querySelector<HTMLButtonElement>('.tabs button')?.getAttribute('aria-pressed')).toBe('true');
  });
});
