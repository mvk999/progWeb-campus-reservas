import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { AdministrationDemoPage } from './administration-demo.page';

describe('AdministrationDemoPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdministrationDemoPage],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  function createPage() {
    const fixture = TestBed.createComponent(AdministrationDemoPage);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the administration heading, demo copy and responsible dashboard link', () => {
    const host = createPage().nativeElement as HTMLElement;
    expect(host.querySelector('#page-title')?.textContent).toContain('Administração do campus');
    expect(host.textContent).toContain('Demonstração do cadastro de ambientes');
    expect(host.textContent).toContain('Consulta em modo de leitura');
    expect(host.querySelector('.manager-link')?.getAttribute('href')).toBe('/gestao');
    expect(host.querySelector('.manager-link')?.textContent).toContain('Painel do responsável');
  });

  it('lists the 21 local map environments and keeps unobserved actions read-only', () => {
    const host = createPage().nativeElement as HTMLElement;
    expect(host.querySelectorAll('.environment-table tbody tr').length).toBe(21);
    expect(host.querySelector('.environment-table tbody')?.textContent).toContain('AMB-001');
    expect(host.querySelector('.environment-table tbody')?.textContent).toContain('Sala 101');
    expect(host.querySelector('.environment-table tbody')?.textContent).toContain('PV4 · Pavilhão 4');
    expect(host.querySelector('.environment-table tbody')?.textContent).toContain('Não informado na demonstração');
    expect(host.querySelectorAll('.view-button').length).toBe(21);
    expect([...host.querySelectorAll<HTMLButtonElement>('.view-button')].every((button) => button.disabled)).toBe(true);
  });

  it('renders the observed menu while disabling sections without observed detail', () => {
    const host = createPage().nativeElement as HTMLElement;
    const labels = [...host.querySelectorAll('.menu-item')].map((item) => item.textContent?.trim() ?? '');
    expect(labels.some((label) => label.startsWith('Administração'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Usuários'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Grupos e permissões'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Ambientes'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Responsáveis'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Reservas'))).toBe(true);
    expect(labels.some((label) => label.startsWith('Bloqueios'))).toBe(true);
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('Ambientes');
    expect(host.querySelectorAll('.menu-item--disabled').length).toBe(6);
    expect(host.querySelectorAll('a.menu-item, button.menu-item').length).toBe(0);
  });

  it('maps /admin to the administration page', async () => {
    expect(await routes.find((route) => route.path === 'admin')?.loadComponent?.()).toBe(AdministrationDemoPage);
  });
});
