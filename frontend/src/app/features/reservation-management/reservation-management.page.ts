import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiErrorMessage } from '../../core/api-error';
import { ManagementDecision, ManagementRequest, ManagementRequestStatus } from './reservation-management.models';
import { ReservationManagementService } from './reservation-management.service';

@Component({
  selector: 'app-reservation-management-page', standalone: true, imports: [RouterLink],
  templateUrl: './reservation-management.page.html', styleUrl: './reservation-management.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationManagementPage {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly service = inject(ReservationManagementService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected readonly requests = signal<readonly ManagementRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly storageError = signal('');
  protected readonly resourceFilter = signal('all');
  protected readonly statusFilter = signal<'all' | ManagementRequestStatus>('all');
  protected readonly selectedRequest = signal<ManagementRequest | null>(null);
  protected readonly decisionError = signal('');
  protected readonly justification = signal('');
  protected readonly savingDecision = signal(false);
  protected readonly toast = signal('');
  protected readonly resources = computed(() => [...new Set(this.requests().map(request => request.environmentCode))]);
  protected readonly managedResourceCount = computed(() => this.resources().length);
  protected readonly pendingCount = computed(() => this.service.countByStatus(this.requests(), 'Pendente'));
  protected readonly approvedCount = computed(() => this.service.countByStatus(this.requests(), 'Aprovada'));
  protected readonly visibleRequests = computed(() => this.requests().filter(request =>
    (this.resourceFilter() === 'all' || request.environmentCode === this.resourceFilter()) &&
    (this.statusFilter() === 'all' || request.status === this.statusFilter()),
  ));
  protected readonly selectedReadOnly = computed(() => this.selectedRequest()?.status !== 'Pendente');
  protected readonly modalTitle = computed(() => this.selectedRequest()?.status === 'Pendente' ? 'Analisar solicitação' : 'Detalhes da solicitação');
  @ViewChild('firstModalControl') private firstModalControl?: ElementRef<HTMLButtonElement>;
  @ViewChild('modalDialog') private modalDialog?: ElementRef<HTMLElement>;
  private returnFocus?: HTMLElement;

  constructor() { this.loadRequests(); }

  protected loadRequests(): void {
    this.loading.set(true); this.storageError.set('');
    this.service.getRequests().subscribe({
      next: requests => { this.requests.set(requests); this.loading.set(false); },
      error: error => { this.requests.set([]); this.storageError.set(apiErrorMessage(error)); this.loading.set(false); },
    });
  }
  protected setResourceFilter(event: Event): void { this.resourceFilter.set((event.target as HTMLSelectElement).value); }
  protected setStatusFilter(event: Event): void { this.statusFilter.set((event.target as HTMLSelectElement).value as 'all' | ManagementRequestStatus); }
  protected updateJustification(event: Event): void { this.justification.set((event.target as HTMLTextAreaElement).value); }
  protected statusClass(status: ManagementRequestStatus): string { return `status--${status.toLocaleLowerCase('pt-BR')}`; }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`)); }
  protected trackRequest(_index: number, request: ManagementRequest): number { return request.id; }

  protected openDetails(request: ManagementRequest, event: Event): void {
    this.returnFocus = event.currentTarget as HTMLElement; this.selectedRequest.set(request);
    this.decisionError.set(''); this.justification.set(''); this.changeDetector.detectChanges();
    this.firstModalControl?.nativeElement.focus();
  }
  protected closeDialog(restoreFocus = true): void {
    this.selectedRequest.set(null); this.decisionError.set(''); this.justification.set(''); this.changeDetector.detectChanges();
    if (restoreFocus) this.returnFocus?.focus();
  }
  protected onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') { event.preventDefault(); this.closeDialog(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...(this.modalDialog?.nativeElement.querySelectorAll('button:not([disabled]), a[href], textarea:not([disabled])') ?? [])] as HTMLElement[];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  protected onBackdropClick(event: MouseEvent): void { if (event.target === event.currentTarget) this.closeDialog(); }

  protected decide(status: ManagementDecision): void {
    const selected = this.selectedRequest();
    if (!selected || selected.status !== 'Pendente' || this.savingDecision()) return;
    if (status === 'Rejeitada' && !this.justification().trim()) { this.decisionError.set('Informe a justificativa da rejeição.'); return; }
    this.savingDecision.set(true); this.decisionError.set('');
    const request = status === 'Aprovada'
      ? this.service.approve(selected.id)
      : this.service.reject(selected.id, this.justification().trim());
    request.subscribe({
      next: () => {
        this.savingDecision.set(false);
        this.toast.set(`Solicitação ${status.toLocaleLowerCase('pt-BR')} no sistema.`);
        this.closeDialog(false); this.loadRequests();
        const root = this.host.nativeElement;
        (root.querySelector('#requests-title') as HTMLElement | null)?.focus();
      },
      error: error => { this.savingDecision.set(false); this.decisionError.set(apiErrorMessage(error)); },
    });
  }
  protected clearToast(): void { this.toast.set(''); }
}
