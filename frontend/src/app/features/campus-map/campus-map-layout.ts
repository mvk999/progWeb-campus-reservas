import { CampusMapData } from './campus-map.models';

/** Layout and geographic labels only; room records and availability come from Django. */
export const CAMPUS_MAP_LAYOUT: CampusMapData = {
  campusName: 'UFLA',
  location: 'Campus sede · Lavras, MG',
  initialDate: '',
  initialStartTime: '08:00',
  initialEndTime: '10:00',
  buildings: [
    { code: 'PV1', name: 'Pavilhão 1', fullName: 'Pavilhão 1', position: { x: 61, y: 19 }, rooms: [] },
    { code: 'PV2', name: 'Pavilhão 2', fullName: 'Pavilhão 2', position: { x: 15, y: 54 }, rooms: [] },
    { code: 'PV3', name: 'Pavilhão 3', fullName: 'Pavilhão 3', position: { x: 37, y: 78 }, rooms: [] },
    { code: 'PV4', name: 'Pavilhão 4', fullName: 'Pavilhão 4', position: { x: 43, y: 67 }, rooms: [] },
    { code: 'PV5', name: 'Pavilhão 5', fullName: 'Pavilhão 5', position: { x: 35, y: 61 }, rooms: [] },
    { code: 'PV6', name: 'Pavilhão 6', fullName: 'Pavilhão 6', position: { x: 65, y: 69 }, rooms: [] },
    { code: 'DCC', name: 'Departamento de Ciência da Computação', fullName: 'DCC', position: { x: 77, y: 74 }, rooms: [] },
  ],
};
