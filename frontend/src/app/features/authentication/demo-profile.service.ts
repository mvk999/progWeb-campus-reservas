import { Injectable, computed, signal } from '@angular/core';
import { DEMO_PROFILE_OPTIONS, DEMO_PROFILE_STORAGE_KEY } from './auth.fixtures';
import { DemoProfileId, DemoProfileOption, DemoProfileReadResult } from './auth.models';

@Injectable({ providedIn: 'root' })
export class DemoProfileService {
  private readonly initialRead = this.readSavedProfile();
  readonly profileId = signal<DemoProfileId>(this.initialRead.ok ? this.initialRead.profile : 'solicitante');
  readonly storageError = signal(this.initialRead.ok ? '' : this.initialRead.message);
  readonly notice = signal('');
  readonly profile = computed(() => this.optionFor(this.profileId()));
  readonly options = DEMO_PROFILE_OPTIONS;

  selectProfile(profile: DemoProfileId): boolean {
    try {
      globalThis.localStorage?.setItem(DEMO_PROFILE_STORAGE_KEY, profile);
    } catch {
      this.storageError.set('Não foi possível salvar o perfil demonstrativo neste navegador. A seleção atual foi mantida.');
      return false;
    }
    this.profileId.set(profile);
    this.storageError.set('');
    this.notice.set(`Perfil de demonstração alterado para ${this.optionFor(profile).label}.`);
    return true;
  }

  loginAsRequester(): boolean {
    if (!this.selectProfile('solicitante')) return false;
    this.notice.set('Acesso demonstrativo iniciado como Solicitante.');
    return true;
  }

  clearNotice(): void { this.notice.set(''); }

  optionFor(id: DemoProfileId): DemoProfileOption {
    return DEMO_PROFILE_OPTIONS.find((option) => option.id === id) ?? DEMO_PROFILE_OPTIONS[0];
  }

  private readSavedProfile(): DemoProfileReadResult {
    let saved: string | null | undefined;
    try {
      saved = globalThis.localStorage?.getItem(DEMO_PROFILE_STORAGE_KEY);
    } catch {
      return { ok: false, message: 'Não foi possível ler o perfil de demonstração salvo neste navegador.' };
    }
    if (saved == null || saved === '') return { ok: true, profile: 'solicitante' };
    if (DEMO_PROFILE_OPTIONS.some((option) => option.id === saved)) {
      return { ok: true, profile: saved as DemoProfileId };
    }
    return { ok: false, message: 'O perfil salvo está inválido. Selecione um perfil demonstrativo novamente.' };
  }
}
