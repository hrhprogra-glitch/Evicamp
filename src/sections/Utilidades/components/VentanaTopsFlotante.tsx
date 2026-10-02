import { X, TrendingUp } from 'lucide-react';

interface TopProduct {
  nombre: string;
  utilidad: number;
}

interface Props {
  tops: TopProduct[];
  onClose: () => void;
}

export const VentanaTopsFlotante = ({ tops, onClose }: Props) => {
  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:bottom-6 sm:right-6 z-50 sm:w-80 max-h-[calc(var(--alto-pantalla)*0.8)] overflow-y-auto bg-white border-2 border-[var(--color-accent-shadow)] rounded-none shadow-[8px_8px_0px_0px_rgba(var(--color-accent-shadow-rgb),1)] p-5 transition-all duration-300">
      
      {/* Cabecera Técnica */}
      <div className="flex justify-between items-center border-b-2 border-[var(--color-accent-shadow)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--color-accent-shadow)]" />
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-accent-shadow)]">
            TOP 5 RENTABLES
          </h3>
        </div>
        <button 
          onClick={onClose} 
          className="text-[var(--color-muted)] hover:text-white hover:bg-red-600 transition-colors border border-[var(--color-border)] p-1 rounded-none"
        >
          <X size={16} />
        </button>
      </div>

      {/* Lista de Tops Altamente Legible */}
      <div className="space-y-3">
        {tops.slice(0, 5).map((item, idx) => (
          <div key={idx} className="flex justify-between items-center group border-b border-[var(--color-border)] border-dashed pb-2 last:border-0 last:pb-0">
            <span className="text-xs text-[var(--color-muted)] font-mono font-bold">0{idx + 1}.</span>
            
            <span className="text-sm text-[var(--color-ink)] flex-1 ml-2 truncate uppercase font-bold tracking-tight">
              {item.nombre}
            </span>
            
            <span className="text-sm font-mono font-black text-[var(--color-accent-shadow)] bg-[var(--color-accent-bg)] px-2 py-0.5 border border-[var(--color-accent)] rounded-none">
              +S/{item.utilidad.toFixed(2)}
            </span>
          </div>
        ))}
        
        {tops.length === 0 && (
          <div className="bg-[var(--color-bg)] border border-[var(--color-border)] p-4 text-center">
            <p className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-widest">Sin datos de utilidad</p>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-2 border-t border-[var(--color-border)]">
        <p className="text-[12px] text-[var(--color-muted)] uppercase font-bold text-center tracking-widest">
          Cálculo: Ingresos - (Costo + Merma)
        </p>
      </div>
    </div>
  );
};