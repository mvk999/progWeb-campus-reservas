import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiAvailability } from '../../core/campus-api.service';
import { apiErrorMessage } from '../../core/api-error';
import { AvailabilityPeriod, CalendarDay, EnvironmentDetail, PeriodAvailability } from './environment-detail.models';
import { EnvironmentDetailService } from './environment-detail.service';
import { localIsoDate } from '../../core/local-date';

@Component({
  selector: 'app-environment-detail-page', standalone: true, imports: [RouterLink],
  templateUrl: './environment-detail.page.html', styleUrl: './environment-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(EnvironmentDetailService);
  protected readonly code = this.route.snapshot.paramMap.get('codigo') ?? '';
  protected readonly environment = signal<EnvironmentDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadingAvailability = signal(false);
  protected readonly loadError = signal('');
  protected readonly availabilityError = signal('');
  protected readonly availability = signal<ApiAvailability | null>(null);
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly hasEditedSelection = signal(false);
  private readonly initialDate = this.initialDateFromRoute();
  protected readonly month = signal(new Date(`${this.initialDate}T12:00:00`));
  protected readonly selectedDate = signal(this.initialDate);
  protected readonly selectedPeriod = signal(this.route.snapshot.queryParamMap.get('inicio') ?? '08:00');
  protected readonly selectedEndTime = signal(this.route.snapshot.queryParamMap.get('fim') ?? '10:00');
  protected readonly periods = signal<readonly AvailabilityPeriod[]>([]);
  protected readonly currentPeriod = computed<AvailabilityPeriod | null>(() => {
    const exact = this.periods().find(item => item.startTime === this.selectedPeriod() && item.endTime === this.selectedEndTime());
    if (exact) return exact;
    const availability = this.availability();
    return availability ? {
      startTime: this.selectedPeriod(), endTime: this.selectedEndTime(),
      availability: this.service.statusForPeriod(availability, this.selectedPeriod(), this.selectedEndTime()),
    } : null;
  });
  protected readonly days = computed(() => this.buildCalendarDays());
  protected readonly routeContextError = computed(() => {
    if (this.hasEditedSelection()) return '';
    const query = this.queryParams();
    const date = query.get('data'), start = query.get('inicio'), end = query.get('fim');
    if (!date && !start && !end) return '';
    if (!date || !this.isValidDate(date)) return 'A data recebida não é válida. Selecione outra data.';
    if (!start || !end || start >= end) return 'O período recebido não é válido.';
    if (this.service.isPastDate(date)) return 'Escolha uma data futura para solicitar uma reserva.';
    const currentAvailability = this.availability();
    if (date === this.selectedDate() && currentAvailability && this.service.statusForPeriod(currentAvailability, start, end) === 'unavailable') {
      return 'Este período não está disponível. Escolha outro horário.';
    }
    return '';
  });
  protected readonly canRequest = computed(() => {
    const period = this.currentPeriod();
    return !this.routeContextError() && !this.service.isPastDate(this.selectedDate()) &&
      !!period && period.availability !== 'unavailable';
  });
  protected readonly monthLabel = computed(() => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.month()));
  protected readonly selectedDateLabel = computed(() => this.formatDate(this.selectedDate()));
  protected readonly requestQueryParams = computed(() => ({ data: this.selectedDate(), inicio: this.currentPeriod()?.startTime ?? '', fim: this.currentPeriod()?.endTime ?? '' }));

  constructor() {
    if (!this.code) { this.loadError.set('Código do ambiente não informado.'); this.loading.set(false); return; }
    this.service.getEnvironment(this.code).subscribe({
      next: environment => { this.environment.set(environment); this.loading.set(false); },
      error: error => { this.loadError.set(apiErrorMessage(error)); this.loading.set(false); },
    });
    this.loadAvailability(this.selectedDate());
  }

  protected changeMonth(delta: number): void {
    const currentMonth = this.month(), selectedDate = new Date(`${this.selectedDate()}T12:00:00`);
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1, 12);
    this.month.set(next);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12).getDate();
    selectedDate.setFullYear(next.getFullYear(), next.getMonth(), Math.min(selectedDate.getDate(), lastDay));
    this.selectDateValue(this.toIsoDate(selectedDate));
  }
  protected selectDate(day: CalendarDay): void { if (!day.disabled) this.selectDateValue(day.date); }
  protected selectPeriod(period: AvailabilityPeriod): void {
    if (period.availability === 'unavailable') return;
    this.selectedPeriod.set(period.startTime); this.selectedEndTime.set(period.endTime); this.hasEditedSelection.set(true);
  }
  protected periodLabel(period: AvailabilityPeriod): string { return `${period.startTime}–${period.endTime}`; }
  protected periodStatusLabel(period: AvailabilityPeriod): string {
    return period.availability === 'available' ? 'Disponível' : period.availability === 'pending' ? 'Há pedido pendente; solicitação permitida' : 'Indisponível';
  }
  protected periodClass(status: PeriodAvailability): string { return `period-option--${status}`; }
  protected get requestRoute(): string[] { return ['/solicitar', this.code]; }

  private loadAvailability(date: string): void {
    this.loadingAvailability.set(true); this.availabilityError.set('');
    this.service.getAvailability(this.code, date).subscribe({
      next: availability => {
        this.availability.set(availability);
        this.periods.set(this.service.getPeriods(availability));
        this.loadingAvailability.set(false);
      },
      error: error => { this.periods.set([]); this.availabilityError.set(apiErrorMessage(error)); this.loadingAvailability.set(false); },
    });
  }

  private selectDateValue(date: string): void {
    this.selectedDate.set(date); this.selectedPeriod.set('08:00'); this.selectedEndTime.set('10:00');
    this.hasEditedSelection.set(true); this.availability.set(null); this.loadAvailability(date);
  }
  private buildCalendarDays(): (CalendarDay | null)[] {
    const year = this.month().getFullYear(), month = this.month().getMonth();
    const blanks: (CalendarDay | null)[] = Array.from({ length: (new Date(year, month, 1, 12).getDay() + 6) % 7 }, () => null);
    const count = new Date(year, month + 1, 0, 12).getDate();
    const days = Array.from({ length: count }, (_, index) => {
      const date = this.toIsoDate(new Date(year, month, index + 1, 12));
      return { date, dayNumber: index + 1, disabled: this.service.isPastDate(date) } satisfies CalendarDay;
    });
    return [...blanks, ...days];
  }
  private toIsoDate(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  private formatDate(value: string): string { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`)); }
  private initialDateFromRoute(): string {
    const queryDate = this.route.snapshot.queryParamMap.get('data');
    return queryDate && this.isValidDate(queryDate) ? queryDate : localIsoDate();
  }
  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T12:00:00`);
    return !Number.isNaN(parsed.getTime()) && localIsoDate(parsed) === value;
  }
}
