import { Routes } from '@angular/router';
import { RoutePlaceholder } from './shared/route-placeholder/route-placeholder';
import { CampusMapPage } from './features/campus-map/campus-map.page';
import { RoomsPage } from './features/rooms/rooms.page';
import { EnvironmentDetailPage } from './features/environment-detail/environment-detail.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { path: 'mapa', component: CampusMapPage },
  { path: 'salas', component: RoomsPage },
  {
    path: 'minhas-reservas',
    component: RoutePlaceholder,
    data: { title: 'Minhas reservas' },
  },
  {
    path: 'ambientes/:codigo',
    component: EnvironmentDetailPage,
  },
  {
    path: 'solicitar/:codigo',
    component: RoutePlaceholder,
    data: { title: 'Solicitar reserva' },
  },
  { path: '**', redirectTo: 'mapa' },
];
