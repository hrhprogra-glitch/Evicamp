import React from 'react';
import { Search, X, Box, AlertTriangle, LayoutGrid } from 'lucide-react';
import { TarjetaMetrica } from './TarjetaMetrica';

interface Props {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  matchCount: number;
  totalSKUs: number;
  lowStockCount: number;
  totalValue: number;
}

export const FiltrosInventario: React.FC<Props> = ({ 
  searchQuery, setSearchQuery, matchCount, totalSKUs, lowStockCount, totalValue 
}) => {
  return (
    <div className="flex flex-col xl:flex-row gap-6 px-8 shrink-0 items-start xl:items-center justify-between">
      <div className="w-full xl:max-w-2xl h-14 flex border border-[#E2E8F0] bg-white focus-within:border-[#1E293B] focus-within:ring-1 focus-within:ring-[#1E293B] transition-all group shadow-sm">
        <div className="w-14 h-full flex items-center justify-center bg-[#F8FAFC] border-r border-[#E2E8F0] text-[#94A3B8] group-focus-within:bg-[#1E293B] group-focus-within:text-[#10B981] group-focus-within:border-[#1E293B] transition-colors shrink-0">
          <div className="mt-[-6px]"><Search size={18} /></div>
        </div>
        <div className="flex-1 relative h-full flex items-center">
          <input 
            type="text"
            placeholder="ESCANEAR BARCODE O BUSCAR POR NOMBRE / CATEGORÍA..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full pl-4 pr-32 bg-transparent font-black text-xs uppercase outline-none text-[#1E293B] placeholder:text-[#CBD5E1]"
          />
          {searchQuery && (
            <div className="absolute right-2 flex items-center gap-2">
              <div className="flex items-center border border-[#10B981] bg-[#1E293B] px-2 h-8">
                <div className="w-1.5 h-1.5 bg-[#10B981] animate-pulse mr-2"></div>
                <span className="text-[9px] font-black text-[#10B981] tracking-widest leading-none">
                  {matchCount} MATCH
                </span>
              </div>
              <button 
                onClick={() => setSearchQuery('')}
                className="w-8 h-8 flex items-center justify-center border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors cursor-pointer rounded-none"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto w-full xl:w-auto pb-2 xl:pb-0 custom-scrollbar">
        <TarjetaMetrica label="Total SKUs" value={totalSKUs} icon={<Box size={14}/>} />
        <TarjetaMetrica label="Nivel Crítico" value={lowStockCount} icon={<AlertTriangle size={14}/>} isAlert={lowStockCount > 0} />
        <TarjetaMetrica label="Valor Total" value={`S/ ${totalValue.toFixed(2)}`} icon={<LayoutGrid size={14}/>} isGreen />
      </div>
    </div>
  );
};