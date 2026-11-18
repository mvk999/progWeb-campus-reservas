import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CampusApiService } from './campus-api.service';

describe('CampusApiService', () => {
  let api: CampusApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CampusApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses Django environment filters and availability contract', () => {
    api.getEnvironments({ category: 'Laboratório', building: 'DCC', minimumCapacity: 20, q: 'redes' }).subscribe();
    const list = http.expectOne(request => request.url === '/api/ambientes/' &&
      request.params.get('category') === 'Laboratório' && request.params.get('building') === 'DCC' &&
      request.params.get('minimumCapacity') === '20' && request.params.get('q') === 'redes');
    expect(list.request.method).toBe('GET');
    list.flush([]);

    api.getEnvironment('DCC-101').subscribe();
    const detail = http.expectOne('/api/ambientes/DCC-101/');
    expect(detail.request.method).toBe('GET');
    detail.flush({});

    api.getAvailability('DCC-101', '2026-11-20').subscribe();
    const availability = http.expectOne(request => request.url === '/api/ambientes/DCC-101/disponibilidade/' && request.params.get('date') === '2026-11-20');
    expect(availability.request.method).toBe('GET');
    availability.flush({ environmentCode: 'DCC-101', date: '2026-11-20', occupied: [] });
  });

  it('reads reservation scopes and sends create and cancel requests', () => {
    api.getMyReservations('history').subscribe();
    const history = http.expectOne(request => request.url === '/api/reservas/' && request.params.get('scope') === 'history');
    expect(history.request.method).toBe('GET');
    history.flush([]);

    const payload = { environmentCode: 'DCC-101', date: '2026-11-20', startTime: '14:00', endTime: '16:00', purpose: 'Estudo', participants: 4 };
    api.createReservation(payload).subscribe();
    const create = http.expectOne('/api/reservas/');
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(payload);
    create.flush({});

    api.cancelReservation(12).subscribe();
    const cancel = http.expectOne('/api/reservas/12/cancelar/');
    expect(cancel.request.method).toBe('POST');
    cancel.flush({});
  });

  it('uses management filters, decisions, and occupancy range', () => {
    api.getManagedReservations({ status: 'PENDENTE', environment: 'DCC-101', date: '2026-11-20' }).subscribe();
    const list = http.expectOne(request => request.url === '/api/gestao/reservas/' && request.params.get('status') === 'PENDENTE' && request.params.get('environment') === 'DCC-101' && request.params.get('date') === '2026-11-20');
    expect(list.request.method).toBe('GET');
    list.flush([]);

    api.approveReservation(12).subscribe();
    const approve = http.expectOne('/api/gestao/reservas/12/aprovar/');
    expect(approve.request.method).toBe('POST');
    approve.flush({});

    api.rejectReservation(12, 'Conflito de agenda').subscribe();
    const reject = http.expectOne('/api/gestao/reservas/12/rejeitar/');
    expect(reject.request.body).toEqual({ justification: 'Conflito de agenda' });
    reject.flush({});

    api.getOccupancy('2026-11-16', '2026-11-20').subscribe();
    const occupancy = http.expectOne(request => request.url === '/api/gestao/ocupacao/' && request.params.get('start') === '2026-11-16' && request.params.get('end') === '2026-11-20');
    expect(occupancy.request.method).toBe('GET');
    occupancy.flush({ start: '2026-11-16', end: '2026-11-20', items: [] });
  });
});
