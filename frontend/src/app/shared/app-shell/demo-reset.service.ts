import { Injectable } from '@angular/core';
import { MANAGEMENT_DECISIONS_STORAGE_KEY } from '../../features/reservation-management/reservation-management.fixtures';
import { RESERVATION_STORAGE_KEY } from '../../features/reservation-request/reservation-request.fixtures';

export const DEMONSTRATION_STORAGE_KEYS = [
  RESERVATION_STORAGE_KEY,
  MANAGEMENT_DECISIONS_STORAGE_KEY,
] as const;

export type DemoResetResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

@Injectable({ providedIn: 'root' })
export class DemoResetService {
  resetLocalDemonstration(): DemoResetResult {
    try {
      for (const key of DEMONSTRATION_STORAGE_KEYS) globalThis.localStorage?.removeItem(key);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Não foi possível limpar todos os dados demonstrativos deste navegador.' };
    }
  }
}
