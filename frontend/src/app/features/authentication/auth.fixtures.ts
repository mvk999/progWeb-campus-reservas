import { DemoProfileOption } from './auth.models';

export const DEMO_PROFILE_OPTIONS: readonly DemoProfileOption[] = [
  { id: 'solicitante', label: 'Solicitante', description: 'Mapa, salas e minhas reservas', homePath: '/mapa' },
  { id: 'responsavel', label: 'Responsável', description: 'Gestão demonstrativa de solicitações', homePath: '/gestao' },
  { id: 'administrador', label: 'Administrador', description: 'Administração demonstrativa', homePath: '/admin' },
];

export const DEMO_PROFILE_STORAGE_KEY = 'campus-reservas:demo:profile';
