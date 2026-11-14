import { AdministrationMenuItem } from './administration-demo.models';

/** Menu inventory visible in the prototype. Only the Ambientes view is specified here. */
export const ADMINISTRATION_MENU_FIXTURE: readonly AdministrationMenuItem[] = [
  { label: 'Administração', available: false },
  { label: 'Usuários', available: false },
  { label: 'Grupos e permissões', available: false },
  { label: 'Ambientes', available: true },
  { label: 'Responsáveis', available: false },
  { label: 'Reservas', available: false },
  { label: 'Bloqueios', available: false },
];
