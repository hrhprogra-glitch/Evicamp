import type { Salida } from './types';

// Cliente interno (activo=false) que se usa de referencia cuando el nombre se registra solo como nota.
export const ID_CLIENTE_NOTA = 990001;
export const NOMBRE_CLIENTE_NOTA = 'CLIENTE NO REGISTRADO (NOTA)';

// El nombre libre se guarda al final de observaciones: "CLIENTE: NOMBRE". Si el dueño escribió
// algo parecido en su nota, se toma la última etiqueta porque es la que pone el sistema.
export const nombreNotaEnObservaciones = (observaciones?: string | null): string => {
  if (!observaciones) return '';
  const encontrados = observaciones.match(/CLIENTE:\s*([^|]+)/gi) || [];
  const ultimo = encontrados[encontrados.length - 1] || '';
  return ultimo.replace(/^CLIENTE:\s*/i, '').trim();
};

export const esSalidaNota = (salida: Partial<Salida>): boolean =>
  Number(salida.customer_id) === ID_CLIENTE_NOTA
  || String(salida.customer?.name || '').trim().toUpperCase() === NOMBRE_CLIENTE_NOTA;

export const nombreClienteSalida = (salida: Partial<Salida>, predeterminado = 'NO REGISTRADO'): string => {
  const nombre = String(salida.customer?.name || '').trim();
  if (!esSalidaNota(salida)) return nombre || predeterminado;
  return nombreNotaEnObservaciones(salida.observaciones) || nombre || predeterminado;
};

// Se usa al cargar la lista: deja el nombre de la nota en el cliente para que tabla, detalle y
// comprobante muestren lo que el dueño escribió, sin cambiar nada en la base.
export const conNombreClienteNota = <T extends Salida>(salida: T): T => {
  if (!esSalidaNota(salida) || !salida.customer) return salida;
  const nombre = nombreNotaEnObservaciones(salida.observaciones);
  if (!nombre || salida.customer.name === nombre) return salida;
  return { ...salida, customer: { ...salida.customer, name: nombre } } as T;
};
