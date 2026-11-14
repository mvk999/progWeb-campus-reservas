import { Routes } from '@angular/router';
import { RoutePlaceholder } from './shared/route-placeholder/route-placeholder';
import { CampusMapPage } from './features/campus-map/campus-map.page';
import { RoomsPage } from './features/rooms/rooms.page';
import { EnvironmentDetailPage } from './features/environment-detail/environment-detail.page';
import { ReservationRequestPage } from './features/reservation-request/reservation-request.page';
import { MyReservationsPage } from './features/my-reservations/my-reservations.page';
import { LoginPage } from './features/authentication/login.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { path: 'mapa', component: CampusMapPage },
  { path: 'salas', component: RoomsPage },
  { path: 'login', component: LoginPage },
  {
    path: 'minhas-reservas',
    component: MyReservationsPage,
  },
  {
    path: 'ambientes/:codigo',
    component: EnvironmentDetailPage,
  },
  {
    path: 'solicitar/:codigo',
    component: ReservationRequestPage,
  },
  { path: 'gestao', component: RoutePlaceholder, data: { title: 'Gestão de reservas · demonstração' } },
  { path: 'admin', component: RoutePlaceholder, data: { title: 'Administração · demonstração' } },
  { path: '**', redirectTo: 'mapa' },
];
