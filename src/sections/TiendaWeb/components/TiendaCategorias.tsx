import React from 'react';
import { nombreBonito } from '../formato';

interface TiendaCategoriasProps {
  categorias: string[];
  categoriaSeleccionada: string;
  onSelectCategoria: (cat: string) => void;
  totalProductos: number;
}

// Fila de categorías deslizable (en celular se desliza con el dedo).
export const TiendaCategorias: React.FC<TiendaCategoriasProps> = ({
  categorias,
  categoriaSeleccionada,
  onSelectCategoria,
  totalProductos,
}) => {
  const chip = (activa: boolean) =>
    `shrink-0 px-4 h-9 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
      activa ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
    }`;
  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
        <button onClick={() => onSelectCategoria('TODOS')} className={chip(categoriaSeleccionada === 'TODOS')}>
          Todo <span className="opacity-60 font-medium">{totalProductos}</span>
        </button>
        {categorias.map((cat) => (
          <button key={cat} onClick={() => onSelectCategoria(cat)} className={chip(categoriaSeleccionada === cat)}>
            {nombreBonito(cat)}
          </button>
        ))}
      </div>
    </div>
  );
};
