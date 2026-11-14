import { Routes } from '@angular/router';
import { RoutePlaceholder } from './shared/route-placeholder/route-placeholder';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { path: 'mapa', component: RoutePlaceholder, data: { title: 'Mapa do campus' } },
  { path: 'salas', component: RoutePlaceholder, data: { title: 'Salas' } },
  {
    path: 'minhas-reservas',
    component: RoutePlaceholder,
    data: { title: 'Minhas reservas' },
  },
  { path: '**', redirectTo: 'mapa' },
];
