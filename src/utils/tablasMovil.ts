// Corrección puntual de celular para Clientes y Finanzas solamente.
// Pone el texto de cada <th> como etiqueta de su <td> para que esas dos tablas
// se vean como fichas completas. NO toca Inventario ni las demás sesiones.

const ETIQUETA = 'data-etiqueta-movil';
const MARCA = 'data-tabla-movil';

function tablasArregladas(): HTMLTableElement[] {
  const encontradas = new Set<HTMLTableElement>();
  const finanzas = document.querySelector<HTMLTableElement>('#tabla-movimientos-caja');
  if (finanzas) encontradas.add(finanzas);
  document.querySelectorAll('[data-fila-cliente="true"]').forEach((fila) => {
    const tabla = fila.closest('table');
    if (tabla) encontradas.add(tabla);
  });
  return Array.from(encontradas);
}

function etiquetarTabla(tabla: HTMLTableElement) {
  const cabeceras = Array.from(tabla.querySelectorAll('thead th'))
    .map((th) => (th.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (!cabeceras.length) return;

  tabla.setAttribute(MARCA, 'true');

  tabla.querySelectorAll('tbody tr').forEach((fila) => {
    let indice = 0;
    Array.from(fila.children).forEach((celda) => {
      if (!(celda instanceof HTMLTableCellElement)) return;
      const span = Math.max(1, celda.colSpan || 1);
      if (span === 1) {
        const etiqueta = cabeceras[indice];
        if (etiqueta) celda.setAttribute(ETIQUETA, etiqueta);
      }
      indice += span;
    });
  });
}

function etiquetarTodo() {
  tablasArregladas().forEach(etiquetarTabla);
}

export function instalarTablasMovil() {
  if (typeof document === 'undefined') return;

  etiquetarTodo();

  let pendiente = false;
  const programar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      etiquetarTodo();
    });
  };

  const observador = new MutationObserver(programar);
  observador.observe(document.body, { childList: true, subtree: true });
}
