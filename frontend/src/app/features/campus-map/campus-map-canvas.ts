import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CampusBuilding } from './campus-map.models';

@Component({
  selector: 'app-campus-map-canvas',
  standalone: true,
  templateUrl: './campus-map-canvas.html',
  styleUrl: './campus-map-canvas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampusMapCanvas {
  private static readonly MAX_PAN_OFFSET = 320;
  @Input({ required: true }) campusName = 'UFLA';
  @Input({ required: true }) buildings: readonly CampusBuilding[] = [];
  @Input() selectedCode: string | null = null;
  @Output() buildingSelected = new EventEmitter<CampusBuilding>();

  protected readonly zoom = signal(1);
  protected readonly rotation = signal(0);
  protected readonly panX = signal(0);
  protected readonly panY = signal(0);
  protected readonly isThreeDimensional = signal(true);
  protected readonly isDragging = signal(false);
  private dragOrigin: {
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null = null;

  protected chooseBuilding(building: CampusBuilding): void {
    this.buildingSelected.emit(building);
  }

  protected zoomIn(): void {
    this.zoom.update((value) => Math.min(1.4, Number((value + 0.1).toFixed(2))));
  }

  protected zoomOut(): void {
    this.zoom.update((value) => Math.max(0.8, Number((value - 0.1).toFixed(2))));
  }

  protected rotateMap(): void {
    this.rotation.update((value) => (value + 30) % 360);
  }

  protected toggleMapMode(): void {
    this.isThreeDimensional.update((value) => !value);
  }

  protected resetMap(): void {
    this.zoom.set(1);
    this.rotation.set(0);
    this.panX.set(0);
    this.panY.set(0);
    this.isThreeDimensional.set(true);
    this.isDragging.set(false);
    this.dragOrigin = null;
  }

  protected beginPan(event: PointerEvent): void {
    if ((event.target as Element).closest('button')) return;
    this.dragOrigin = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: this.panX(),
      panY: this.panY(),
    };
    this.isDragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  protected movePan(event: PointerEvent): void {
    const origin = this.dragOrigin;
    if (!origin || origin.pointerId !== event.pointerId) return;
    this.panX.set(this.limitPan(origin.panX + event.clientX - origin.x));
    this.panY.set(this.limitPan(origin.panY + event.clientY - origin.y));
  }

  protected endPan(event: PointerEvent): void {
    if (this.dragOrigin?.pointerId !== event.pointerId) return;
    this.dragOrigin = null;
    this.isDragging.set(false);
  }

  protected moveMapWithKeyboard(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) return;
    const step = 40;
    const movement: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const offset = movement[event.key];
    if (!offset) return;
    event.preventDefault();
    this.panX.update((value) => this.limitPan(value + offset[0]));
    this.panY.update((value) => this.limitPan(value + offset[1]));
  }

  private limitPan(value: number): number {
    return Math.max(-CampusMapCanvas.MAX_PAN_OFFSET, Math.min(CampusMapCanvas.MAX_PAN_OFFSET, value));
  }

  protected get mapTransform(): string {
    return `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()}) rotate(${this.rotation()}deg)`;
  }
}
