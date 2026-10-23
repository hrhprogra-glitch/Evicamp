// src/utils/vencimiento.ts
// Vencimientos de los lotes (fase 2.3, versión mínima): filtros "Vencidos" y "Vencen en 30 días" de Inventario
// y la etiqueta "VENCE EN X DÍAS" de la pestaña Lotes. La fecha del lote es opcional (texto "AAAA-MM-DD").

export const DIAS_POR_VENCER = 30;

// Días que faltan para que venza (0 = vence hoy, negativo = ya venció); null si no tiene fecha válida.
// Se cuenta con la fecha de la PC (Perú), no en UTC: así un lote que vence hoy no sale vencido desde la noche anterior.
export const diasParaVencer = (fecha: string | null | undefined): number | null => {
  const dia = String(fecha || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  const hoy = new Date().toLocaleDateString('en-CA');
  return Math.round((Date.parse(`${dia}T00:00:00`) - Date.parse(`${hoy}T00:00:00`)) / 86_400_000);
};

export const estaVencido = (fecha: string | null | undefined) => {
  const dias = diasParaVencer(fecha);
  return dias !== null && dias < 0;
};

export const vencePronto = (fecha: string | null | undefined) => {
  const dias = diasParaVencer(fecha);
  return dias !== null && dias >= 0 && dias <= DIAS_POR_VENCER;
};
