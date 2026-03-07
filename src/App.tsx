import React, { useEffect, useState } from 'react';
import { supabase } from './db/supabase';
import { Login } from './sections/Login';
import { TopBar } from './layout/TopBar';
import { SideBar } from './layout/SideBar';

// Importación de Módulos (Secciones)
import { Inventario } from './sections/Inventario';
import { Mermas } from './sections/Mermas';
import { Proveedores } from './sections/Proveedores'; 
import { POS } from './sections/Punto-de-venta'; 
import { Fiados } from './sections/Fiados'; // <--- IMPORTAMOS FIADOS
import { Reportes } from './sections/Reportes';
export const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Estado para el Enrutador Interno
  const [currentView, setCurrentView] = useState<string>('dashboard');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
        <span className="font-mono text-sm text-[#1E293B] uppercase animate-pulse flex items-center space-x-2">
          <div className="w-2 h-2 bg-[#059669]"></div>
          <span>Inicializando Sistema...</span>
        </span>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  // Motor de Renderizado Condicional
  const renderCurrentView = () => {
    switch (currentView) {
      case 'inventario':
        return <Inventario onNavigate={setCurrentView} />;
      case 'mermas': 
        return <Mermas />;
      case 'proveedores': 
        return <Proveedores />;
      case 'pos': 
        return <POS />;
      case 'fiados': // <--- CONECTAMOS LA PANTALLA DE FIADOS
        return <Fiados />;
      case 'reportes': 
        return <Reportes />;  
      case 'dashboard':
        return (
          <div className="border border-[#E2E8F0] bg-[#FFFFFF] p-6 shadow-none">
            <h2 className="text-[#1E293B] font-mono text-lg uppercase font-bold border-b border-[#E2E8F0] pb-2 mb-4 flex items-center">
              Dashboard Principal
              <span className="ml-3 w-2 h-2 bg-[#059669] animate-pulse"></span>
            </h2>
            <p className="text-[#64748B] text-sm font-mono mb-6">
              Métricas globales en construcción. Navega al módulo de Inventario en la barra lateral.
            </p>
          </div>
        );
      default:
        return (
          <div className="border border-dashed border-[#E2E8F0] p-12 text-center">
            <span className="text-[#64748B] font-mono uppercase text-xs">Módulo [{currentView}] en desarrollo</span>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#FFFFFF] overflow-hidden">
      <SideBar 
        isOpen={isSidebarOpen} 
        currentView={currentView}
        onNavigate={setCurrentView}
      />
      
      <main className="flex-1 flex flex-col overflow-auto bg-[#F8FAFC]">
        <TopBar 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          userEmail={session.user?.email || 'USUARIO_AUTENTICADO'} 
          onNavigate={setCurrentView} // <--- AÑADIDO
        />
        
        <section className="p-8 flex-1 overflow-y-auto">
          {renderCurrentView()}
        </section>
      </main>
    </div>
  );
};

export default App;