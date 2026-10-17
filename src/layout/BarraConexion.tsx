// Barra del modo sin internet (src/utils/sinInternet.ts):
//  - Sin conexión: "🔌 Sin internet — la caja sigue funcionando · 3 cosas guardadas en esta PC"
//  - Al volver: "⏳ Subiendo..." y luego "✅ Todo subido" (unos segundos)
//  - Si el servidor rechazó algo al subirlo: aviso para revisarlo, con "Reintentar"
import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { hayConexion, refrescarPendientes, reintentarErrores, leerPendientes } from '../utils/sinInternet';

// Estado de la conexión y de lo guardado en esta PC, para cualquier pantalla
export const useConexion = () => {
  const [enLinea, setEnLinea] = useState(hayConexion());
  const [pendientes, setPendientes] = useState({ cantidad: 0, resumen: '', errores: 0 });
  useEffect(() => {
    const alCambiarConexion = (e: Event) => setEnLinea((e as CustomEvent).detail.enLinea);
    const alCambiarPendientes = (e: Event) => setPendientes((e as CustomEvent).detail);
    window.addEventListener('siumax-conexion', alCambiarConexion);
    window.addEventListener('siumax-pendientes', alCambiarPendientes);
    void refrescarPendientes();
    return () => {
      window.removeEventListener('siumax-conexion', alCambiarConexion);
      window.removeEventListener('siumax-pendientes', alCambiarPendientes);
    };
  }, []);
  return { enLinea, ...pendientes };
};


export const BarraConexion: React.FC = () => {
  const { enLinea, cantidad, resumen, errores } = useConexion();
  const [subidoRecien, setSubidoRecien] = useState(false);
  const [anterior, setAnterior] = useState(cantidad);

  // Pasó de "había pendientes" a "todo subido" con internet: avisar unos segundos
  useEffect(() => {
    if (enLinea && anterior > 0 && cantidad === 0) {
      setSubidoRecien(true);
      const t = setTimeout(() => setSubidoRecien(false), 5000);
      setAnterior(cantidad);
      return () => clearTimeout(t);
    }
    setAnterior(cantidad);
  }, [enLinea, cantidad, anterior]);

  const verErrores = async () => {
    const lista = (await leerPendientes()).filter((p) => p.error);
    const texto = lista.map((p) => `• ${new Date(p.creado).toLocaleString('es-PE')} — ${p.accion}\n   ${p.error}`).join('\n');
    if (window.confirm(`No se pudieron subir ${lista.length} operaciones (el servidor las rechazó):\n\n${texto}\n\n¿Reintentar ahora?`)) {
      await reintentarErrores();
    }
  };

  let contenido: React.ReactNode = null;
  let estilo = '';
  if (!enLinea) {
    estilo = 'bg-[var(--color-warning-bg)] border-[var(--color-warning)] text-[var(--color-warning-dark)]';
    contenido = (
      <>
        <WifiOff size={16} className="shrink-0" />
        <span className="flex-1">
          SIN INTERNET — la caja sigue funcionando{cantidad > 0 ? ` · guardado en esta PC: ${resumen}` : ''}. Se subirá solo al volver la conexión.
        </span>
      </>
    );
  } else if (cantidad > 0) {
    estilo = 'bg-[var(--color-info-bg,#EFF6FF)] border-[var(--color-info)] text-[var(--color-info)]';
    contenido = (<><Loader2 size={16} className="shrink-0 animate-spin" /><span className="flex-1">Internet de vuelta: subiendo {resumen}...</span></>);
  } else if (subidoRecien) {
    estilo = 'bg-[var(--color-accent-bg,#ECFDF5)] border-[var(--color-accent)] text-[var(--color-accent-dark,#047857)]';
    contenido = (<><CheckCircle2 size={16} className="shrink-0" /><span className="flex-1">Internet de vuelta: todo lo hecho sin conexión ya se subió.</span></>);
  }

  return (
    <>
      {contenido && (
        <div role="status" aria-live="polite" className={`shrink-0 flex items-center gap-3 px-3 py-2 border-b-2 font-mono text-xs font-bold uppercase tracking-wide ${estilo}`}>
          {contenido}
        </div>
      )}
      {errores > 0 && (
        <div role="alert" className="shrink-0 flex items-center gap-3 px-3 py-2 border-b-2 font-mono text-xs font-bold bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="flex-1">{errores} {errores === 1 ? 'operación hecha' : 'operaciones hechas'} sin internet no se pudieron subir.</span>
          <button onClick={verErrores} className="shrink-0 px-3 py-1 border-2 border-current bg-white font-black uppercase tracking-widest cursor-pointer hover:opacity-80">
            Ver y reintentar
          </button>
        </div>
      )}
    </>
  );
};
