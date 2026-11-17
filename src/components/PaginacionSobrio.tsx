// Franja de paginación del molde SiuMax Sobrio (Igual a Inventario > Productos).
// Se dibuja SIEMPRE, aunque solo haya "Página 1 de 1" (pedido del dueño, 17/11/2026).
// Conserva los id que se le pasen, para no romper atajos ni pruebas anteriores.
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  prefijo: string;
  posicion: 'top' | 'bottom';
  idAnt?: string;
  idSig?: string;
  selectorFilas?: string;
  idBuscador?: string;
  idFocoIzquierda?: string;
}

export const PaginacionSobrio: React.FC<Props> = ({
  pagina,
  totalPaginas,
  onCambiar,
  prefijo,
  posicion,
  idAnt,
  idSig,
  selectorFilas,
  idBuscador,
  idFocoIzquierda,
}) => {
  const total = Math.max(1, Number(totalPaginas) || 1);
  const actual = Math.min(Math.max(1, Number(pagina) || 1), total);
  const antDeshabilitado = actual <= 1;
  const sigDeshabilitado = actual >= total;
  const sufijo = posicion === 'top' ? '' : 'bottom-';
  const idPrev = idAnt || `btn-pag-${sufijo}${prefijo}-ant`;
  const idNext = idSig || `btn-pag-${sufijo}${prefijo}-sig`;

  const filas = (): HTMLElement[] => {
    if (!selectorFilas) return [];
    return Array.from(document.querySelectorAll(selectorFilas) as NodeListOf<HTMLElement>)
      .filter((el) => el.offsetParent !== null);
  };

  const enfocar = (id?: string) => {
    const el = id ? document.getElementById(id) : null;
    if (el) el.focus();
  };

  const alTeclear = (soy: 'ant' | 'sig') => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const visibles = filas();
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        if (soy === 'sig') enfocar(idPrev);
        else if (posicion === 'top') enfocar(idFocoIzquierda || idBuscador);
        break;
      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        if (soy === 'ant') enfocar(idNext);
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        if (posicion === 'top') enfocar(idBuscador);
        else if (visibles.length > 0) visibles[visibles.length - 1].focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        if (posicion === 'top' && visibles.length > 0) visibles[0].focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        if (soy === 'ant' && !antDeshabilitado) onCambiar(actual - 1);
        if (soy === 'sig' && !sigDeshabilitado) onCambiar(actual + 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={`paginacion-sobria ${posicion === 'top' ? 'border-b' : 'border-t'} shrink-0`}>
      <span className="paginacion-sobria__texto">Página {actual} de {total}</span>
      <div className="flex gap-2">
        <button
          id={idPrev}
          type="button"
          title="Página anterior"
          aria-disabled={antDeshabilitado}
          onClick={() => { if (!antDeshabilitado) onCambiar(actual - 1); }}
          onKeyDown={alTeclear('ant')}
          className="paginacion-sobria__boton"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          id={idNext}
          type="button"
          title="Página siguiente"
          aria-disabled={sigDeshabilitado}
          onClick={() => { if (!sigDeshabilitado) onCambiar(actual + 1); }}
          onKeyDown={alTeclear('sig')}
          className="paginacion-sobria__boton"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
