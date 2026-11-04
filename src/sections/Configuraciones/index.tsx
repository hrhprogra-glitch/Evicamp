import React, { useState, useEffect } from 'react';
import { Settings, Building2, Users, Palette, MessageSquare, Store as StoreIcon, ShoppingBag, FileText } from 'lucide-react';
import { FormularioEmpresa } from './components/FormularioEmpresa';
import { TablaUsuarios } from './components/TablaUsuarios';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { SugerenciasSiumax } from './components/SugerenciasSiumax';
import { PestanaTiendas } from './components/PestanaTiendas';
import { PestanaTiendaWeb } from './components/PestanaTiendaWeb';
import { PestanaFacturacion } from './components/PestanaFacturacion';
import { usePermiso } from '../../utils/permisos';

type Pestana = 'empresa' | 'tiendas' | 'tienda_web' | 'facturacion' | 'usuarios' | 'apariencia' | 'sugerencias';

const Configuraciones: React.FC = () => {
  // Cada pestaña tiene su permiso; se abre en la primera permitida
  const puedeEmpresa = usePermiso('gerencia_configuracion_sistema');
  const puedeUsuarios = usePermiso('gerencia_gestionar_usuarios');
  const [activeTab, setActiveTab] = useState<Pestana>(puedeEmpresa ? 'empresa' : 'usuarios');

  const pestanas = [
    ...(puedeEmpresa ? [{ id: 'empresa' as Pestana, nombre: 'Datos de la Empresa', Icono: Building2 }] : []),
    ...(puedeEmpresa ? [{ id: 'tiendas' as Pestana, nombre: 'Tiendas y Almacenes', Icono: StoreIcon }] : []),
    ...(puedeEmpresa ? [{ id: 'tienda_web' as Pestana, nombre: 'Tienda Web', Icono: ShoppingBag }] : []),
    // Boletas y facturas electrónicas SUNAT (fase 11)
    ...(puedeEmpresa ? [{ id: 'facturacion' as Pestana, nombre: 'Facturación', Icono: FileText }] : []),
    ...(puedeUsuarios ? [{ id: 'usuarios' as Pestana, nombre: 'Gestión de Usuarios', Icono: Users }] : []),
    { id: 'apariencia' as Pestana, nombre: 'Apariencia', Icono: Palette },
    // Le escriben directo a SiuMax (llega al Panel de Control)
    { id: 'sugerencias' as Pestana, nombre: 'Sugerencias y Errores', Icono: MessageSquare },
  ];

  const switchTab = (tab: Pestana) => {
    setActiveTab(tab);
    setTimeout(() => {
      document.getElementById(`btn-tab-${tab}`)?.focus();
    }, 20);
  };

  // Primer elemento del contenido de la pestaña abierta
  const enfocarContenido = () => {
    if (activeTab === 'empresa') {
      const input = document.getElementById('input-empresa-nombre') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    } else if (activeTab === 'tiendas') {
      document.getElementById('btn-nueva-tienda')?.focus();
    } else if (activeTab === 'tienda_web') {
      document.getElementById('input-tienda-web-whatsapp')?.focus();
    } else if (activeTab === 'facturacion') {
      document.getElementById('fact-activo')?.focus();
    } else if (activeTab === 'usuarios') {
      const buscador = document.getElementById('buscador-usuarios-ajustes') as HTMLInputElement | null;
      buscador?.focus();
      buscador?.select();
    } else if (activeTab === 'sugerencias') {
      document.getElementById('sug-tipo-sugerencia')?.focus();
    } else {
      const activeTheme = localStorage.getItem('gestorpro_theme') || 'classic';
      const themeBtn = document.getElementById(`btn-tema-${activeTheme}`) || (document.querySelector('#panel-temas-ajustes button') as HTMLElement | null);
      themeBtn?.focus();
    }
  };

  // Las flechas solo mueven la selección entre pestañas; la pestaña se abre con Enter (o clic)
  const manejarTeclaPestana = (e: React.KeyboardEvent, id: Pestana) => {
    const i = pestanas.findIndex((p) => p.id === id);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      const destino = pestanas[i + (e.key === 'ArrowRight' ? 1 : -1)];
      if (destino) document.getElementById(`btn-tab-${destino.id}`)?.focus();
    } else if (e.key === 'ArrowDown' || (!e.shiftKey && e.key === 'Tab')) {
      e.preventDefault();
      e.stopPropagation();
      enfocarContenido();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // 🧲 Auto-Focus Magnet para la sesión Ajustes / Configuraciones
  useEffect(() => {
    const enforceFocus = () => {
      if (
        document.querySelector('[role="dialog"]') ||
        document.querySelector('.fixed.inset-0.z-50')
      ) return;

      const sidebar = document.getElementById('evicamp-sidebar');
      if (sidebar?.getAttribute('data-sidebar-open') === 'true') return;

      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && !active.closest('#evicamp-sidebar')) {
        const tag = active.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
        if (active.closest('tr[data-row="true"]')) return;
        if (active.getAttribute('role') === 'button') return;
      }

      if (activeTab === 'empresa') {
        const input = document.getElementById('input-empresa-nombre') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
          return;
        }
        document.getElementById('btn-tab-empresa')?.focus();
      } else if (activeTab === 'usuarios') {
        const input = document.getElementById('buscador-usuarios-ajustes') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
          return;
        }
        document.getElementById('btn-tab-usuarios')?.focus();
      } else if (activeTab === 'apariencia') {
        const themeBtn = document.querySelector('#panel-temas-ajustes button') as HTMLElement | null;
        if (themeBtn) {
          themeBtn.focus();
          return;
        }
        document.getElementById('btn-tab-apariencia')?.focus();
      } else if (activeTab === 'sugerencias') {
        (document.querySelector('[id^="sug-tipo-"][aria-checked="true"]') as HTMLElement | null)?.focus();
      }
    };

    const handleWindowFocus = () => setTimeout(enforceFocus, 50);
    const handleGlobalClick = () => setTimeout(enforceFocus, 50);

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('click', handleGlobalClick);

    const timer = setTimeout(enforceFocus, 80);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] text-[var(--color-ink)] font-mono">
      {/* CABECERA (como Inventario / Clientes): título y pestañas sobrias */}
      <div className="bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] px-3 sm:px-4 lg:px-6 py-4 sm:py-6 flex flex-wrap justify-between items-center gap-4 shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 lg:gap-8 min-w-0 max-w-full">
          <div className="flex items-center gap-3 shrink-0" title="Parámetros del Sistema · Gestiona tu empresa, usuarios, facturación y apariencia">
            <div className="w-10 h-10 bg-[var(--color-accent-bg)] border-2 border-[var(--color-accent)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent)] rounded-none shrink-0">
              <Settings size={20} className="text-[var(--color-accent)]" />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-[var(--color-ink)] uppercase tracking-widest whitespace-nowrap">
              Ajustes
            </h1>
          </div>

          {/* PESTAÑAS SOBRIAS: ← → mueven el selector, Enter cambia de pestaña, ↓ baja al contenido */}
          <div role="tablist" aria-label="Ajustes" className="pestanas-sobrias flex min-w-0 w-full md:w-auto">
            {pestanas.map(({ id, nombre, Icono }) => (
              <button
                key={id}
                id={`btn-tab-${id}`}
                role="tab"
                aria-selected={activeTab === id}
                data-activa={activeTab === id}
                type="button"
                onClick={() => switchTab(id)}
                onKeyDown={(e) => manejarTeclaPestana(e, id)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 lg:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all rounded-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${
                  activeTab === id
                    ? 'bg-[var(--color-ink)] text-[var(--color-accent)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-bg)]'
                }`}
              >
                <Icono size={14} />
                <span className="hidden sm:inline">{nombre}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-auto p-2 sm:p-4">
        {activeTab === 'empresa' && puedeEmpresa && <FormularioEmpresa />}
        {activeTab === 'tiendas' && puedeEmpresa && <PestanaTiendas />}
        {activeTab === 'tienda_web' && puedeEmpresa && <PestanaTiendaWeb />}
        {activeTab === 'facturacion' && puedeEmpresa && <PestanaFacturacion onIrEmpresa={() => switchTab('empresa')} />}
        {activeTab === 'usuarios' && puedeUsuarios && <TablaUsuarios />}
        {activeTab === 'apariencia' && <ThemeSwitcher />}
        {activeTab === 'sugerencias' && <SugerenciasSiumax />}
      </div>
    </div>
  );
};

export default Configuraciones;
