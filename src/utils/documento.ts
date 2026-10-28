// src/utils/documento.ts
// Datos del cliente (fase 4.1): DNI (8 dígitos) y RUC (11 dígitos con su dígito verificador), los dos opcionales y a
// la vez (una persona con negocio puede tener los dos), y el link de ubicación. Los usa la ficha del cliente
// (sections/Clientes) y, más adelante, la Caja y la factura (fase 11).

/** RUC peruano: 11 dígitos, empieza en 10, 15, 16, 17 o 20, y el último es el dígito verificador (módulo 11). */
export const rucValido = (ruc: string) => {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc)) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((t, p, i) => t + p * Number(ruc[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return verificador === Number(ruc[10]);
};

/** El problema del DNI escrito (o null si está bien o vacío: es opcional). */
export const errorDni = (dni: string): string | null => {
  const n = dni.trim();
  return n && !/^\d{8}$/.test(n) ? 'El DNI tiene 8 números (o déjalo vacío).' : null;
};

/** El problema del RUC escrito (o null si está bien o vacío: es opcional). */
export const errorRuc = (ruc: string): string | null => {
  const n = ruc.trim();
  if (!n) return null;
  if (!/^\d{11}$/.test(n)) return 'El RUC tiene 11 números (o déjalo vacío).';
  if (!rucValido(n)) return 'Ese RUC no es válido: revisa los números (el último no coincide).';
  return null;
};

/** El link de ubicación (ej. Google Maps) debe ser una dirección web; vacío está bien (es opcional). */
export const errorUbicacion = (link: string): string | null => {
  const n = link.trim();
  return n && !/^https?:\/\/\S+$/i.test(n) ? 'El link de ubicación debe empezar con https:// (cópialo de Google Maps → Compartir).' : null;
};

/** Para comparar nombres sin importar mayúsculas, tildes ni espacios de más ("¿Es esta Rosa?"). */
export const normalizarNombre = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
