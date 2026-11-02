import React from 'react';
import { LayoutGrid, Sparkles } from 'lucide-react';

interface TiendaCategoriasProps {
  categorias: string[];
  categoriaSeleccionada: string;
  onSelectCategoria: (cat: string) => void;
  totalProductos: number;
}

export const TiendaCategorias: React.FC<TiendaCategoriasProps> = ({
  categorias,
  categoriaSeleccionada,
  onSelectCategoria,
  totalProductos,
}) => {
  return (
    <div className="bg-white border-b border-gray-200 py-2.5 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto custom-scrollbar no-scrollbar py-0.5">
        <button
          onClick={() => onSelectCategoria('TODOS')}
          className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
            categoriaSeleccionada === 'TODOS'
              ? 'bg-gray-900 text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <LayoutGrid size={13} />
          <span>Todos ({totalProductos})</span>
        </button>

        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelectCategoria(cat)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase transition-all cursor-pointer ${
              categoriaSeleccionada === cat
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{cat}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
