import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { CampusApiService, ApiReservation } from '../../core/campus-api.service';
import { ManagementRequest, ManagementRequestStatus } from './reservation-management.models';

@Injectable({ providedIn: 'root' })
export class ReservationManagementService {
  private readonly api = inject(CampusApiService);

  getRequests(filters: { status?: string; environment?: string; date?: string } = {}) {
    return this.api.getManagedReservations(filters).pipe(map(items => items.map(item => this.toRequest(item))));
  }
  approve(id: number) { return this.api.approveReservation(id); }
  reject(id: number, justification: string) { return this.api.rejectReservation(id, justification); }
  countByStatus(requests: readonly ManagementRequest[], status: ManagementRequestStatus): number {
    return requests.filter(request => request.status === status).length;
  }

  private toRequest(item: ApiReservation): ManagementRequest {
    const status: Record<ApiReservation['status'], ManagementRequestStatus> = {
      PENDENTE: 'Pendente', APROVADA: 'Aprovada', REJEITADA: 'Rejeitada', CANCELADA: 'Cancelada', CONCLUIDA: 'Concluída',
    };
    return {
      id: item.id,
      requesterLabel: item.requester.name,
      environmentCode: item.environmentCode,
      environmentName: item.environmentName,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      status: status[item.status],
      purpose: item.purpose,
      participants: item.participants,
      observations: item.observations,
      hasConflictNotice: item.hasConflict ?? false,
    };
  }
}
