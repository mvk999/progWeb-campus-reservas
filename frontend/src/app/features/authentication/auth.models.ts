export type DemoProfileId = 'solicitante' | 'responsavel' | 'administrador';

export interface DemoProfileOption {
  readonly id: DemoProfileId;
  readonly label: string;
  readonly description: string;
  readonly homePath: string;
}

export type DemoProfileReadResult =
  | { readonly ok: true; readonly profile: DemoProfileId }
  | { readonly ok: false; readonly message: string };
