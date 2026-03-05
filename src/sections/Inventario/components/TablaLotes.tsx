import React, { useState, useEffect } from 'react';
import { Database, Calendar, Layers } from 'lucide-react';
import { supabase } from '../../../db/supabase';

interface Lote {
  id: string;
  product_id: string;
  quantity: number;
  initial_quantity: number;
  expiration_date: string | null;
  created_at: string;
  cost_unit: number;
  product_name: string;
  document_ref: string;
}

export const TablaLotes: React.FC = () => {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLotes = async () => {
      setLoading(true);
      try {
        // Hacemos un JOIN con products para traer el nombre del producto
        const { data, error } = await supabase
          .from('batches')
          .select(`
            *,
            products ( name )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          const mapeados: Lote[] = data.map((b: any) => ({
            id: b.id,
            product_id: b.product_id,
            quantity: Number(b.quantity) || 0,
            initial_quantity: Number(b.initial_quantity) || 0,
            expiration_date: b.expiration_date,
            created_at: new Date(b.created_at).toLocaleDateString(),
            cost_unit: Number(b.cost_unit) || 0,
            product_name: b.products?.name || 'PRODUCTO DESCONOCIDO',
            document_ref: b.document_ref || 'INT-S/R'
          }));
          setLotes(mapeados);
        }
      } catch (error) {
        console.error("Error cargando lotes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLotes();
  }, []);

  return (
    <div className="border border-[#E2E8F0] flex-1 flex flex-col bg-white relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Database size={24} className="text-[#10B981] animate-bounce" />
            <span className="text-[10px] font-black text-[#1E293B] uppercase tracking-[0.2em]">Cargando Lotes...</span>
          </div>
        </div>
      )}

      {/* Cabecera de la Tabla */}
      <div className="grid grid-cols-12 bg-[#1E293B] text-white p-4 text-[9px] font-black uppercase tracking-[0.2em] shrink-0">
        <div className="col-span-2">Referencia</div>
        <div className="col-span-4">Producto</div>
        <div className="col-span-2 text-center">Fecha Venc.</div>
        <div className="col-span-2 text-right">Costo Unit.</div>
        <div className="col-span-2 text-center">Stock (Act/Ini)</div>
      </div>

      {/* Cuerpo Scrolleable */}
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        {!loading && lotes.length === 0 ? (
          <div className="p-12 text-center text-[#94A3B8] font-bold uppercase text-[10px] tracking-widest flex flex-col items-center justify-center h-full gap-2">
            <Layers size={32} className="text-[#E2E8F0] mb-2" />
            No hay lotes registrados en el sistema.
          </div>
        ) : (
          lotes.map((lote) => (
            <div key={lote.id} className="grid grid-cols-12 items-center p-4 border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors">
              <div className="col-span-2">
                <span className="bg-[#F8FAFC] px-2 py-1 border border-[#E2E8F0] text-[9px] font-bold text-[#64748B] rounded-none">
                  {lote.document_ref}
                </span>
              </div>
              <div className="col-span-4 pr-4">
                <p className="font-black text-xs uppercase text-[#1E293B] truncate">{lote.product_name}</p>
                <p className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider mt-1">
                  Ingreso: {lote.created_at}
                </p>
              </div>
              <div className="col-span-2 text-center flex justify-center">
                {lote.expiration_date ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#1E293B]">
                    <Calendar size={12} className="text-[#64748B]" /> {lote.expiration_date}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-[#CBD5E1]">-</span>
                )}
              </div>
              <div className="col-span-2 font-bold text-sm text-[#1E293B] text-right">
                S/ {lote.cost_unit.toFixed(2)}
              </div>
              <div className="col-span-2 text-center flex flex-col items-center gap-1">
                <div className={`px-2 py-0.5 text-[10px] font-black rounded-none border ${
                  lote.quantity > 0 ? 'bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]' : 'bg-[#FEF2F2] text-[#EF4444] border-[#FECACA]'
                }`}>
                  {lote.quantity}
                </div>
                <span className="text-[8px] font-bold text-[#94A3B8] uppercase tracking-wider">de {lote.initial_quantity}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};