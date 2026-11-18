import { Routes } from '@angular/router';
import { authGuard } from './features/authentication/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mapa' },
  { path: 'mapa', loadComponent: () => import('./features/campus-map/campus-map.page').then(m => m.CampusMapPage) },
  { path: 'salas', loadComponent: () => import('./features/rooms/rooms.page').then(m => m.RoomsPage) },
  { path: 'login', loadComponent: () => import('./features/authentication/login.page').then(m => m.LoginPage) },
  { path: 'cadastro', loadComponent: () => import('./features/authentication/register.page').then(m => m.RegisterPage) },
  {
    path: 'minhas-reservas',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-reservations/my-reservations.page').then(m => m.MyReservationsPage),
  },
  {
    path: 'ambientes/:codigo',
    loadComponent: () => import('./features/environment-detail/environment-detail.page').then(m => m.EnvironmentDetailPage),
  },
  {
    path: 'solicitar/:codigo',
    loadComponent: () => import('./features/reservation-request/reservation-request.page').then(m => m.ReservationRequestPage),
  },
  { path: 'gestao', canActivate: [authGuard], loadComponent: () => import('./features/reservation-management/reservation-management.page').then(m => m.ReservationManagementPage) },
  { path: 'calendario', loadComponent: () => import('./features/occupancy-calendar/occupancy-calendar.page').then(m => m.OccupancyCalendarPage) },
  { path: '**', redirectTo: 'mapa' },
];
