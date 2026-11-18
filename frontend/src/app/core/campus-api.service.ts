import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface ApiEnvironment {
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly location: string;
  readonly buildingCode: string;
  readonly capacity: number;
  readonly responsible: string;
  readonly features: readonly string[];
  readonly description?: string;
}

export interface ApiAvailability {
  readonly environmentCode: string;
  readonly date: string;
  readonly occupied: readonly {
    readonly startTime: string;
    readonly endTime: string;
    readonly type: 'APROVADA' | 'PENDENTE' | 'BLOQUEIO';
    readonly reason?: string;
  }[];
}

export interface ApiEquipment {
  readonly code: string;
  readonly name: string;
  readonly category: string;
  readonly totalQuantity: number;
}

export interface ApiReservation {
  readonly id: number;
  readonly environmentCode: string;
  readonly environmentName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: 'PENDENTE' | 'APROVADA' | 'REJEITADA' | 'CANCELADA' | 'CONCLUIDA';
  readonly statusLabel: string;
  readonly purpose: string;
  readonly participants: number;
  readonly observations: string;
  readonly equipments: readonly { readonly code: string; readonly name: string; readonly quantity: number }[];
  readonly requester: { readonly username: string; readonly name: string };
  readonly createdAt: string;
  readonly evaluatedBy: string | null;
  readonly evaluatedAt: string | null;
  readonly justification: string;
  readonly canCancel: boolean;
  readonly hasConflict?: boolean;
}

export interface ApiOccupancyItem {
  readonly id: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly type: 'APROVADA' | 'PENDENTE' | 'BLOQUEIO';
  readonly reason?: string;
  readonly environmentCode: string;
  readonly environmentName: string;
  readonly buildingCode: string;
}

@Injectable({ providedIn: 'root' })
export class CampusApiService {
  private readonly http = inject(HttpClient);

  getEnvironments(filters: { category?: string; building?: string; minimumCapacity?: number; q?: string } = {}) {
    let params = new HttpParams();
    if (filters.category) params = params.set('category', filters.category);
    if (filters.building) params = params.set('building', filters.building);
    if (filters.minimumCapacity) params = params.set('minimumCapacity', filters.minimumCapacity);
    if (filters.q) params = params.set('q', filters.q);
    return this.http.get<ApiEnvironment[]>('/api/ambientes/', { params });
  }

  getEnvironment(code: string): Observable<ApiEnvironment> {
    return this.http.get<ApiEnvironment>(`/api/ambientes/${encodeURIComponent(code)}/`);
  }

  getAvailability(code: string, date: string): Observable<ApiAvailability> {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiAvailability>(`/api/ambientes/${encodeURIComponent(code)}/disponibilidade/`, { params });
  }

  getCategories(): Observable<{ name: string }[]> {
    return this.http.get<{ name: string }[]>('/api/categorias/');
  }

  getEquipments(): Observable<ApiEquipment[]> {
    return this.http.get<ApiEquipment[]>('/api/equipamentos/');
  }

  getMyReservations(scope: 'upcoming' | 'history') {
    return this.http.get<ApiReservation[]>('/api/reservas/', { params: { scope } });
  }

  createReservation(payload: {
    environmentCode: string; date: string; startTime: string; endTime: string;
    purpose: string; participants: number; observations?: string;
    equipments?: readonly { code: string; quantity: number }[];
  }) {
    return this.http.post<ApiReservation>('/api/reservas/', payload);
  }

  cancelReservation(id: number) {
    return this.http.post<ApiReservation>(`/api/reservas/${id}/cancelar/`, {});
  }

  getManagedReservations(filters: { status?: string; environment?: string; date?: string } = {}) {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.environment) params = params.set('environment', filters.environment);
    if (filters.date) params = params.set('date', filters.date);
    return this.http.get<ApiReservation[]>('/api/gestao/reservas/', { params });
  }

  approveReservation(id: number) {
    return this.http.post<ApiReservation>(`/api/gestao/reservas/${id}/aprovar/`, {});
  }

  rejectReservation(id: number, justification: string) {
    return this.http.post<ApiReservation>(`/api/gestao/reservas/${id}/rejeitar/`, { justification });
  }

  getOccupancy(start: string, end: string) {
    return this.http.get<{ start: string; end: string; items: ApiOccupancyItem[] }>('/api/gestao/ocupacao/', {
      params: { start, end },
    });
  }
}
