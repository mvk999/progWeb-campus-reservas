/**
 * Data no formato AAAA-MM-DD pelo relógio local do navegador.
 *
 * Diferente de `toISOString()`, que usa UTC: no Brasil, depois das 21h,
 * `toISOString()` já devolveria a data do dia seguinte.
 */
export function localIsoDate(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
