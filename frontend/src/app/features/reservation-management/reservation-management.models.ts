export type ManagementRequestStatus = 'Pendente' | 'Aprovada' | 'Rejeitada' | 'Cancelada';
export type ManagementDecision = 'Aprovada' | 'Rejeitada';

export interface DemonstrationManagementRequest {
  readonly id: string;
  readonly requesterLabel: string;
  readonly environmentCode: string;
  readonly environmentName: string;
  readonly buildingCode: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly status: ManagementRequestStatus;
  readonly purpose: string;
  readonly participants: number;
  readonly observations: string;
  readonly hasConflictNotice: boolean;
}

export interface ManagementDecisionRecord {
  readonly requestId: string;
  readonly status: ManagementDecision;
  readonly decidedAt: string;
}

export type ManagementReadResult =
  | { readonly ok: true; readonly decisions: readonly ManagementDecisionRecord[] }
  | { readonly ok: false; readonly message: string };
