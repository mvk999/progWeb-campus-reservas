import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ColorToken {
  readonly name: string;
  readonly value: string;
  readonly use: string;
}

@Component({
  selector: 'app-interface-guide-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './interface-guide.page.html',
  styleUrl: './interface-guide.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterfaceGuidePage {
  protected readonly colors: readonly ColorToken[] = [
    { name: 'Azul principal', value: '#2C4E70', use: 'Ações principais e navegação' },
    { name: 'Azul secundário', value: '#58748F', use: 'Ações de apoio e detalhes' },
    { name: 'Texto principal', value: '#263340', use: 'Títulos e conteúdo' },
    { name: 'Texto secundário', value: '#516171', use: 'Descrições e informações auxiliares' },
  ];
  protected readonly breakpoints = [
    { width: '1150px', use: 'Ajuste do conteúdo e colunas' },
    { width: '780px', use: 'Composição para telas médias' },
    { width: '480px', use: 'Composição para telas estreitas' },
  ];
  protected trackColor(_index: number, token: ColorToken): string { return token.value; }
  protected trackBreakpoint(_index: number, item: (typeof this.breakpoints)[number]): string { return item.width; }
}
