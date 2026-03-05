import React, { useState, useEffect, useMemo } from 'react';
import { Package, Layers } from 'lucide-react';
import { supabase } from '../../db/supabase';
import type { Product } from './types';

// Componentes importados
import { HeaderInventario } from './components/HeaderInventario';
import { FiltrosInventario } from './components/FiltrosInventario';
import { TablaProductos } from './components/TablaProductos';
import { ModalProducto } from './components/ModalProducto';
import { TablaLotes } from './components/TablaLotes';
export const Inventario: React.FC = () => {
  const [vistaActiva, setVistaActiva] = useState<'PRODUCTOS' | 'LOTES'>('PRODUCTOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
        if (error) throw error;
        
        if (data) {
          const mapeados: Product[] = data.map((p: any) => ({
            id: p.id,
            name: p.name || 'SIN NOMBRE',
            price: Number(p.price) || 0,
            cost: Number(p.cost_price) || 0,
            quantity: Number(p.quantity) || 0,
            minStock: Number(p.min_stock) || 0,
            code: p.code || 'NO-SKU',
            barcode: p.barcode || '',
            category: p.category || 'GENERAL',
            unit: p.control_type === 'WEIGHT' ? (p.weight_unit || 'KG') : 'UND'
          }));
          setProducts(mapeados);
        }
      } catch (error) {
        console.error("Error cargando inventario:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p) return false;
      const name = String(p.name || '').toLowerCase();
      const code = String(p.code || '').toLowerCase();
      const query = String(searchQuery || '').toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [products, searchQuery]);

  const lowStockCount = products.filter(p => p.quantity <= p.minStock).length;
  const totalValue = products.reduce((acc, p) => acc + (p.cost * p.quantity), 0);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10 text-[#1E293B] font-mono h-full bg-white relative z-0">
      
      <HeaderInventario 
        onIngresoStock={() => alert("MOTOR DE AJUSTE DE STOCK: INICIALIZADO")} 
        onNuevoSKU={() => setIsModalOpen(true)} 
      />

      {/* CONTROLES DE VISTA */}
      <div className="px-8 shrink-0 flex items-center justify-between">
        <div className="flex border-2 border-[#1E293B] p-0.5 bg-[#F8FAFC]">
          <button onClick={() => setVistaActiva('PRODUCTOS')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer ${vistaActiva === 'PRODUCTOS' ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:text-[#1E293B] hover:bg-white'}`}>
            <Package size={14} /> Inventario General
          </button>
          <button onClick={() => setVistaActiva('LOTES')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer ${vistaActiva === 'LOTES' ? 'bg-[#1E293B] text-[#10B981]' : 'text-[#64748B] hover:text-[#1E293B] hover:bg-white'}`}>
            <Layers size={14} /> Control de Lotes
          </button>
        </div>
      </div>

      <FiltrosInventario 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        matchCount={filteredProducts.length}
        totalSKUs={products.length}
        lowStockCount={lowStockCount}
        totalValue={totalValue}
      />

      {/* ÁREA DE CONTENIDO DINÁMICA */}
      <div className="flex-1 px-8 min-h-0 flex flex-col relative pb-8">
        
        {/* VISTA: PRODUCTOS (Se oculta con CSS, no se destruye) */}
        <div className={`flex-1 min-h-0 ${vistaActiva === 'PRODUCTOS' ? 'flex flex-col' : 'hidden'}`}>
          <TablaProductos loading={loading} productos={filteredProducts} />
        </div>

        {/* VISTA: LOTES (Se oculta con CSS, no se destruye) */}
        <div className={`flex-1 min-h-0 ${vistaActiva === 'LOTES' ? 'flex flex-col' : 'hidden'}`}>
          <TablaLotes />
        </div>

      </div>

      <ModalProducto isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};