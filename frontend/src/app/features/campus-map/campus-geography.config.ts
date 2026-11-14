/** Geographic data is independent from the demonstration reservation catalog. */
export const CAMPUS_GEOGRAPHY = {
  center: [-44.9763, -21.227] as [number, number],
  zoom: 15.8,
  pitch: 54,
  bearing: -24,
  buildingsUrl: '/data/ufla-buildings.geojson',
  tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
};
