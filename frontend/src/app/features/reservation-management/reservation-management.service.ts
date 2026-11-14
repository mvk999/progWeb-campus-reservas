import { Injectable } from '@angular/core';
import {
  MANAGEMENT_DECISIONS_STORAGE_KEY,
  MANAGEMENT_REQUEST_FIXTURES,
  MANAGED_RESOURCE_COUNT,
} from './reservation-management.fixtures';
import {
  DemonstrationManagementRequest,
  ManagementDecision,
  ManagementDecisionRecord,
  ManagementReadResult,
  ManagementRequestStatus,
} from './reservation-management.models';

@Injectable({ providedIn: 'root' })
export class ReservationManagementService {
  readonly managedResourceCount = MANAGED_RESOURCE_COUNT;

  readDecisions(): ManagementReadResult {
    let raw: string | null | undefined;
    try { raw = globalThis.localStorage?.getItem(MANAGEMENT_DECISIONS_STORAGE_KEY); }
    catch { return { ok: false, message: 'Não foi possível ler as decisões demonstrativas salvas.' }; }
    if (!raw) return { ok: true, decisions: [] };
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { return { ok: false, message: 'Os dados locais de gestão estão inválidos.' }; }
    if (!Array.isArray(parsed) || !parsed.every((item) => this.isDecision(item))) {
      return { ok: false, message: 'Os dados locais de gestão têm um formato inválido.' };
    }
    return { ok: true, decisions: parsed };
  }

  getRequests(decisions: readonly ManagementDecisionRecord[] = []): readonly DemonstrationManagementRequest[] {
    return MANAGEMENT_REQUEST_FIXTURES.map((request) => {
      const decision = decisions.find((item) => item.requestId === request.id);
      return decision && request.status === 'Pendente' ? { ...request, status: decision.status } : request;
    });
  }

  decide(requestId: string, status: ManagementDecision): boolean {
    const current = this.readDecisions();
    if (!current.ok) throw new Error(current.message);
    const next: ManagementDecisionRecord[] = [
      ...current.decisions.filter((item) => item.requestId !== requestId),
      { requestId, status, decidedAt: new Date().toISOString() },
    ];
    globalThis.localStorage?.setItem(MANAGEMENT_DECISIONS_STORAGE_KEY, JSON.stringify(next));
    return true;
  }

  countByStatus(requests: readonly DemonstrationManagementRequest[], status: ManagementRequestStatus): number {
    return requests.filter((request) => request.status === status).length;
  }

  private isDecision(value: unknown): value is ManagementDecisionRecord {
    if (!value || typeof value !== 'object') return false;
    const record = value as Partial<ManagementDecisionRecord>;
    return typeof record.requestId === 'string' &&
      (record.status === 'Aprovada' || record.status === 'Rejeitada') &&
      typeof record.decidedAt === 'string' && !Number.isNaN(Date.parse(record.decidedAt));
  }
}
