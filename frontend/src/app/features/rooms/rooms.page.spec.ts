import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { CAMPUS_MAP_FIXTURE } from '../campus-map/campus-map.fixtures';
import { RoomsPage } from './rooms.page';

const demoRoomCount = CAMPUS_MAP_FIXTURE.buildings.reduce((count, building) => count + building.rooms.length, 0);

describe('RoomsPage', () => {
  it('starts with cards and keeps details and building map links available', () => {
    const fixture = createPage('cards');
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.room-card').length).toBe(demoRoomCount);
    expect(host.querySelector('.room-card h3 a')?.getAttribute('href')).toMatch(/^\/ambientes\//);
    expect(host.querySelector('.room-card__actions a')?.getAttribute('href')).toContain('/mapa?predio=');
  });
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomsPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage(view: 'agenda' | 'cards' = 'agenda') {
    const fixture = TestBed.createComponent(RoomsPage);
    fixture.detectChanges();
    if (view === 'agenda') {
      [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.view-toggle button')].find(button => button.textContent?.includes('Agenda'))!.click();
      fixture.detectChanges();
    }
    return fixture;
  }

  it('shows all local demo rooms, the observed week and hourly agenda', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(demoRoomCount);
    expect(host.querySelectorAll('.agenda-table thead th').length).toBe(16);
    expect(host.textContent).toContain('19–25 de outubro de 2026');
    expect(host.querySelector('.demo-disclaimer')?.textContent).toContain('disponibilidade não são reais');
  });

  it('searches PV4 and shows the observed empty state for unmatched text', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const search = host.querySelector<HTMLInputElement>('.search input')!;
    search.value = 'PV4';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(3);

    search.value = 'abcxyz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.textContent).toContain('Nenhum recurso encontrado');
    expect(host.textContent).toContain('Altere os filtros ou pesquise por outro nome.');
  });

  it('applies the DCC building filter to the three DCC rooms', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    const building = host.querySelector<HTMLSelectElement>('.filter-grid label:nth-child(3) select')!;
    building.value = 'DCC';
    building.dispatchEvent(new Event('change', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('.button--primary')!.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(3);
    expect(host.textContent).toContain('Ciência da Computação');
  });

  it('shows the confirmed approved example and clearly labeled representative states', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Aprovado');
    expect(host.textContent).toContain('Pendente');
    expect(host.textContent).toContain('Bloqueado');
    expect(host.textContent).toContain('Laboratório 101');
  });

  it('switches between agenda and list and opens local advanced controls', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    [...host.querySelectorAll<HTMLButtonElement>('.view-toggle button')].find(button => button.textContent?.includes('Lista'))!.click();
    fixture.detectChanges();
    expect(host.querySelector('.rooms-table')).not.toBeNull();
    expect(host.textContent).toContain('Disponibilidade da lista: 08:00 às 10:00');
    host.querySelector<HTMLButtonElement>('.refine-button')!.click();
    fixture.detectChanges();
    expect(host.textContent).toContain('Somente disponíveis neste período');
    expect(host.textContent).toContain('Ar-condicionado');
    expect(host.querySelector('.list-scroll')?.getAttribute('role')).toBe('region');
    expect(host.querySelector('.list-scroll')?.getAttribute('tabindex')).toBe('0');
  });

  it('filters local demo rooms by selected features and availability in the selected period', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('.refine-button')!.click();
    fixture.detectChanges();
    const airConditioning = [...host.querySelectorAll<HTMLInputElement>('.feature-checks input')]
      .find((input) => input.parentElement?.textContent?.includes('Ar-condicionado'))!;
    airConditioning.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(2);

    const start = host.querySelector<HTMLInputElement>('.time-fields input')!;
    const end = host.querySelectorAll<HTMLInputElement>('.time-fields input')[1];
    start.value = '10:00';
    start.dispatchEvent(new Event('input', { bubbles: true }));
    end.value = '12:00';
    end.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('.button--primary')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLInputElement>('.advanced-panel > .check-field input')!.click();
    fixture.detectChanges();
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(1);
    expect(host.querySelector('.agenda-table tbody th a')?.textContent).toContain('Sala 101');
  });

  it('moves the selected day and availability forward with the week control', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLButtonElement>('[aria-label="Próxima semana"]')!.click();
    fixture.detectChanges();
    expect(host.textContent).toContain('30/10/2026');
    expect(host.querySelector('.week-day--selected strong')?.textContent).toBe('30');
    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(demoRoomCount);
  });

  it('clears every filter and restores one coherent date and period', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLSelectElement>('.filter-grid label:nth-child(3) select')!.value = 'DCC';
    host.querySelector<HTMLSelectElement>('.filter-grid label:nth-child(3) select')!
      .dispatchEvent(new Event('change', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('.button--primary')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('.refine-button')!.click();
    fixture.detectChanges();
    host.querySelector<HTMLInputElement>('.feature-checks input')!.click();
    host.querySelector<HTMLInputElement>('.advanced-panel > .check-field input')!.click();
    host.querySelector<HTMLSelectElement>('.results-heading select')!.value = 'capacidade';
    host.querySelector<HTMLSelectElement>('.results-heading select')!
      .dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    const search = host.querySelector<HTMLInputElement>('.search input')!;
    search.value = 'PV4';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('[aria-label="Próxima semana"]')!.click();
    host.querySelector<HTMLButtonElement>('.query-actions .button--quiet')!.click();
    fixture.detectChanges();

    expect(host.querySelectorAll('.agenda-table tbody tr').length).toBe(demoRoomCount);
    expect(host.querySelector('.availability-heading')?.textContent).toContain('23/10/2026');
    expect(host.querySelector('.week-day--selected strong')?.textContent).toBe('23');
    expect(host.querySelector<HTMLSelectElement>('.results-heading select')?.value).toBe('nome');
    expect(host.querySelector<HTMLInputElement>('.search input')?.value).toBe('');
    expect(host.querySelector<HTMLInputElement>('.advanced-panel > .check-field input')?.checked).toBe(false);
    expect(host.querySelectorAll('.feature-checks input:checked').length).toBe(0);
    [...host.querySelectorAll<HTMLButtonElement>('.view-toggle button')].find(button => button.textContent?.includes('Lista'))!.click();
    fixture.detectChanges();
    expect(host.textContent).toContain('Disponibilidade da lista: 08:00 às 10:00');
  });

  it('associates temporal validation errors with the affected fields', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    host.querySelector<HTMLInputElement>('.filter-grid input[type="date"]')!.value = '';
    host.querySelector<HTMLInputElement>('.filter-grid input[type="date"]')!
      .dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('.button--primary')!.click();
    fixture.detectChanges();
    const date = host.querySelector<HTMLInputElement>('.filter-grid input[type="date"]')!;
    expect(date.getAttribute('aria-invalid')).toBe('true');
    expect(date.getAttribute('aria-describedby')).toBe('query-error');

    host.querySelector<HTMLButtonElement>('.refine-button')!.click();
    fixture.detectChanges();
    const start = host.querySelector<HTMLInputElement>('.time-fields input')!;
    const end = host.querySelectorAll<HTMLInputElement>('.time-fields input')[1];
    start.value = '12:00';
    start.dispatchEvent(new Event('input', { bubbles: true }));
    end.value = '09:00';
    end.dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('.button--primary')!.click();
    fixture.detectChanges();
    expect(start.getAttribute('aria-invalid')).toBe('true');
    expect(end.getAttribute('aria-describedby')).toBe('query-error');
  });

  it('moves through the selected days and reports an invalid period', () => {
    const fixture = createPage();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('23/10/2026');
    host.querySelector<HTMLButtonElement>('[aria-label="Próximo dia"]')!.click();
    fixture.detectChanges();
    expect(host.textContent).toContain('24/10/2026');

    host.querySelector<HTMLButtonElement>('.refine-button')!.click();
    fixture.detectChanges();
    const visibleTimes = host.querySelectorAll<HTMLInputElement>('.advanced-panel input[type="time"]');
    visibleTimes[0].value = '12:00';
    visibleTimes[0].dispatchEvent(new Event('input', { bubbles: true }));
    visibleTimes[1].value = '09:00';
    visibleTimes[1].dispatchEvent(new Event('input', { bubbles: true }));
    host.querySelector<HTMLButtonElement>('.button--primary')!.click();
    fixture.detectChanges();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('horário final posterior');
  });
});
