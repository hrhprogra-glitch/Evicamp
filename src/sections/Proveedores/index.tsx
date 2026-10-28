import { coincideBusqueda } from '../../utils/busqueda';
import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Loader2, Layers, Package } from 'lucide-react';
import { supabase } from '../../db/supabase';
import type { Proveedor } from './types';
import type { Product } from '../Inventario/types';

// Componentes
import { FiltrosProveedores } from './components/FiltrosProveedores';
import { TablaProveedores } from './components/TablaProveedores';
import { ModalProveedor } from './components/ModalProveedor';
import { TablaLotes } from '../Inventario/components/TablaLotes';
import { ModalLote } from '../Inventario/components/ModalLote';
import { FiltrosInventario } from '../Inventario/components/FiltrosInventario';
import { traerTodo } from '../../utils/traerTodo';
import { confirmar } from '../../utils/dialogos';

interface Props {
  onNavigate?: (view: string) => void;
}

export const Proveedores: React.FC<Props> = ({ onNavigate }) => {
  const [vistaActiva, setVistaActiva] = useState<'PROVEEDORES' | 'LOTES'>('LOTES');

  // ===================== ESTADOS PROVEEDORES =====================
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProv, setLoadingProv] = useState(true);
  const [searchQueryProv, setSearchQueryProv] = useState('');
  const [filtroEstadoProv, setFiltroEstadoProv] = useState('');
  const [isModalProvOpen, setIsModalProvOpen] = useState(false);
  const [proveedorAEditar, setProveedorAEditar] = useState<Proveedor | null>(null);

  // ===================== ESTADOS LOTES =====================
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshLotesKey, setRefreshLotesKey] = useState(0);
  const [isModalLoteOpen, setIsModalLoteOpen] = useState(false);
  const [loteToEdit, setLoteToEdit] = useState<any>(null);
  const [nuevoLoteRealtime, setNuevoLoteRealtime] = useState<any>(null);
  const [searchQueryLotes, setSearchQueryLotes] = useState('');
  const [filtroCategoriaLotes, setFiltroCategoriaLotes] = useState('');
  const [filtroEstadoLotes, setFiltroEstadoLotes] = useState('');
  const [filtroOrdenLotes, setFiltroOrdenLotes] = useState('NOMBRE_ASC');

  const fetchProveedores = async () => {
    setLoadingProv(true);
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProveedores(data || []);
    } catch (error) {
      console.error("Error cargando proveedores:", error);
    } finally {
      setLoadingProv(false);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const [ 
          { data: productsData, error: productsError }, 
          { data: batchesData, error: batchesError }
        ] = await Promise.all([
          traerTodo(() => supabase.from('products').select('*').eq('is_active', 1).order('id')),
          traerTodo(() => supabase.from('batches').select('id, product_id, quantity, cost_unit').order('id'))
        ]);

        if (productsError) throw productsError;
        if (batchesError) throw batchesError;
        
        if (productsData) {
          const mapeados: Product[] = productsData.map((p: any) => {
            const TIPOS_CONSUMO = ['CONSUMO', 'SERVICE', 'USO INTERNO', 'CONSUMPTION'];
            const esConsumo = [p.unit, p.control_type, p.weight_unit]
              .some(v => TIPOS_CONSUMO.includes(String(v ?? '').trim().toUpperCase()));

            const lotesDelProducto = batchesData?.filter(b => b.product_id === p.id) || [];
            
            const loteMasReciente = lotesDelProducto.length > 0
              ? [...lotesDelProducto].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0]
              : null;
            const stockRealGlobal = lotesDelProducto.length > 0
              ? lotesDelProducto.reduce((total: number, lote: any) => total + (Number(lote.quantity) || 0), 0)
              : 0;

            return {
              id: p.id,
              name: p.name || 'SIN NOMBRE',
              price: Number(p.price) || 0,
              cost: loteMasReciente ? Number(loteMasReciente.cost_unit) : (Number(p.cost_price) || 0),
              quantity: stockRealGlobal,
              minStock: Number(p.min_stock) || 0,
              code: p.code || 'NO-SKU',
              barcode: p.barcode || '',
              category: p.category || 'GENERAL',
              unit: esConsumo ? 'CONSUMO' : (p.unit || p.weight_unit || (p.control_type === 'WEIGHT' ? 'KG' : 'UND')),
              imageUrl: p.image_url || p.image_path || null
            };
          });
          setProducts(mapeados);
        }
      } catch (error) {
        console.error("Error cargando inventario:", error);
      }
    };
    fetchInventory();
  }, []);

  const handleSaveProveedor = async (provData: Partial<Proveedor>) => {
    try {
      if (provData.id) {
        const { error } = await supabase
          .from('providers')
          .update({
            ruc: provData.ruc,
            razon_social: provData.razon_social,
            nombre_comercial: provData.nombre_comercial,
            telefono: provData.telefono,
            email: provData.email,
            direccion: provData.direccion,
            estado: provData.estado
          })
          .eq('id', provData.id);

        if (error) throw error;
        alert('Proveedor actualizado correctamente.');
      } else {
        const { error } = await supabase
          .from('providers')
          .insert([{
            ruc: provData.ruc,
            razon_social: provData.razon_social,
            nombre_comercial: provData.nombre_comercial,
            telefono: provData.telefono,
            email: provData.email,
            direccion: provData.direccion,
            estado: provData.estado
          }]);

        if (error) throw error;
        alert('Proveedor registrado exitosamente.');
      }
      
      setIsModalProvOpen(false);
      setProveedorAEditar(null);
      fetchProveedores();
    } catch (error: any) {
      alert('Error al guardar proveedor: ' + error.message);
    }
  };

  const filteredProveedores = useMemo(() => {
    let result = [...proveedores];
    if (searchQueryProv && searchQueryProv.trim()) {
      result = result.filter(p => coincideBusqueda([p.ruc, p.razon_social, p.nombre_comercial], searchQueryProv));
    }
    if (filtroEstadoProv) {
      result = result.filter(p => p.estado === filtroEstadoProv);
    }
    return result;
  }, [proveedores, searchQueryProv, filtroEstadoProv]);

  const categoriasUnicas = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return Array.from(new Set(cats)).sort();
  }, [products]);

  return (
    <div className="flex flex-col gap-6 short:gap-3 w-full pb-10 text-[var(--color-ink)] font-mono min-h-full bg-white relative">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 lg:p-4 bg-white border-b-2 border-[var(--color-ink)] shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--color-info-bg)] border-2 border-[var(--color-info)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-info)] rounded-none">
            {vistaActiva === 'PROVEEDORES' ? <Users size={24} className="text-[var(--color-info)]" /> : <Layers size={24} className="text-[var(--color-info)]" />}
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest">
              Compras
            </h1>
            <p className="text-[12px] font-bold text-[var(--color-muted)] uppercase tracking-[0.2em] mt-1">
              Control de Lotes y Proveedores
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="grid grid-cols-2 sm:flex border-2 border-[var(--color-ink)] p-0.5 bg-[var(--color-bg)] h-full">
            <button onClick={() => setVistaActiva('LOTES')} className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-0 text-[12px] font-black uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer h-full ${vistaActiva === 'LOTES' ? 'bg-[var(--color-ink)] text-[var(--color-info)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-white'}`}>
              <Layers size={14} /> Control de Lotes
            </button>
            <button onClick={() => setVistaActiva('PROVEEDORES')} className={`flex items-center justify-center gap-2 px-3 sm:px-6 py-2 sm:py-0 text-[12px] font-black uppercase tracking-[0.2em] transition-all rounded-none cursor-pointer h-full ${vistaActiva === 'PROVEEDORES' ? 'bg-[var(--color-ink)] text-[var(--color-info)]' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-white'}`}>
              <Users size={14} /> Proveedores
            </button>
          </div>

          {vistaActiva === 'PROVEEDORES' ? (
            <button 
              onClick={() => {
                setProveedorAEditar(null);
                setIsModalProvOpen(true);
              }}
              className="bg-[var(--color-info)] text-white px-6 py-2.5 border-2 border-[var(--color-ink)] font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-info)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] h-[44px]"
            >
              <Plus size={16} /> Nuevo Proveedor
            </button>
          ) : (
            <button 
              onClick={() => setIsModalLoteOpen(true)}
              className="bg-[var(--color-info)] text-white px-6 py-2.5 border-2 border-[var(--color-ink)] font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-info)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] h-[44px]"
            >
              <Plus size={16} /> Ingreso de Stock
            </button>
          )}
        </div>
      </div>

      {vistaActiva === 'PROVEEDORES' ? (
        <FiltrosProveedores 
          searchQuery={searchQueryProv}
          setSearchQuery={setSearchQueryProv}
          filtroEstado={filtroEstadoProv}
          setFiltroEstado={setFiltroEstadoProv}
          matchCount={filteredProveedores.length}
        />
      ) : (
        <FiltrosInventario 
          searchQuery={searchQueryLotes}
          setSearchQuery={setSearchQueryLotes}
          matchCount={0}
          categorias={categoriasUnicas}
          filtroCategoria={filtroCategoriaLotes}
          setFiltroCategoria={setFiltroCategoriaLotes}
          filtroEstado={filtroEstadoLotes}
          setFiltroEstado={setFiltroEstadoLotes}
          filtroOrden={filtroOrdenLotes}
          setFiltroOrden={setFiltroOrdenLotes}
          onClearFilters={() => {
            setSearchQueryLotes('');
            setFiltroCategoriaLotes('');
            setFiltroEstadoLotes('');
            setFiltroOrdenLotes('NOMBRE_ASC');
          }}
        />
      )}

      <div className="px-3 lg:px-4 flex-1 flex flex-col min-h-[calc(var(--alto-pantalla)*0.5)] relative pb-8">
        
        {/* VISTA PROVEEDORES */}
        <div className={`flex-1 min-h-0 flex-col ${vistaActiva === 'PROVEEDORES' ? 'flex' : 'hidden'}`}>
          {loadingProv ? (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center border-2 border-[var(--color-border)]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={24} className="text-[var(--color-info)] animate-spin" />
                <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-[0.2em]">Cargando Directorio...</span>
              </div>
            </div>
          ) : (
            <TablaProveedores 
              proveedores={filteredProveedores} 
              onEdit={(prov) => {
                setProveedorAEditar(prov);
                setIsModalProvOpen(true);
              }}
              onDelete={async (prov) => {
                const idxAntes = filteredProveedores.findIndex((x) => x.id === prov.id);
                if (await confirmar(`⚠️ ALERTA: ¿Estás seguro de eliminar al proveedor "${prov.razon_social}"? Esta acción no se puede deshacer.`)) {
                  try {
                    const { error } = await supabase.from('providers').delete().eq('id', prov.id);
                    if (error) throw error;
                    await fetchProveedores();
                    setTimeout(() => {
                      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-row-prov="true"]'));
                      const destino = rows.length ? rows[Math.min(Math.max(idxAntes, 0), rows.length - 1)] : null;
                      const el = destino || document.getElementById('buscador-seccion-proveedores') || document.querySelector<HTMLElement>('input[type="text"]');
                      el?.focus();
                      el?.scrollIntoView({ block: 'nearest' });
                    }, 120);
                  } catch (e: any) {
                    alert("Error al eliminar: " + e.message);
                  }
                }
              }}
            />
          )}
        </div>

        {/* VISTA LOTES */}
        <div className={`flex-1 min-h-0 flex-col ${vistaActiva === 'LOTES' ? 'flex' : 'hidden'}`}>
          <TablaLotes 
            key={refreshLotesKey}
            searchQuery={searchQueryLotes}
            filtroCategoria={filtroCategoriaLotes}
            filtroEstado={filtroEstadoLotes}
            filtroOrden={filtroOrdenLotes}
            nuevoLoteInyectado={nuevoLoteRealtime}
            onViewHistory={(lote) => {
              setSearchQueryLotes(lote.product_name);
            }}
            onEditLote={(lote) => {
              setLoteToEdit(lote);
              setIsModalLoteOpen(true);
            }}
            onLoteDeleted={(productId, quantityRemoved) => {
              setProducts(prev => prev.map(p => {
                if (p.id === productId) {
                  const nuevoStock = Math.max(0, p.quantity - quantityRemoved);
                  return { ...p, quantity: nuevoStock, cost: nuevoStock === 0 ? 0 : p.cost };
                }
                return p;
              }));
            }}
          />
        </div>

      </div>

      {/* MODAL PROVEEDORES */}
      <ModalProveedor 
        isOpen={isModalProvOpen}
        onClose={() => {
          setIsModalProvOpen(false);
          setProveedorAEditar(null);
        }}
        proveedoresExistentes={proveedores}
        proveedorAEditar={proveedorAEditar}
        onSave={handleSaveProveedor}
      />

      {/* MODAL LOTES */}
      <ModalLote 
        isOpen={isModalLoteOpen} 
        onClose={() => {
          setIsModalLoteOpen(false);
          setLoteToEdit(null);
        }} 
        productos={products} 
        initialProduct={null}
        initialLote={loteToEdit}
        onLoteSaved={(lote) => {
          setNuevoLoteRealtime(lote);
          setLoteToEdit(null);
          if (!loteToEdit) setSearchQueryLotes(''); 

          const cantidadDiferencia = loteToEdit 
            ? Number(lote.quantity) - Number(loteToEdit.quantity || 0) 
            : Number(lote.initial_quantity || lote.quantity);

          setProducts(prevProducts => prevProducts.map(p => 
            p.id === lote.product_id 
              ? { 
                  ...p, 
                  quantity: Math.max(0, p.quantity + cantidadDiferencia),
                  cost: Number(lote.cost_unit)
                } 
              : p
          ));
        }}
      />
    </div>
  );
};

