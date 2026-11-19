import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CampusApiService, ApiEquipment, ApiReservation } from '../../core/campus-api.service';
import { apiErrorMessage } from '../../core/api-error';
import { EnvironmentDetail } from '../environment-detail/environment-detail.models';
import { EnvironmentDetailService } from '../environment-detail/environment-detail.service';
import { ReservationFormErrors } from './reservation-request.models';
import { localIsoDate } from '../../core/local-date';

@Component({
  selector: 'app-reservation-request-page', standalone: true, imports: [RouterLink],
  templateUrl: './reservation-request.page.html', styleUrl: './reservation-request.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationRequestPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CampusApiService);
  private readonly detailService = inject(EnvironmentDetailService);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly code = computed(() => this.params().get('codigo') ?? '');
  protected readonly environment = signal<EnvironmentDetail | null>(null);
  protected readonly equipment = signal<readonly ApiEquipment[]>([]);
  protected readonly equipmentQuantities = signal<Readonly<Record<string, number>>>({});
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly date = computed(() => this.queryParams().get('data') ?? localIsoDate());
  protected readonly startTime = computed(() => this.queryParams().get('inicio') ?? '08:00');
  protected readonly endTime = computed(() => this.queryParams().get('fim') ?? '10:00');
  protected readonly purpose = signal('');
  protected readonly participants = signal('');
  protected readonly observations = signal('');
  protected readonly acceptedRules = signal(false);
  protected readonly attempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly success = signal<ApiReservation | null>(null);
  protected readonly storageError = signal('');
  protected readonly equipmentError = signal('');
  protected readonly errors = signal<ReservationFormErrors>({ purpose: '', participants: '', period: '', acceptedRules: '' });
  protected readonly formattedDate = computed(() => {
    const value = new Date(`${this.date()}T12:00:00`);
    return Number.isNaN(value.getTime()) ? 'Data não informada' : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(value);
  });
  protected readonly durationLabel = computed(() => {
    const minutes = this.toMinutes(this.endTime()) - this.toMinutes(this.startTime());
    if (!Number.isFinite(minutes) || minutes <= 0) return 'Período inválido';
    return minutes % 60 === 0 ? `${minutes / 60} ${minutes / 60 === 1 ? 'hora' : 'horas'}` : `${minutes} minutos`;
  });
  protected readonly changePeriodRoute = computed(() => ['/ambientes', this.code()]);
  protected readonly changePeriodQueryParams = computed(() => ({ data: this.date(), inicio: this.startTime(), fim: this.endTime() }));

  constructor() {
    forkJoin({ environment: this.detailService.getEnvironment(this.code()), equipment: this.api.getEquipments() }).subscribe({
      next: ({ environment, equipment }) => { this.environment.set(environment); this.equipment.set(equipment); this.loading.set(false); },
      error: error => { this.loadError.set(apiErrorMessage(error)); this.loading.set(false); },
    });
  }

  protected setPurpose(event: Event): void { this.purpose.set((event.target as HTMLTextAreaElement).value); }
  protected setParticipants(event: Event): void { this.participants.set((event.target as HTMLInputElement).value); }
  protected setObservations(event: Event): void { this.observations.set((event.target as HTMLTextAreaElement).value); }
  protected setAccepted(event: Event): void { this.acceptedRules.set((event.target as HTMLInputElement).checked); }
  protected setEquipmentQuantity(code: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const quantity = Math.max(0, Math.min(Number(input.value) || 0, Number(input.max) || 0));
    this.equipmentQuantities.update(values => ({ ...values, [code]: quantity }));
  }
  protected equipmentQuantity(code: string): number { return this.equipmentQuantities()[code] ?? 0; }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.success() || this.submitting()) return;
    this.attempted.set(true);
    const room = this.environment();
    const count = Number(this.participants());
    const errors: ReservationFormErrors = {
      purpose: !this.purpose().trim() ? 'Informe a finalidade da reserva.' : this.purpose().trim().length > 200 ? 'A finalidade deve ter no máximo 200 caracteres.' : '',
      participants: !Number.isInteger(count) || count < 1 || count > (room?.capacity ?? 0) ? `Informe um valor entre 1 e ${room?.capacity ?? 0} participantes.` : '',
      period: !this.validDate(this.date()) || this.toMinutes(this.endTime()) <= this.toMinutes(this.startTime())
        ? 'O período informado é inválido.' : '',
      acceptedRules: this.acceptedRules() ? '' : 'Confirme o compromisso com as regras de utilização.',
    };
    this.errors.set(errors);
    if (Object.values(errors).some(Boolean) || !room) return;

    this.storageError.set('');
    this.equipmentError.set('');
    this.submitting.set(true);
    this.api.createReservation({
      environmentCode: room.code,
      date: this.date(), startTime: this.startTime(), endTime: this.endTime(),
      purpose: this.purpose().trim(), participants: count,
      observations: this.observations().trim() || undefined,
      equipments: this.equipment().flatMap(item => this.equipmentQuantity(item.code) > 0
        ? [{ code: item.code, quantity: this.equipmentQuantity(item.code) }]
        : []),
    }).subscribe({
      next: reservation => { this.success.set(reservation); this.submitting.set(false); },
      error: error => {
        if (error instanceof HttpErrorResponse && error.error && typeof error.error === 'object') {
          const body = error.error as Record<string, unknown>;
          const first = (key: string) => Array.isArray(body[key]) ? String((body[key] as unknown[])[0]) : '';
          this.errors.update(current => ({
            ...current,
            purpose: first('purpose') || current.purpose,
            participants: first('participants') || current.participants,
            period: first('startTime') || first('endTime') || first('environmentCode') || first('non_field_errors') || current.period,
          }));
          this.equipmentError.set(first('equipments'));
        }
        this.storageError.set(apiErrorMessage(error));
        this.submitting.set(false);
      },
    });
  }

  private validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && localIsoDate(date) === value;
  }
  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : Number.NaN;
  }
}
