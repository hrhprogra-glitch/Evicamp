/**
 * src/utils/movimientosCaja.ts
 * Leer datos de la descripción de un movimiento de caja.
 * Ej.: "DEVOLUCION POR ANULACION (Ticket #270192) · por Juan Pérez"
 */

// Los últimos 6 caracteres del ticket ("270192"), esté donde esté en el texto.
// (Antes se buscaba al final del texto; desde que el servidor agrega "· por …" ya no está al final.)
export const numeroTicketDe = (descripcion: string | null | undefined): string | null =>
  /Ticket #(\w{1,6})/i.exec(String(descripcion || ''))?.[1] ?? null;

// Quién hizo el movimiento (lo agrega el servidor al guardarlo: "… · por Juan Pérez")
export const autorDe = (descripcion: string | null | undefined): string | null =>
  String(descripcion || '').split(' · por ')[1]?.trim() || null;
