export type ManagementRequestStatus = 'Pendente' | 'Aprovada' | 'Rejeitada' | 'Cancelada' | 'Concluída';
export type ManagementDecision = 'Aprovada' | 'Rejeitada';

export interface ManagementRequest {
  readonly id: number;
  readonly requesterLabel: string;
  readonly environmentCode: string;
  readonly environmentName: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: ManagementRequestStatus;
  readonly purpose: string;
  readonly participants: number | null;
  readonly observations: string;
  readonly hasConflictNotice: boolean;
}
