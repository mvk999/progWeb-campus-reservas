import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { LegacyRoomsPage } from './legacy-rooms.page';

describe('LegacyRoomsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacyRoomsPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage() {
    const fixture = TestBed.createComponent(LegacyRoomsPage);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the independent legacy brand, context, navigation and six synthetic rooms', () => {
    const host = createPage().nativeElement as HTMLElement;
    expect(host.querySelector('.legacy-brand__name')?.textContent).toBe('Campus Reservas');
    expect(host.querySelector('.legacy-header__inner > p')?.textContent).toBe('Serviços à comunidade acadêmica');
    expect(host.querySelectorAll('.legacy-nav__inner > *').length).toBe(3);
    expect(host.textContent).toContain('Equipamentos');
    expect(host.textContent).toContain('Minhas reservas');
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(6);
    expect(host.querySelectorAll('.agenda-table thead th').length).toBe(16);
    expect(host.textContent).toContain('Dados fictícios para demonstração');
    expect(host.textContent).toContain('Aprovado');
    expect(host.textContent).toContain('Pendente');
    expect(host.textContent).toContain('Bloqueado');
  });

  it('searches both synthetic laboratory rows and shows the observed empty state', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.value = 'Laboratório';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(2);

    search.value = 'zzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelector('.empty-state h3')?.textContent).toBe('Nenhum recurso encontrado');
    expect(host.querySelector('.empty-state p')?.textContent).toContain('Altere os filtros ou pesquise por outro nome.');
    host.querySelector<HTMLButtonElement>('.empty-state button')!.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(6);
  });

  it('applies basic filters only after submit and toggles list with the observed period/actions', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const building = host.querySelector<HTMLSelectElement>('.filter-grid label:nth-child(3) select')!;
    building.value = 'DCC';
    building.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(6);
    host.querySelector<HTMLButtonElement>('.button--primary')!.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(2);

    host.querySelector<HTMLButtonElement>('.view-toggle button:last-child')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.rooms-table thead')?.textContent).toContain('Capacidade');
    expect(host.querySelector('.rooms-table thead')?.textContent).toContain('Características');
    expect(host.querySelector('.list-period')?.textContent).toContain('08:00 às 10:00');
    expect(host.querySelector('.list-period button')?.textContent).toBe('Alterar período');
    expect(host.querySelectorAll('.rooms-table tbody a[routerLink="/salas"]').length).toBe(2);
  });

  it('expands refinement and clears search and applied filters', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.refine-button')!.click();
    fixture.detectChanges();
    expect(host.querySelector('.advanced-panel')).not.toBeNull();
    expect(host.textContent).toContain('Somente disponíveis neste período');
    expect(host.textContent).toContain('Acessibilidade');

    const building = host.querySelector<HTMLSelectElement>('.filter-grid label:nth-child(3) select')!;
    building.value = 'DCC';
    building.dispatchEvent(new Event('change', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('.button--primary')!.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(2);
    host.querySelector<HTMLButtonElement>('.button--quiet')!.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(6);
    expect(host.querySelector<HTMLSelectElement>('.filter-grid label:nth-child(3) select')?.value).toBe('');
  });

  it('uses status-aware local sorting by capacity', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const sort = host.querySelector<HTMLSelectElement>('.results-heading select')!;
    sort.value = 'capacidade';
    sort.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    const firstRoom = host.querySelector('.agenda-table tbody tr .room-cell')?.textContent;
    expect(firstRoom).toContain('Sala de estudo 101');
  });
});
