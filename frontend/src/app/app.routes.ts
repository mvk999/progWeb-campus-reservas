import { Routes } from '@angular/router';
import { CampusMapPage } from './features/campus-map/campus-map.page';
import { RoomsPage } from './features/rooms/rooms.page';
import { EnvironmentDetailPage } from './features/environment-detail/environment-detail.page';
import { ReservationRequestPage } from './features/reservation-request/reservation-request.page';
import { MyReservationsPage } from './features/my-reservations/my-reservations.page';
import { LoginPage } from './features/authentication/login.page';
import { ReservationManagementPage } from './features/reservation-management/reservation-management.page';
import { OccupancyCalendarPage } from './features/occupancy-calendar/occupancy-calendar.page';
import { AdministrationDemoPage } from './features/administration-demo/administration-demo.page';
import { InterfaceGuidePage } from './features/interface-guide/interface-guide.page';

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
  { path: 'gestao', component: ReservationManagementPage },
  { path: 'calendario', component: OccupancyCalendarPage },
  { path: 'admin', component: AdministrationDemoPage },
  { path: 'design', component: InterfaceGuidePage },
  { path: '**', redirectTo: 'mapa' },
];
