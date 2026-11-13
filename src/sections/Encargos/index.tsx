// Sección ENCARGOS de SiuMax Nego (12/11/2026, pedido del dueño: "combinar cotizaciones con pedidos" con un nombre
// general; eligió "Encargos"). Dos pestañas:
// - COTIZACIONES: la pantalla única de cotizaciones (paso 3h; Comercio y Servicios).
// - PEDIDOS: los pedidos por encargo que se hacen en la Caja (F8); antes era Clientes › Pedidos. Solo con Comercio.
// La Caja tiene avisos "Cotizaciones: N" y "Pedidos: N" que abren directo su pestaña (sessionStorage encargos_pestana).
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTiposNegocio } from '../../utils/tiposNegocio';
import { Cotizaciones } from '../Cotizaciones';
import { PestanaPedidos } from '../Clientes/components/PestanaPedidos';
import { CabeceraEncargos, PESTANAS_ENCARGOS, type PestanaEncargos } from './CabeceraEncargos';

export const CLAVE_PESTANA_ENCARGOS = 'encargos_pestana';

const guardada = (): PestanaEncargos | null => {
  try { const v = sessionStorage.getItem(CLAVE_PESTANA_ENCARGOS); return v === 'cotizaciones' || v === 'pedidos' ? v : null; } catch { return null; }
};

export const Encargos: React.FC<{ onNavigatePOS?: () => void }> = ({ onNavigatePOS }) => {
  const tipos = useTiposNegocio();
  const pestanas: PestanaEncargos[] = tipos.includes('comercio') ? ['cotizaciones', 'pedidos'] : ['cotizaciones'];
  const [elegida, setElegida] = useState<PestanaEncargos | null>(guardada);
  const activa: PestanaEncargos = elegida && pestanas.includes(elegida) ? elegida : 'cotizaciones';
  const [pedirNueva, setPedirNueva] = useState(0);

  const cambiar = (p: PestanaEncargos) => {
    setElegida(p);
    setPedirNueva(0); // al volver a Cotizaciones no debe abrirse sola la ventana
    try { sessionStorage.setItem(CLAVE_PESTANA_ENCARGOS, p); } catch { /* sin almacenamiento */ }
    // El selector pasa al buscador de la pestaña nueva
    setTimeout(() => document.getElementById(PESTANAS_ENCARGOS.find((x) => x.id === p)!.buscador)?.focus(), 120);
  };

  const botonNueva = activa === 'cotizaciones' ? (
    <button
      id="btn-nueva-cotizacion"
      type="button"
      onClick={() => setPedirNueva((n) => n + 1)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('buscador-cotizaciones')?.focus(); }
        else if (e.key === 'ArrowLeft') { const t = document.getElementById(`tab-encargos-${pestanas[pestanas.length - 1]}`); if (t) { e.preventDefault(); t.focus(); } }
      }}
      style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
      className="boton-cabecera px-3 sm:px-4 lg:px-6 py-3 lg:py-4 font-black text-[10px] lg:text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer rounded-none flex-1 sm:flex-initial whitespace-nowrap"
    >
      <Plus size={16} /> Nueva cotización
    </button>
  ) : null;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">
      <CabeceraEncargos pestanas={pestanas} activa={activa} onCambiar={cambiar} derecha={botonNueva} idDerecha={botonNueva ? 'btn-nueva-cotizacion' : undefined} />
      {activa === 'cotizaciones' ? (
        <Cotizaciones onNavigatePOS={onNavigatePOS} pedirNueva={pedirNueva} />
      ) : (
        <div className="px-3 sm:px-4 lg:px-6 pb-6 flex flex-col">
          <PestanaPedidos />
        </div>
      )}
    </div>
  );
};

export default Encargos;
