import React, { useState, useEffect, useMemo } from 'react';
import { Database, TrendingDown, PackageMinus } from 'lucide-react';
import { supabase } from '../../db/supabase';
import type { Merma } from './types';
import type { Product } from '../Inventario/types';
import { ModalMerma } from '../Inventario/components/ModalMerma';

// Componentes

// Componentes
import { HeaderMermas } from './components/HeaderMermas';
import { FiltrosMermas } from './components/FiltrosMermas';
import { TarjetaMetrica } from './components/TarjetaMetrica';
import { TablaMermas } from './components/TablaMermas';

export const Mermas: React.FC = () => {
  const [mermas, setMermas] = useState<Merma[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalMermaOpen, setIsModalMermaOpen] = useState(false);

  // Estados de Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');
  const [filtroOrden, setFiltroOrden] = useState('FECHA_DESC');
  const [filtroFecha, setFiltroFecha] = useState(''); // <-- NUEVO ESTADO DE FECHA

  const fetchMermas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('waste')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mapeados = data.map((w: any) => ({
          id: w.id,
          batch_id: w.batch_id,
          product_id: w.product_id,
          product_name: w.product_name || 'DESCONOCIDO',
          quantity: Math.abs(Number(w.quantity) || 0),
          cost_unit: Number(w.cost_unit) || 0,
          total_loss: Number(w.total_loss) || 0,
          reason: w.reason || 'SIN MOTIVO',
          notes: w.notes,
          user_name: w.user || 'Sistema',
          created_at: new Date(w.created_at).toLocaleString(),
          raw_date: w.created_at, /* <-- FECHA OCULTA PARA ORDENAR BIEN */
          previous_quantity: Number(w.previous_quantity) || 0,
          new_quantity: Number(w.new_quantity) || 0,
        })) as any[];
        setMermas(mapeados);
      }
    } catch (error) {
      console.error("Error cargando mermas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      if (data) {
        const mapeados: Product[] = data.map((p: any) => {
          // RADAR ABSOLUTO: Convierte TODA la fila del producto a texto en mayúscula
          const registroCompleto = JSON.stringify(p).toUpperCase();
          
          // Si en cualquier rincón del producto dice alguna de estas palabras, es Consumo.
          const esConsumo = registroCompleto.includes('"CONSUMO"') || 
                            registroCompleto.includes('"SERVICE"') || 
                            registroCompleto.includes('"USO INTERNO"') ||
                            registroCompleto.includes('"CONSUMPTION"');

          return {
            id: p.id,
            name: p.name || 'SIN NOMBRE',
            price: Number(p.price) || 0,
            cost: Number(p.cost_price) || 0,
            quantity: Number(p.quantity) || 0,
            minStock: Number(p.min_stock) || 0,
            code: p.code || 'NO-SKU',
            barcode: p.barcode || '',
            category: p.category || 'GENERAL',
            // Si el radar detectó consumo, fuerza la etiqueta, sino usa la de BD
            unit: esConsumo ? 'CONSUMO' : (p.unit || p.weight_unit || (p.control_type === 'WEIGHT' ? 'KG' : 'UND')),
            imageUrl: p.image_url || p.image_path || null
          };
        });
        setProducts(mapeados);
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  useEffect(() => {
    fetchMermas();
    fetchProducts();
  }, []);

  const motivosUnicos = useMemo(() => {
    const motivos = mermas.map(m => m.reason).filter(Boolean);
    return Array.from(new Set(motivos)).sort();
  }, [mermas]);

  // Motor de Filtrado y Ordenamiento
  const filteredMermas = useMemo(() => {
    let result = [...mermas];

    // Filtro Exacto por Día (Corrección Matemática)
    if (filtroFecha) {
      result = result.filter(m => {
        // Extraemos la fecha local exacta del registro original
        const dateObj = new Date(m.raw_date);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const fechaRegistro = `${yyyy}-${mm}-${dd}`;
        
        return fechaRegistro === filtroFecha;
      });
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.product_name.toLowerCase().includes(q) || 
        (m.notes && m.notes.toLowerCase().includes(q))
      );
    }

    if (filtroMotivo) {
      result = result.filter(m => m.reason === filtroMotivo);
    }

    result.sort((a: any, b: any) => {
      if (filtroOrden === 'FECHA_DESC') return new Date(b.raw_date).getTime() - new Date(a.raw_date).getTime();
      if (filtroOrden === 'FECHA_ASC') return new Date(a.raw_date).getTime() - new Date(b.raw_date).getTime();
      if (filtroOrden === 'PERDIDA_DESC') return b.total_loss - a.total_loss;
      if (filtroOrden === 'PERDIDA_ASC') return a.total_loss - b.total_loss;
      return 0;
    });

    return result;
  }, [mermas, searchQuery, filtroMotivo, filtroOrden, filtroFecha]);

  // Cálculos para las métricas (solo de lo que está filtrado)
  const totalPerdidaEconómica = filteredMermas.reduce((acc, m) => acc + m.total_loss, 0);
  const totalUnidadesPerdidas = filteredMermas.reduce((acc, m) => acc + m.quantity, 0);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10 text-[#1E293B] font-mono min-h-full bg-white relative z-0">
      
      <HeaderMermas 
        onNuevaMerma={() => setIsModalMermaOpen(true)} 
      />

      {/* MÉTRICAS */}
      <div className="px-8 flex gap-4 overflow-x-auto w-full pb-2 custom-scrollbar shrink-0">
        <TarjetaMetrica 
          label="Eventos Registrados" 
          value={filteredMermas.length} 
          icon={<Database size={16}/>} 
        />
        <TarjetaMetrica 
          label="Unidades Afectadas" 
          value={totalUnidadesPerdidas} 
          icon={<PackageMinus size={16}/>} 
        />
        <TarjetaMetrica 
          label="Pérdida Económica" 
          value={`S/ ${totalPerdidaEconómica.toFixed(2)}`} 
          icon={<TrendingDown size={16}/>} 
          isAlert={totalPerdidaEconómica > 0} 
        />
      </div>

      <FiltrosMermas 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filtroMotivo={filtroMotivo}
        setFiltroMotivo={setFiltroMotivo}
        filtroOrden={filtroOrden}
        setFiltroOrden={setFiltroOrden}
        filtroFecha={filtroFecha}
        setFiltroFecha={setFiltroFecha}
        motivosUnicos={motivosUnicos}
        matchCount={filteredMermas.length}
        onClearFilters={() => {
          setSearchQuery('');
          setFiltroMotivo('');
          setFiltroOrden('FECHA_DESC');
          setFiltroFecha(''); // <-- Limpia el calendario también
        }}
      />

      <div className="px-8 flex-1 flex flex-col min-h-[60vh] relative pb-8">
        {loading ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center border-2 border-[#E2E8F0]">
            <div className="flex flex-col items-center gap-3">
              <Database size={24} className="text-[#EF4444] animate-bounce" />
              <span className="text-[10px] font-black text-[#1E293B] uppercase tracking-[0.2em]">Cargando Registros...</span>
            </div>
          </div>
        ) : (
          <TablaMermas 
            mermas={filteredMermas} 
            onEdit={(merma) => {
              alert(`Has seleccionado editar: ${merma.product_name}.\n\nPara que la edición funcione 100%, en el siguiente paso modificaremos el ModalMerma para que acepte "Modo Edición" (tal como lo hicimos con los productos). ¡Avísame si lo hacemos ahora!`);
            }}
            onDelete={async (merma) => {
              const confirmar = window.confirm(
                `⚠️ ALERTA: ¿Estás seguro de ELIMINAR el registro de merma de ${merma.product_name} por ${merma.quantity} unidades?\n\nNOTA: Esto borrará el registro del historial. Si deseas devolver esas unidades al stock, debes hacerlo mediante un ingreso manual en inventario.`
              );
              
              if (confirmar) {
                const { error } = await supabase.from('waste').delete().eq('id', merma.id);
                if (error) {
                  alert('Error al eliminar: ' + error.message);
                } else {
                  // Si borró exitosamente, recargamos la tabla en vivo
                  fetchMermas(); 
                }
              }
            }}
          />
        )}
      </div>

      {/* VENTANA FLOTANTE DE MERMAS REUTILIZADA */}
      <ModalMerma 
        isOpen={isModalMermaOpen} 
        onClose={() => {
          setIsModalMermaOpen(false);
          // MAGIA: Al cerrar el modal, recargamos la tabla en 2do plano automáticamente
          fetchMermas(); 
          fetchProducts();
        }} 
        productos={products} 
      />

    </div>
  );
};