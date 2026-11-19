import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalReservationView, MyReservationsTab, PersonalCalendarDay } from './my-reservations.models';
import { MyReservationsService } from './my-reservations.service';

@Component({
  selector: 'app-my-reservations-page', standalone: true, imports: [RouterLink],
  templateUrl: './my-reservations.page.html', styleUrl: './my-reservations.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyReservationsPage {
  protected readonly service = inject(MyReservationsService);
  protected readonly tab = signal<MyReservationsTab>('upcoming');
  protected readonly situationFilter = signal('all');
  protected readonly month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  protected readonly reservations = this.service.reservations;
  protected readonly storageError = this.service.error;
  protected readonly totalRegistered = computed(() => `${this.reservations().length}`);
  protected readonly pendingCount = computed(() => this.reservations().filter(item => item.status === 'PENDENTE').length);
  protected readonly approvedCount = computed(() => this.reservations().filter(item => item.status === 'APROVADA').length);
  protected readonly monthLabel = computed(() => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.month()));
  protected readonly calendarDays = computed(() => this.buildCalendar());
  protected readonly visibleReservations = computed(() => {
    const records = this.reservations();
    return records.filter(item => this.situationFilter() === 'all' || item.status === this.situationFilter());
  });
  protected readonly monthReservations = computed(() => this.reservations().filter(item => item.date.startsWith(this.monthPrefix())));
  protected readonly isEmpty = computed(() => this.service.error() === '' && this.reservations().length === 0);

  constructor() { this.service.load('upcoming'); }

  protected selectTab(tab: MyReservationsTab): void { this.tab.set(tab); this.service.load(tab); }
  protected setSituation(event: Event): void { this.situationFilter.set((event.target as HTMLSelectElement).value); }
  protected retryRead(): void { this.service.load(this.tab()); }
  protected moveMonth(delta: number): void {
    const current = this.month(); this.month.set(new Date(current.getFullYear(), current.getMonth() + delta, 1, 12));
    if (this.tab() === 'calendar') this.service.load('calendar');
  }
  protected cancel(reservation: LocalReservationView): void {
    if (reservation.canCancel) this.service.cancel(reservation.id, this.tab());
  }
  protected roomRoute(reservation: LocalReservationView): string[] { return ['/ambientes', reservation.environmentCode]; }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`)); }
  protected formatCreatedAt(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
  }
  protected trackReservation(_index: number, reservation: LocalReservationView): number { return reservation.id; }
  private monthPrefix(): string { return `${this.month().getFullYear()}-${String(this.month().getMonth() + 1).padStart(2, '0')}`; }
  private buildCalendar(): (PersonalCalendarDay | null)[] {
    const month = this.month(), year = month.getFullYear(), monthNumber = month.getMonth();
    const firstWeekday = (new Date(year, monthNumber, 1, 12).getDay() + 6) % 7;
    const lastDay = new Date(year, monthNumber + 1, 0, 12).getDate();
    const blanks: (PersonalCalendarDay | null)[] = Array.from({ length: firstWeekday }, () => null);
    const days = Array.from({ length: lastDay }, (_, index): PersonalCalendarDay => {
      const date = `${year}-${String(monthNumber + 1).padStart(2, '0')}-${String(index + 1).padStart(2, '0')}`;
      const reservations = this.monthReservations().filter(item => item.date === date);
      return { date, dayNumber: index + 1, hasReservation: reservations.length > 0, reservations };
    });
    return [...blanks, ...days];
  }
}
