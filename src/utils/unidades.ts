// src/utils/unidades.ts
// UNIDADES DE MEDIDA (fase 1.1). Cada unidad tiene su código del Catálogo N° 03 de SUNAT (basado en la
// Recomendación 20 de la ONU) y cómo se vende: ENTERA (de 1 en 1), DECIMAL (kilo, litro, metro… con decimales,
// en Caja pide "¿cuánto?") o SERVICIO (sin stock). Son las más usadas en tiendas; el catálogo completo tiene cientos.
// En el producto: unit = "corto" (lo que se ve: UND, BOLSA, KG, M…), control_type = UND / WEIGHT / CONSUMPTION,
// sunat_unit_code = "codigo". Para saber si un producto se vende con decimales usar esDecimal(), NO comparar con 'KG'.

export type TipoUnidad = 'ENTERA' | 'DECIMAL' | 'SERVICIO';
export interface Unidad { codigo: string; corto: string; nombre: string; tipo: TipoUnidad }

export const UNIDADES: Unidad[] = [
  // Enteras (stock en números enteros)
  { codigo: 'NIU', corto: 'UND', nombre: 'Unidad', tipo: 'ENTERA' },
  { codigo: 'BG', corto: 'BOLSA', nombre: 'Bolsa', tipo: 'ENTERA' },
  { codigo: 'BX', corto: 'CAJA', nombre: 'Caja', tipo: 'ENTERA' },
  { codigo: 'PK', corto: 'PAQ', nombre: 'Paquete', tipo: 'ENTERA' },
  { codigo: 'DZN', corto: 'DOC', nombre: 'Docena', tipo: 'ENTERA' },
  { codigo: 'PR', corto: 'PAR', nombre: 'Par', tipo: 'ENTERA' },
  { codigo: 'CEN', corto: 'CIENTO', nombre: 'Ciento', tipo: 'ENTERA' },
  { codigo: 'MIL', corto: 'MILLAR', nombre: 'Millar', tipo: 'ENTERA' },
  { codigo: 'RO', corto: 'ROLLO', nombre: 'Rollo', tipo: 'ENTERA' },
  { codigo: 'SET', corto: 'JUEGO', nombre: 'Juego', tipo: 'ENTERA' },
  { codigo: 'BO', corto: 'BOT', nombre: 'Botella', tipo: 'ENTERA' },
  { codigo: 'CA', corto: 'LATA', nombre: 'Lata', tipo: 'ENTERA' },
  { codigo: 'BJ', corto: 'BALDE', nombre: 'Balde', tipo: 'ENTERA' },
  { codigo: 'SA', corto: 'SACO', nombre: 'Saco', tipo: 'ENTERA' },
  { codigo: 'TU', corto: 'TUBO', nombre: 'Tubo', tipo: 'ENTERA' },
  { codigo: 'C62', corto: 'PIEZA', nombre: 'Pieza', tipo: 'ENTERA' },
  // Con decimales (se vende por medida)
  { codigo: 'KGM', corto: 'KG', nombre: 'Kilogramo', tipo: 'DECIMAL' },
  { codigo: 'GRM', corto: 'GR', nombre: 'Gramo', tipo: 'DECIMAL' },
  { codigo: 'LTR', corto: 'LT', nombre: 'Litro', tipo: 'DECIMAL' },
  { codigo: 'MLT', corto: 'ML', nombre: 'Mililitro', tipo: 'DECIMAL' },
  { codigo: 'GLL', corto: 'GAL', nombre: 'Galón', tipo: 'DECIMAL' },
  { codigo: 'MTR', corto: 'M', nombre: 'Metro', tipo: 'DECIMAL' },
  { codigo: 'CMT', corto: 'CM', nombre: 'Centímetro', tipo: 'DECIMAL' },
  { codigo: 'MTK', corto: 'M2', nombre: 'Metro cuadrado', tipo: 'DECIMAL' },
  { codigo: 'MTQ', corto: 'M3', nombre: 'Metro cúbico', tipo: 'DECIMAL' },
  { codigo: 'FOT', corto: 'PIE', nombre: 'Pie', tipo: 'DECIMAL' },
  { codigo: 'INH', corto: 'PULG', nombre: 'Pulgada', tipo: 'DECIMAL' },
  { codigo: 'LBR', corto: 'LB', nombre: 'Libra', tipo: 'DECIMAL' },
  { codigo: 'ONZ', corto: 'OZ', nombre: 'Onza', tipo: 'DECIMAL' },
  // Sin stock
  { codigo: 'ZZ', corto: 'CONSUMO', nombre: 'Servicio / consumo', tipo: 'SERVICIO' },
];

const porCorto = new Map(UNIDADES.map((u) => [u.corto, u]));
const porCodigo = new Map(UNIDADES.map((u) => [u.codigo, u]));

/** La unidad de un producto: por su código SUNAT o por su abreviatura (los antiguos solo tienen "UND"/"KG"). */
export const unidadDe = (p: { unit?: string | null; sunat_unit_code?: string | null; control_type?: string | null } | null | undefined): Unidad => {
  if (!p) return porCorto.get('UND')!;
  const corto = String(p.unit || '').toUpperCase().trim();
  if (corto === 'CONSUMO' || p.control_type === 'CONSUMPTION') return porCorto.get('CONSUMO')!;
  return porCorto.get(corto) || porCodigo.get(String(p.sunat_unit_code || '').toUpperCase()) || (p.control_type === 'WEIGHT' ? porCorto.get('KG')! : porCorto.get('UND')!);
};

/** ¿Se vende con decimales (kilo, litro, metro…)? Úsalo en vez de comparar con 'KG'. */
export const esDecimal = (p: { unit?: string | null; control_type?: string | null; sunat_unit_code?: string | null } | null | undefined) =>
  !!p && (p.control_type === 'WEIGHT' || unidadDe(p).tipo === 'DECIMAL');

// Plurales de las unidades con decimales (para preguntar en Caja); las enteras no lo necesitan
const PLURALES: Record<string, string> = {
  KG: 'kilogramos', GR: 'gramos', LT: 'litros', ML: 'mililitros', GAL: 'galones', M: 'metros', CM: 'centímetros',
  M2: 'metros cuadrados', M3: 'metros cúbicos', PIE: 'pies', PULG: 'pulgadas', LB: 'libras', OZ: 'onzas',
};

/** Nombre en minúsculas para la Caja: "kilogramo" / "kilogramos", "metro" / "metros", "galón" / "galones" */
export const nombreUnidad = (p: Parameters<typeof unidadDe>[0], plural = false) => {
  const u = unidadDe(p);
  return plural ? (PLURALES[u.corto] || `${u.nombre.toLowerCase()}s`) : u.nombre.toLowerCase();
};
