import React, { useState, useEffect } from 'react';
import { Settings, Building2, Users, Palette } from 'lucide-react';
import { FormularioEmpresa } from './components/FormularioEmpresa';
import { TablaUsuarios } from './components/TablaUsuarios';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { usePermiso } from '../../utils/permisos';

const Configuraciones: React.FC = () => {
  // Cada pestaña tiene su permiso; se abre en la primera permitida
  const puedeEmpresa = usePermiso('gerencia_configuracion_sistema');
  const puedeUsuarios = usePermiso('gerencia_gestionar_usuarios');
  const [activeTab, setActiveTab] = useState<'empresa' | 'usuarios' | 'apariencia'>(puedeEmpresa ? 'empresa' : 'usuarios');

  const switchTab = (tab: 'empresa' | 'usuarios' | 'apariencia') => {
    setActiveTab(tab);
    setTimeout(() => {
      document.getElementById(`btn-tab-${tab}`)?.focus();
    }, 20);
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
              Gestiona los datos de tu empresa, los accesos y la apariencia visual.
            </p>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="px-3 lg:px-4 pt-3 border-b border-[var(--color-border)] bg-white shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex gap-6 min-w-max">
          {puedeEmpresa && (
          <button
            id="btn-tab-empresa"
            onClick={() => switchTab('empresa')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                if (puedeUsuarios) {
                  switchTab('usuarios');
                } else {
                  switchTab('apariencia');
                }
              } else if (e.key === 'ArrowDown' || (!e.shiftKey && e.key === 'Tab')) {
                e.preventDefault();
                e.stopPropagation();
                const primerInput = document.getElementById('input-empresa-nombre') as HTMLInputElement | null;
                if (primerInput) {
                  primerInput.focus();
                  primerInput.select();
                }
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className={`pb-3 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-colors relative focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer ${
              activeTab === 'empresa'
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Building2 size={18} />
            Datos de la Empresa
            {activeTab === 'empresa' && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--color-accent)]"></div>
            )}
          </button>
          )}
          
          {puedeUsuarios && (
          <button
            id="btn-tab-usuarios"
            onClick={() => switchTab('usuarios')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (puedeEmpresa) {
                  switchTab('empresa');
                }
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();
                switchTab('apariencia');
              } else if (e.key === 'ArrowDown' || (!e.shiftKey && e.key === 'Tab')) {
                e.preventDefault();
                e.stopPropagation();
                const buscador = document.getElementById('buscador-usuarios-ajustes') as HTMLInputElement | null;
                if (buscador) {
                  buscador.focus();
                  buscador.select();
                }
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className={`pb-3 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-colors relative focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer ${
              activeTab === 'usuarios'
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Users size={18} />
            Gestión de Usuarios
            {activeTab === 'usuarios' && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--color-accent)]"></div>
            )}
          </button>
          )}

          <button
            id="btn-tab-apariencia"
            onClick={() => switchTab('apariencia')}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();
                if (puedeUsuarios) {
                  switchTab('usuarios');
                } else if (puedeEmpresa) {
                  switchTab('empresa');
                }
              } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();
              } else if (e.key === 'ArrowDown' || (!e.shiftKey && e.key === 'Tab')) {
                e.preventDefault();
                e.stopPropagation();
                const activeTheme = localStorage.getItem('gestorpro_theme') || 'classic';
                const themeBtn = document.getElementById(`btn-tema-${activeTheme}`) || (document.querySelector('#panel-temas-ajustes button') as HTMLElement | null);
                themeBtn?.focus();
              }
            }}
            className={`pb-3 font-bold text-sm uppercase tracking-wider flex items-center gap-2 transition-colors relative focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] cursor-pointer ${
              activeTab === 'apariencia'
                ? 'text-[var(--color-accent)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Palette size={18} />
            Apariencia
            {activeTab === 'apariencia' && (
              <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--color-accent)]"></div>
            )}
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-auto p-2 lg:p-4">
        {activeTab === 'empresa' && puedeEmpresa && <FormularioEmpresa />}
        {activeTab === 'usuarios' && puedeUsuarios && <TablaUsuarios />}
        {activeTab === 'apariencia' && <ThemeSwitcher />}
      </div>
    </div>
  );
};

export default Configuraciones;
