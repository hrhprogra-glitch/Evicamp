import React, { useState, useEffect } from 'react';
import { Settings, Building2, Users, Palette, MessageSquare } from 'lucide-react';
import { FormularioEmpresa } from './components/FormularioEmpresa';
import { TablaUsuarios } from './components/TablaUsuarios';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { SugerenciasSiumax } from './components/SugerenciasSiumax';
import { usePermiso } from '../../utils/permisos';

type Pestana = 'empresa' | 'usuarios' | 'apariencia' | 'sugerencias';

const Configuraciones: React.FC = () => {
  // Cada pestaña tiene su permiso; se abre en la primera permitida
  const puedeEmpresa = usePermiso('gerencia_configuracion_sistema');
  const puedeUsuarios = usePermiso('gerencia_gestionar_usuarios');
  const [activeTab, setActiveTab] = useState<Pestana>(puedeEmpresa ? 'empresa' : 'usuarios');

  const pestanas = [
    ...(puedeEmpresa ? [{ id: 'empresa' as Pestana, nombre: 'Datos de la Empresa', Icono: Building2 }] : []),
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
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* HEADER */}
      <div className="bg-white border-b border-[var(--color-border)] p-3 lg:p-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white border-2 border-[var(--color-accent-shadow)] flex items-center justify-center shadow-[4px_4px_0_0_var(--color-accent-shadow)] rounded-none shrink-0">
            <Settings size={24} className="text-[var(--color-accent-shadow)]" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--color-ink)] uppercase tracking-wider font-mono">
              Parámetros del Sistema
            </h1>
            <p className="text-[12px] font-black text-[var(--color-muted)] uppercase tracking-widest font-mono mt-1">
              Gestiona los datos de tu empresa, los accesos, la apariencia y escríbele a SiuMax.
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="px-3 lg:px-4 pt-3 border-b border-[var(--color-border)] bg-white shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex gap-6 min-w-max">
          {pestanas.map(({ id, nombre, Icono }) => (
            <button
              key={id}
              id={`btn-tab-${id}`}
              onClick={() => switchTab(id)}
              onKeyDown={(e) => manejarTeclaPestana(e, id)}
              className={`pb-3 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-colors relative focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer ${
                activeTab === id
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Icono size={18} />
              {nombre}
              {activeTab === id && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--color-accent)]"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-auto p-2 lg:p-4">
        {activeTab === 'empresa' && puedeEmpresa && <FormularioEmpresa />}
        {activeTab === 'usuarios' && puedeUsuarios && <TablaUsuarios />}
        {activeTab === 'apariencia' && <ThemeSwitcher />}
        {activeTab === 'sugerencias' && <SugerenciasSiumax />}
      </div>
    </div>
  );
};

export default Configuraciones;
