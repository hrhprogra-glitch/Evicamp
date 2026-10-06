import React, { useEffect, useState } from 'react';
import { Login } from './sections/Login';
import { SideBar } from './layout/SideBar';
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
import { Reportes } from './sections/Reportes';
import { Utilidades } from './sections/Utilidades';
import Configuraciones from './sections/Configuraciones';
import { aplicarTamanoInterfaz, leerTamanoInterfaz } from './utils/tamanoInterfaz';
import { AlertaYape } from './layout/AlertaYape';

// Cada cuánto se vuelve a leer el estado y los permisos del empleado desde la base
const REVALIDAR_CADA_MS = 60_000;

export const App: React.FC = () => {
  // Empleado de la sesión actual (con permisos leídos de la base, nunca del navegador)
  const [empleado, setEmpleado] = useState<EmpleadoSesion | null>(null);

  const [isLoading, setIsLoading] = useState(true);
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
    setIsSidebarOpen(false);
    localStorage.setItem('evicamp_sidebar_open', 'false');
  };

  // Atajo global: Tab para alternar el menú lateral
  useEffect(() => {
    const handleGlobalTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleGlobalTab);
    return () => window.removeEventListener('keydown', handleGlobalTab);
  }, []);

  // Estado para el Enrutador Interno
  const [currentView, setCurrentView] = useState<string>('pos');

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
      case 'reportes':
        return <Reportes />;
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




