import React, { useEffect, useState, useRef } from 'react';
import { Login } from './sections/Login';
import { SideBar, ATAJOS_SESIONES } from './layout/SideBar';
import { validarSesion, type EmpleadoSesion } from './utils/sesion';
import { puedeVerModulo } from './utils/permisos';
import { SesionProvider } from './utils/SesionProvider';

// Importación de Módulos (Secciones)
import { Inventario } from './sections/Inventario';
import { Mermas } from './sections/Mermas';
import { Proveedores } from './sections/Proveedores';
import { POS } from './sections/Punto-de-venta';
import { Fiados } from './sections/Fiados'; // <--- IMPORTAMOS FIADOS
import { Finanzas } from './sections/Finanzas'; // <--- IMPORTAMOS FINANZAS
import { Utilidades } from './sections/Utilidades';
import Configuraciones from './sections/Configuraciones';
import { aplicarTamanoInterfaz, leerTamanoInterfaz } from './utils/tamanoInterfaz';
import { AlertaYape } from './layout/AlertaYape';
import { programarRestauracionFoco } from './utils/navegacionSesion';

// Cada cuánto se vuelve a leer el estado y los permisos del empleado desde la base
const REVALIDAR_CADA_MS = 60_000;

export const App: React.FC = () => {
  // Empleado de la sesión actual (con permisos leídos de la base, nunca del navegador)
  const [empleado, setEmpleado] = useState<EmpleadoSesion | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<string>('pos');
  const currentViewRef = useRef(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);
  // El menú lateral guarda su estado en localStorage.
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const guardado = localStorage.getItem('evicamp_sidebar_open');
    return guardado === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarOpen((abierto) => {
      const nuevo = !abierto;
      localStorage.setItem('evicamp_sidebar_open', String(nuevo));
      return nuevo;
    });
  };

  const handleCloseSidebar = () => {
    const sidebar = document.getElementById('evicamp-sidebar');
    sidebar?.setAttribute('data-sidebar-open', 'false');
    setIsSidebarOpen(false);
    localStorage.setItem('evicamp_sidebar_open', 'false');
    programarRestauracionFoco(currentViewRef.current);
  };

  // Atajo global: Tab para alternar el menú lateral con prioridad absoluta
  useEffect(() => {
    const handleGlobalTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Respetar focus-trap si hay modal abierto
        if (document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-50')) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const sidebar = document.getElementById('evicamp-sidebar');
        const estaAbierto = isSidebarOpen || sidebar?.getAttribute('data-sidebar-open') === 'true';

        if (estaAbierto) {
          // Si está abierto, Tab lo CIERRA y devuelve el foco al elemento principal de la sesión
          sidebar?.setAttribute('data-sidebar-open', 'false');
          setIsSidebarOpen(false);
          localStorage.setItem('evicamp_sidebar_open', 'false');

          programarRestauracionFoco(currentViewRef.current);
        } else {
          // Si está cerrado, Tab lo ABRE y enfoca de inmediato el botón activo en el sidebar
          sidebar?.setAttribute('data-sidebar-open', 'true');
          setIsSidebarOpen(true);
          localStorage.setItem('evicamp_sidebar_open', 'true');

          const activeView = currentViewRef.current || 'pos';
          const enfocar = () => {
            const activeBtn = document.getElementById(`sidebar-btn-${activeView}`) as HTMLElement | null;
            if (activeBtn) {
              activeBtn.focus();
            } else {
              const first = sidebar?.querySelector('button:not([disabled])') as HTMLElement | null;
              if (first) first.focus();
              else sidebar?.focus();
            }
          };

          enfocar();
          setTimeout(enfocar, 25);
          setTimeout(enfocar, 70);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalTab, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalTab, { capture: true });
  }, [isSidebarOpen]);

  // Atajo global: Alt (o Alt Gr) + 1…7 entra directo a cada sesión del menú
  const permisosRef = useRef(empleado?.permisos);
  useEffect(() => {
    permisosRef.current = empleado?.permisos;
  }, [empleado]);

  useEffect(() => {
    const handleAtajoSesion = (e: KeyboardEvent) => {
      // Alt Gr en Windows llega como Ctrl + Alt (o como el modificador "AltGraph")
      const esAltGr = e.getModifierState('AltGraph') || (e.ctrlKey && e.altKey);
      const esAlt = e.altKey && !e.ctrlKey;
      if (!(esAlt || esAltGr) || e.shiftKey || e.metaKey) return;
      // e.code es la tecla física: acepta los números de arriba y los del teclado numérico
      const match = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
      if (!match) return;
      const view = ATAJOS_SESIONES[Number(match[1]) - 1];
      if (!view) return;
      // Respetar modales abiertos
      if (document.querySelector('[role="dialog"]') || document.querySelector('.fixed.inset-0.z-50')) return;
      if (!permisosRef.current || !puedeVerModulo(permisosRef.current, view)) return;

      e.preventDefault();
      e.stopPropagation();

      setCurrentView(view);
      const sidebar = document.getElementById('evicamp-sidebar');
      sidebar?.setAttribute('data-sidebar-open', 'false');
      setIsSidebarOpen(false);
      localStorage.setItem('evicamp_sidebar_open', 'false');
      programarRestauracionFoco(view);
    };
    window.addEventListener('keydown', handleAtajoSesion, { capture: true });
    return () => window.removeEventListener('keydown', handleAtajoSesion, { capture: true });
  }, []);

  // Estado para el Enrutador Interno


  // Valida la sesión al abrir la app, cada minuto y al volver a la pestaña.
  // Si el empleado fue desactivado o borrado, o le cambiaron los permisos, se aplica enseguida.
  useEffect(() => {
    // Aplicar tema guardado al cargar
      const temaGuardado = localStorage.getItem('gestorpro_theme');
      if (temaGuardado === 'monochrome') {
        document.documentElement.classList.add('theme-monochrome');
      } else if (temaGuardado && temaGuardado !== 'classic') {
        document.documentElement.setAttribute('data-theme', temaGuardado);
      }
    aplicarTamanoInterfaz(leerTamanoInterfaz()); // tamaño elegido en Ajustes > Apariencia

    let activo = true;
    const revisar = async () => {
      const resultado = await validarSesion();
      if (!activo || resultado === 'sin-conexion') return; // un corte de internet no cierra la sesión
      setEmpleado(resultado);
      setIsLoading(false);
    };
    revisar();
    const intervalo = setInterval(revisar, REVALIDAR_CADA_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') revisar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      activo = false;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[var(--alto-pantalla)] bg-[var(--color-surface)] flex items-center justify-center">
        <span className="font-mono text-sm text-[var(--color-ink)] uppercase animate-pulse flex items-center space-x-2">
          <div className="w-2 h-2 bg-[var(--color-accent-dark)]"></div>
          <span>Inicializando Sistema...</span>
        </span>
      </div>
    );
  }

  if (!empleado) {
    return <Login onLoginSuccess={(nuevo) => { setCurrentView('pos'); setEmpleado(nuevo); }} />;
  }

  // Si le quitaron el permiso del módulo que tenía abierto, se muestra el POS
  const vista = puedeVerModulo(empleado.permisos, currentView) ? currentView : 'pos';

  // Motor de Renderizado Condicional
  const renderCurrentView = () => {
    switch (vista) {
      case 'inventario':
        return <Inventario onNavigate={handleNavigate} />;
      case 'mermas':
        return <Mermas />;
      case 'proveedores':
        return <Proveedores />;
      case 'pos':
        return <POS onNavigate={handleNavigate} />;
      case 'fiados': // <--- CONECTAMOS LA PANTALLA DE FIADOS
        return <Fiados />;
      case 'finanzas': // <--- CONECTAMOS LA PANTALLA DE FINANZAS
        return <Finanzas />;
      case 'utilidades':
        return <Utilidades />;
      case 'configuracion': // <--- AÑADE ESTO
      return <Configuraciones />;
      default:
        return (
          <div className="border border-dashed border-[var(--color-border)] p-12 text-center">
            <span className="text-[var(--color-muted)] font-mono uppercase text-xs">Módulo [{currentView}] en desarrollo</span>
          </div>
        );
    }
  };

  // En pantallas menores a 1024px (tablet/celular), al elegir un módulo se cierra el menú deslizable
  function handleNavigate(view: string) {
    if (!puedeVerModulo(empleado?.permisos, view)) return;
    setCurrentView(view);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  }

  return (
    <SesionProvider empleado={empleado}>
    <AlertaYape />
    <div className="flex h-[var(--alto-pantalla)] w-full bg-[var(--color-surface)] overflow-hidden">
      <SideBar
        isOpen={isSidebarOpen}
        currentView={vista}
        onNavigate={handleNavigate}
        onClose={handleCloseSidebar}
        onToggle={toggleSidebar}
        permisos={empleado.permisos}
      />

      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[var(--color-bg)]">

        <section className="p-2 flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
          {renderCurrentView()}
        </section>
      </main>
    </div>
    </SesionProvider>
  );
};

export default App;




