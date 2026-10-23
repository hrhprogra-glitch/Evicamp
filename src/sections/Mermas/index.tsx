import { coincideBusqueda } from '../../utils/busqueda';
﻿import React, { useState, useEffect, useMemo } from 'react';
import { Database, TrendingDown, PackageMinus, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '../../db/supabase';
import type { Merma } from './types';
import type { Product } from '../Inventario/types';
import { ModalMerma } from '../Inventario/components/ModalMerma';
import { ModalTomaInventario } from '../Inventario/components/ModalTomaInventario';
import { usePermiso, avisarSinPermiso } from '../../utils/permisos';

// Componentes
import { HeaderMermas } from './components/HeaderMermas';
import { FiltrosMermas } from './components/FiltrosMermas';
import { TarjetaMetrica } from './components/TarjetaMetrica';
import { TablaMermas } from './components/TablaMermas';
import { traerTodo } from '../../utils/traerTodo';
import { confirmar, avisar } from '../../utils/dialogos';

export const Mermas: React.FC = () => {
  const [mermas, setMermas] = useState<Merma[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalMermaOpen, setIsModalMermaOpen] = useState(false);
  const [mermaAEditar, setMermaAEditar] = useState<any>(null);
  // Toma de inventario (fase 2.2): lo contado queda anotado aquí. Quien solo tiene "Contar inventario" ve
  // únicamente el botón Contar: la lista de mermas muestra lo que decía el sistema (el conteo es a ciegas)
  const puedeContar = usePermiso('inventario_contar');
  const veMermas = usePermiso('almacen_registrar_mermas');
  const soloConteo = puedeContar && !veMermas;
  const [isModalConteoOpen, setIsModalConteoOpen] = useState(false);
  const abrirConteo = () => (puedeContar ? setIsModalConteoOpen(true) : avisarSinPermiso('contar inventario'));
  const cerrarConteo = () => { setIsModalConteoOpen(false); setTimeout(() => document.getElementById('btn-toma-inventario')?.focus(), 30); };

  // Estados de Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroMotivo, setFiltroMotivo] = useState('');
  const [filtroOrden, setFiltroOrden] = useState('FECHA_DESC');
  const [filtroFecha, setFiltroFecha] = useState('');

  const fetchMermas = async () => {
    setLoading(true);
    try {
      const [{ data, error }, { data: cajas }] = await Promise.all([
        traerTodo(() => supabase
          .from('waste')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id')),
        // El turno de cada registro: quién abrió y quién cerró la caja en ese momento
        supabase.from('cash_sessions').select('id, opened_at, closed_at, abierta_por, cerrada_por').order('opened_at', { ascending: false }).limit(1000),
      ]);

      if (error) throw error;

      const turnoDe = (fecha: string | null) => {
        if (!fecha || !cajas) return '';
        const t = Date.parse(fecha);
        const caja = (cajas as any[]).find((c) => Date.parse(c.opened_at) <= t && (!c.closed_at || t <= Date.parse(c.closed_at)));
        if (!caja) return '';
        return `Turno: ${caja.abierta_por || 'sin registro'}${caja.closed_at ? ` → ${caja.cerrada_por || 'sin registro'}` : ' (caja abierta)'}`;
      };

      if (data) {
        const mapeados = data.map((w: any) => ({
          ...w,
          product_name: w.product_name || 'DESCONOCIDO',
          quantity: Math.abs(Number(w.quantity) || 0),
          sobrante: Number(w.quantity) > 0,
          turno: turnoDe(w.created_at),
          cost_unit: Number(w.cost_unit) || 0,
          total_loss: Number(w.total_loss) || 0,
          reason: w.reason || 'SIN MOTIVO',
          notes: w.notes,
          user_name: w.user || 'Sistema',
          created_at: w.created_at ? new Date(w.created_at).toLocaleString() : 'SIN FECHA',
          raw_date: w.created_at,
        })) as any[];
        setMermas(mapeados);
      }
    } catch (error) {
      console.error("DEBUG TÉCNICO - Error cargando mermas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await traerTodo(() => supabase.from('products').select('*').order('id'));
      if (error) throw error;
      if (data) {
        const mapeados: Product[] = data.map((p: any) => {
          // Es Consumo solo si sus campos de TIPO/UNIDAD lo dicen exactamente
          // (antes se buscaba en toda la fila: una categoría o nombre "CONSUMO" lo marcaba por error).
          const TIPOS_CONSUMO = ['CONSUMO', 'SERVICE', 'USO INTERNO', 'CONSUMPTION'];
          const esConsumo = [p.unit, p.control_type, p.weight_unit]
            .some(v => TIPOS_CONSUMO.includes(String(v ?? '').trim().toUpperCase()));

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
            unit: esConsumo ? 'CONSUMO' : (p.unit || p.weight_unit || (p.control_type === 'WEIGHT' ? 'KG' : 'UND')),
            imageUrl: p.image_url || p.image_path || null
          };
        });
        setProducts(mapeados);
      }
    } catch (error) {
      console.error("DEBUG TÉCNICO - Error cargando productos:", error);
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

    if (filtroFecha) {
      result = result.filter(m => {
        const dateObj = new Date(m.raw_date);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const fechaRegistro = `${yyyy}-${mm}-${dd}`;
        return fechaRegistro === filtroFecha;
      });
    }

    if (searchQuery && searchQuery.trim()) {
      result = result.filter(m => coincideBusqueda([m.product_name, m.notes], searchQuery));
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

  const totalPerdidaEconómica = filteredMermas.reduce((acc, m) => acc + m.total_loss, 0);
  const totalUnidadesPerdidas = filteredMermas.reduce((acc, m) => acc + (m.sobrante ? -m.quantity : m.quantity), 0); // un sobrante descuenta

  // CONTROLADOR DE ELIMINACIÓN INTELIGENTE - EVICAMP STANDARD (V2 Resiliente)
  const handleDeleteMerma = async (merma: Merma) => {
    const esConsumo = merma.reason === 'USO INTERNO' || Number(merma.quantity) === 0;

    const mensajeConfirmacion = merma.sobrante
      ? `¿Eliminar el sobrante de ${merma.product_name}? Se quitarán ${Math.abs(Number(merma.quantity))} unidades del inventario.`
      : esConsumo
      ?`OPERACIÓN FINANCIERA: ¿Anular el registro de gasto de S/ ${merma.total_loss.toFixed(2)} en ${merma.product_name}?`
      : `OPERACIÓN CRÍTICA: ¿Eliminar merma de ${merma.product_name}? Se restaurarán ${Math.abs(Number(merma.quantity))} unidades al inventario.`;

    if (!await confirmar(mensajeConfirmacion)) return;

    try {
      setLoading(true);

      // 🛡️ Ciberseguridad & Arquitectura Resiliente: Constructor de consultas dinámico
      let deleteQuery = supabase.from('waste').delete();

      if (merma.id) {
        // Vía Primaria: Borrado por ID único absoluto
        deleteQuery = deleteQuery.eq('id', merma.id);
      } else if (merma.raw_date && merma.product_id) {
        // Vía Secundaria (Fallback): Si la BD omite el ID (por RLS o datos heredados), 
        // usamos la "Huella Temporal Exacta" (timestamp + producto) para identificar la fila.
        deleteQuery = deleteQuery
          .eq('created_at', merma.raw_date)
          .eq('product_id', merma.product_id);
      } else {
        // Bloqueo estricto solo si el registro es totalmente fantasma
        throw new Error("Violación estructural: El registro carece de ID y de Marca de Tiempo. Imposible operar de forma segura en la base de datos.");
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw new Error(`Fallo en motor SQL: ${deleteError.message}`);

      await avisar(merma.sobrante
        ? '✅ SOBRANTE ELIMINADO. SE QUITÓ DEL INVENTARIO.'
        : esConsumo
        ? '✅ REGISTRO FINANCIERO DE GASTO ELIMINADO CON ÉXITO.'
        : '✅ MERMA ELIMINADA. EL INVENTARIO FUE RESTAURADO.');
      
      // Sincronización del Plano de Datos
      await Promise.all([fetchMermas(), fetchProducts()]);

    } catch (error: any) {
      console.error('DEBUG TÉCNICO - FALLO EN TRANSACCIÓN DELETE:', error);
      alert(`ERROR DEL SISTEMA: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  // Auto-Focus Magnet para Mermas (Foco inicial en buscador)
  useEffect(() => {
    const enforceFocus = () => {
      if (isModalMermaOpen || document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-50')) return;
      const active = document.activeElement;

      // 🛡️ NO SECUESTRAR FOCO SI EL SIDEBAR ESTÁ ABIERTO
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const activeTag = active?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'BUTTON' || activeTag === 'A' || activeTag === 'SELECT' || active?.getAttribute('role') === 'button') return;

      const searchInput = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    };

    const forceMountFocus = () => {
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      if (!isModalMermaOpen && !document.querySelector('.fixed.inset-0.z-50')) {
        const searchInput = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    const handleGlobalClick = () => setTimeout(enforceFocus, 50);
    const handleWindowFocus = () => setTimeout(enforceFocus, 50);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    const timer = setTimeout(forceMountFocus, 100);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
      clearTimeout(timer);
    };
  }, [isModalMermaOpen]);

  // Navegación de Grilla con Teclado (Patrón Selector de Evicamp)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isModalMermaOpen || document.querySelector('.fixed.inset-0.z-50')) return;

      const active = document.activeElement as HTMLElement;

      // 🛡️ PRIORIDAD DEL SIDEBAR: Si el sidebar está abierto o el foco está en el menú lateral, Mermas no interfiere
      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') {
        return;
      }
      if (active && (active.id === 'evicamp-sidebar' || active.closest('#evicamp-sidebar') || sidebar?.contains(active))) {
        return;
      }

      // Ignorar si el foco o target es un campo de texto / input
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const rowSelector = 'div[data-row="true"][role="button"]';
      const currentRow = active ? (active.closest(rowSelector) as HTMLElement) : null;

      const getRows = () => {
        return Array.from(document.querySelectorAll(rowSelector))
          .filter((el): el is HTMLElement => {
            const htmlEl = el as HTMLElement;
            return !htmlEl.closest('.hidden');
          });
      };

      if (currentRow) {
        if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
          e.preventDefault();
          const rows = getRows();
          const rowIndex = rows.indexOf(currentRow);

          if (e.key === 'ArrowDown') {
            const nextRow = rows[rowIndex + 1];
            if (nextRow) {
              nextRow.focus();
              nextRow.scrollIntoView({ block: 'nearest' });
            } else {
              // Última fila: bajar a la paginación
              const btnNext = document.getElementById('btn-pag-bottom-next-mermas') || document.getElementById('btn-pag-next-mermas');
              const btnPrev = document.getElementById('btn-pag-bottom-prev-mermas') || document.getElementById('btn-pag-prev-mermas');
              if (btnNext) {
                btnNext.focus();
              } else if (btnPrev) {
                btnPrev.focus();
              }
            }
          } else if (e.key === 'ArrowUp') {
            if (rowIndex > 0) {
              const prevRow = rows[rowIndex - 1];
              if (prevRow) {
                prevRow.focus();
                prevRow.scrollIntoView({ block: 'nearest' });
              }
            } else {
              // Fila 0: Subir a la paginación superior
              const btnPrev = document.getElementById('btn-pag-prev-mermas');
              const btnNext = document.getElementById('btn-pag-next-mermas');
              if (btnPrev && btnPrev.getAttribute('aria-disabled') !== 'true') {
                btnPrev.focus();
              } else if (btnNext) {
                btnNext.focus();
              } else if (btnPrev) {
                btnPrev.focus();
              } else {
                const searchInput = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
                if (searchInput) {
                  searchInput.focus();
                  searchInput.select();
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }
            }
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            // Navegación horizontal DENTRO de la fila hacia botones de acción
            const focusables = [currentRow, ...Array.from(currentRow.querySelectorAll('button:not([disabled])'))] as HTMLElement[];
            const focusIndex = focusables.indexOf(active);

            if (e.key === 'ArrowRight') {
              const nextTarget = focusables[focusIndex + 1];
              if (nextTarget) nextTarget.focus();
            } else if (e.key === 'ArrowLeft') {
              const prevTarget = focusables[focusIndex - 1];
              if (prevTarget) prevTarget.focus();
            }
          }
        } else if (e.key === 'Escape') {
          const searchInput = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
          if (searchInput) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
          }
        }
      } else {
        // Rescate de foco perdido si está en body o contenedor general
        if (e.key === 'ArrowUp') {
          // 🛡️ TOPE: Si el foco está en un botón o control superior, actuar como límite y no devolver el foco abajo
          if (active && (active.tagName === 'BUTTON' || active.closest('button'))) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          e.preventDefault();
          const searchInput = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const rows = getRows();
          if (rows.length > 0) {
            rows[0].focus();
            rows[0].scrollIntoView({ block: 'nearest' });
          } else {
            const searchInput = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
            if (searchInput) searchInput.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isModalMermaOpen]);

  if (soloConteo) {
    return (
      <div className="flex flex-col gap-6 p-4 sm:p-8 text-[var(--color-ink)] font-mono min-h-full bg-[var(--color-surface)]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--color-danger-bg)] border-2 border-[var(--color-danger)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-danger)] shrink-0">
            <AlertTriangle size={24} className="text-[var(--color-danger)]" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-widest">Control de Pérdidas</h1>
        </div>
        <div className="border-2 border-[var(--color-border)] bg-[var(--color-bg)] p-6 flex flex-col items-start gap-4 max-w-xl">
          <p className="font-bold text-sm">Tu usuario cuenta el inventario. Escanea o busca cada producto y escribe cuántos hay en el estante; si falta o sobra, elige el motivo y escribe qué pasó.</p>
          <button id="btn-toma-inventario" autoFocus onClick={abrirConteo} className="bg-[var(--color-warning)] text-[var(--color-ink)] px-6 py-4 border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] cursor-pointer shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
            <ClipboardCheck size={16} /> Contar inventario
          </button>
        </div>
        <ModalTomaInventario isOpen={isModalConteoOpen} onClose={cerrarConteo} products={products} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 short:gap-3 w-full pb-10 text-[var(--color-ink)] font-mono min-h-full bg-[var(--color-surface)] relative rounded-none">
      
      <HeaderMermas 
        onNuevaMerma={() => setIsModalMermaOpen(true)} 
        onContar={abrirConteo}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex gap-3 sm:gap-4 w-full xl:w-auto">
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
      </HeaderMermas>

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
          setFiltroFecha('');
        }}
      />

      <div className="px-3 lg:px-4 flex-1 flex flex-col min-h-[calc(var(--alto-pantalla)*0.6)] relative pb-8 rounded-none">
        {loading ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
  <div className="flex flex-col items-center gap-4">
    <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-ink)] animate-spin rounded-full"></div>
    <span className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest font-mono">Cargando...</span>
  </div>
</div>
        ) : (
          <TablaMermas
            mermas={filteredMermas}
            products={products}
            onEdit={(merma) => {
              // Un ajuste del conteo no se edita: si hubo un error, se borra y se vuelve a contar
              if (merma.origen === 'CONTEO') {
                void avisar(`Este registro viene de la TOMA DE INVENTARIO y no se edita.\n\n${merma.sobrante ? 'Sobrante' : 'Merma'} de ${merma.product_name}: contó ${merma.conteo_contado ?? '—'}, el sistema decía ${merma.conteo_sistema ?? '—'}.\nMotivo: ${merma.reason}\nJustificación: ${merma.notes || '—'}\nPor: ${merma.user_name} · ${merma.created_at}${merma.turno ? `\n${merma.turno}` : ''}\n\nSi hubo un error, bórralo con el tacho y vuelve a contar.`);
                return;
              }
              setMermaAEditar(merma);
              setIsModalMermaOpen(true);
            }}
            onDelete={handleDeleteMerma}
          />
        )}
      </div>

      <ModalTomaInventario
        isOpen={isModalConteoOpen}
        onClose={cerrarConteo}
        products={products}
        onContado={() => { fetchMermas(); fetchProducts(); }}
      />

      {/* MODAL */}
      <ModalMerma 
        isOpen={isModalMermaOpen} 
        initialData={mermaAEditar} 
        onClose={() => {
          setIsModalMermaOpen(false);
          setMermaAEditar(null);
          fetchMermas(); 
          fetchProducts();
        }}
        productos={products}
      />

    </div>
  );
};

