// src/utils/documento.ts
// Documento del cliente (fase 4.1): sin documento, DNI (8 dígitos) o RUC (11 dígitos con su dígito verificador).
// Lo usan la ficha del cliente (sections/Clientes) y, más adelante, la Caja y la factura (fase 11).

export type TipoDoc = '' | 'DNI' | 'RUC';

export const TIPOS_DOC: { tipo: TipoDoc; nombre: string }[] = [
  { tipo: '', nombre: 'Sin documento' },
  { tipo: 'DNI', nombre: 'DNI' },
  { tipo: 'RUC', nombre: 'RUC' },
];

/** RUC peruano: 11 dígitos, empieza en 10, 15, 16, 17 o 20, y el último es el dígito verificador (módulo 11). */
export const rucValido = (ruc: string) => {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((t, p, i) => t + p * Number(ruc[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return verificador === Number(ruc[10]);
};

/** El problema del número escrito (o null si está bien). Sin documento no se revisa nada. */
export const errorDocumento = (tipo: TipoDoc, numero: string): string | null => {
  const n = numero.trim();
  if (!tipo) return null;
  if (!n) return `Escribe el número de ${tipo} o elige "Sin documento".`;
  if (tipo === 'DNI' && !/^\d{8}$/.test(n)) return 'El DNI tiene 8 números.';
  if (tipo === 'RUC' && !/^\d{11}$/.test(n)) return 'El RUC tiene 11 números.';
  if (tipo === 'RUC' && !rucValido(n)) return 'Ese RUC no es válido: revisa los números (el último no coincide).';
  return null;
};

/** Para los clientes antiguos sin tipo: lo deduce del número (8 → DNI, 11 → RUC). */
export const tipoDeNumero = (numero: string | null | undefined, tipo?: string | null): TipoDoc => {
  if (tipo === 'DNI' || tipo === 'RUC') return tipo;
  const n = String(numero || '').trim();
  if (/^\d{8}$/.test(n)) return 'DNI';
  if (/^\d{11}$/.test(n)) return 'RUC';
  return '';
};

/** Para comparar nombres sin importar mayúsculas, tildes ni espacios de más ("¿Es esta Rosa?"). */
export const normalizarNombre = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
