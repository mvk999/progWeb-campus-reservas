import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LocalReservationView, MyReservationsTab, PersonalCalendarDay } from './my-reservations.models';
import { MyReservationsService } from './my-reservations.service';

@Component({
  selector: 'app-my-reservations-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './my-reservations.page.html',
  styleUrl: './my-reservations.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyReservationsPage {
  private readonly reservationsService = inject(MyReservationsService);
  protected readonly readResult = signal(this.reservationsService.getLocalReservations());
  protected readonly localReservations = computed(() => {
    const result = this.readResult();
    return result.ok ? result.reservations : [];
  });
  protected readonly storageError = computed(() => {
    const result = this.readResult();
    return result.ok ? '' : result.message;
  });
  protected readonly tab = signal<MyReservationsTab>('upcoming');
  protected readonly situationFilter = signal('all');
  protected readonly today = this.toIsoDate(new Date());
  protected readonly month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12));
  protected readonly totalRegistered = computed(() => this.storageError() ? '—' : `${this.localReservations().length}`);
  protected readonly pendingCount = computed(() => this.storageError() || this.localReservations().length ? '—' : '0');
  protected readonly approvedCount = computed(() => this.storageError() || this.localReservations().length ? '—' : '0');
  protected readonly monthLabel = computed(() => new Intl.DateTimeFormat('pt-BR', {
    month: 'long', year: 'numeric',
  }).format(this.month()));
  protected readonly calendarDays = computed(() => this.buildCalendar());
  protected readonly visibleReservations = computed(() => {
    const reservations = this.localReservations();
    if (this.situationFilter() !== 'all') return [];
    if (this.tab() === 'upcoming') return reservations.filter((item) => item.date >= this.today);
    if (this.tab() === 'history') return reservations.filter((item) => item.date < this.today);
    return reservations.filter((item) => item.date.startsWith(this.monthPrefix()));
  });
  protected readonly monthReservations = computed(() => this.localReservations()
    .filter((reservation) => reservation.date.startsWith(this.monthPrefix())));
  protected readonly isEmpty = computed(() => this.readResult().ok && (this.tab() === 'calendar'
    ? this.monthReservations().length === 0
    : this.visibleReservations().length === 0));

  protected selectTab(tab: MyReservationsTab): void { this.tab.set(tab); }
  protected setSituation(event: Event): void { this.situationFilter.set((event.target as HTMLSelectElement).value); }
  protected retryRead(): void { this.readResult.set(this.reservationsService.getLocalReservations()); }
  protected moveMonth(delta: number): void {
    const current = this.month();
    this.month.set(new Date(current.getFullYear(), current.getMonth() + delta, 1, 12));
  }
  protected roomRoute(reservation: LocalReservationView): string[] {
    return ['/ambientes', reservation.environmentCode];
  }
  protected formatDate(value: string): string {
    const date = new Date(`${value}T12:00:00`);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  }
  protected formatCreatedAt(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
  }
  protected trackReservation(_index: number, reservation: LocalReservationView): string { return reservation.id; }

  private monthPrefix(): string {
    const year = this.month().getFullYear();
    const month = `${this.month().getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private buildCalendar(): (PersonalCalendarDay | null)[] {
    const month = this.month();
    const year = month.getFullYear();
    const monthNumber = month.getMonth();
    const firstWeekday = (new Date(year, monthNumber, 1, 12).getDay() + 6) % 7;
    const lastDay = new Date(year, monthNumber + 1, 0, 12).getDate();
    const blanks: (PersonalCalendarDay | null)[] = Array.from({ length: firstWeekday }, () => null);
    const days = Array.from({ length: lastDay }, (_, index): PersonalCalendarDay => {
      const date = `${year}-${`${monthNumber + 1}`.padStart(2, '0')}-${`${index + 1}`.padStart(2, '0')}`;
      const reservations = this.monthReservations().filter((reservation) => reservation.date === date);
      return { date, dayNumber: index + 1, hasReservation: reservations.length > 0, reservations };
    });
    return [...blanks, ...days];
  }

  private toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  }
}
