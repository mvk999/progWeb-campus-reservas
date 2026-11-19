import type { ExpressionSpecification } from 'maplibre-gl';
import type { Feature, Geometry } from 'geojson';

/** Exaggeration is presentation only: original coordinates and source heights stay intact. */
export function buildingHeight(scale: number): ExpressionSpecification {
  return ['+', ['*', ['coalesce', ['to-number', ['get', 'height']], 9], scale], ['coalesce', ['to-number', ['feature-state', 'lift']], 0]];
}

export function footprintCenter(feature: Feature<Geometry>): [number, number] | null {
  if (feature.geometry.type !== 'Polygon') return null;
  const ring = feature.geometry.coordinates[0];
  if (!ring?.length) return null;
  // Midpoint of footprint bounds; does not invent or relocate source geometry.
  return [(Math.min(...ring.map(p => p[0])) + Math.max(...ring.map(p => p[0]))) / 2,
    (Math.min(...ring.map(p => p[1])) + Math.max(...ring.map(p => p[1]))) / 2];
}

export function clampVisualScale(value: number): number {
  return Number.isFinite(value) ? Math.max(1, Math.min(3, value)) : 1.6;
}
