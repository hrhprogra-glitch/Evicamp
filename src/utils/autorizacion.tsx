/**
 * src/utils/autorizacion.tsx
 * El cajero sin permiso para una acción delicada (anular una venta) la puede hacer si el administrador
 * o el encargado pone SU correo y clave en esa misma pantalla (como en las cadenas de tiendas).
 *
 *   const ok = await conAutorizacion('anular esta venta', 'reportes_anular_ventas', async (autorizo) => { ... });
 *
 * Se abre una sesión del administrador solo para esa acción (los pedidos van con su sesión: el servidor
 * revisa SUS permisos y deja su nombre como autor) y se cierra apenas termina.
 */
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, usarSesionAutorizada } from '../db/supabase';
import { normalizarEmail } from './sesion';
import { tienePermiso, type ClavePermiso } from './permisos';
import type { PermisosUsuario } from '../sections/Configuraciones/types';
import { programarRestauracionFoco } from './navegacionSesion';
import { tomarTeclado } from './dialogos';

interface Autorizacion { token: string; nombre: string }
interface Pedido { accion: string; permiso: ClavePermiso; responder: (a: Autorizacion | null) => void }

const VentanaAutorizacion: React.FC<{ pedido: Pedido; cerrar: () => void }> = ({ pedido, cerrar }) => {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [revisando, setRevisando] = useState(false);
  const correoRef = useRef<HTMLInputElement>(null);
  const claveRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => correoRef.current?.focus(), 0); }, []);

  const terminar = (a: Autorizacion | null) => { pedido.responder(a); cerrar(); };

  const autorizar = async () => {
    if (!correo.trim() || !clave) { setError('Escribe el correo y la clave del administrador.'); return; }
    setRevisando(true);
    setError('');
    try {
      const { data } = await supabase.rpc('fn_login', { p_email: normalizarEmail(correo), p_password: clave })
        .maybeSingle<{ token: string; nombre: string; permisos: Partial<PermisosUsuario> }>();
      if (!data?.token) { setError('Correo o clave incorrectos.'); setClave(''); claveRef.current?.focus(); return; }
      if (!tienePermiso(data.permisos, pedido.permiso)) {
        await supabase.rpc('fn_cerrar_sesion', { p_token: data.token });
        setError(`${data.nombre} no tiene permiso para ${pedido.accion}.`);
        setClave('');
        claveRef.current?.focus();
        return;
      }
      terminar({ token: data.token, nombre: data.nombre });
    } catch {
      setError('No se pudo revisar la clave. Revisa el internet e intenta de nuevo.');
    } finally {
      setRevisando(false);
    }
  };

  // Teclado: Esc cancela; Enter pasa del correo a la clave y de la clave a autorizar
  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); terminar(null); }
      if (e.key === 'Tab') {
        e.preventDefault(); e.stopImmediatePropagation();
        const orden = ['autorizacion-correo', 'autorizacion-clave', 'autorizacion-aceptar', 'autorizacion-cancelar'];
        const i = orden.indexOf(document.activeElement?.id || '');
        document.getElementById(orden[(i + (e.shiftKey ? orden.length - 1 : 1)) % orden.length])?.focus();
      }
    };
    return tomarTeclado(teclas); // recibe la tecla antes que la pantalla de atrás (ver dialogos.tsx)
  });

  const campo = 'w-full border-2 border-[var(--color-ink)] bg-[var(--color-bg)] p-3 text-sm font-bold text-[var(--color-ink)] outline-none focus:ring-4 focus:ring-[var(--color-accent)]';
  const flechas = (arriba: string | null, abajo: string | null) => (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' && arriba) { e.preventDefault(); document.getElementById(arriba)?.focus(); }
    if (e.key === 'ArrowDown' && abajo) { e.preventDefault(); document.getElementById(abajo)?.focus(); }
  };

  return (
    <div data-dialogo-sistema role="dialog" aria-modal="true" aria-labelledby="autorizacion-titulo"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 font-mono">
      <div className="w-full max-w-md border-2 border-[var(--color-ink)] bg-[var(--color-surface,#fff)] shadow-[6px_6px_0_0_var(--color-ink)]">
        <div id="autorizacion-titulo" className="bg-[var(--color-ink)] px-4 py-2 text-[11px] font-black uppercase tracking-widest text-[var(--color-accent)]">
          🔐 Autorización del administrador
        </div>
        <div className="space-y-3 px-5 py-5">
          <p className="text-sm font-bold text-[var(--color-ink)]">
            Para {pedido.accion}, el administrador o encargado debe poner su correo y clave.
          </p>
          <input id="autorizacion-correo" ref={correoRef} type="email" autoComplete="off" placeholder="Correo del administrador"
            value={correo} onChange={(e) => setCorreo(e.target.value)} className={campo}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); claveRef.current?.focus(); } else flechas(null, 'autorizacion-clave')(e); }} />
          <input id="autorizacion-clave" ref={claveRef} type="password" autoComplete="new-password" placeholder="Clave"
            value={clave} onChange={(e) => setClave(e.target.value)} className={campo}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void autorizar(); } else flechas('autorizacion-correo', 'autorizacion-aceptar')(e); }} />
          {error && <p role="alert" className="text-xs font-black text-[var(--color-danger)]">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t-2 border-[var(--color-ink)] px-4 py-3">
          <button id="autorizacion-cancelar" type="button" onClick={() => terminar(null)}
            onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('autorizacion-aceptar')?.focus(); } else flechas('autorizacion-clave', null)(e); }}
            className="border-2 border-[var(--color-ink)] px-5 py-2 text-xs font-black uppercase tracking-widest text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
            Cancelar
          </button>
          <button id="autorizacion-aceptar" type="button" disabled={revisando} onClick={() => void autorizar()}
            onKeyDown={(e) => { if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('autorizacion-cancelar')?.focus(); } else flechas('autorizacion-clave', null)(e); }}
            className="border-2 border-[var(--color-ink)] bg-[var(--color-accent)] px-5 py-2 text-xs font-black uppercase tracking-widest text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:ring-offset-2 disabled:opacity-50">
            {revisando ? 'Revisando...' : 'Autorizar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const pedirAutorizacion = (accion: string, permiso: ClavePermiso) => new Promise<Autorizacion | null>((responder) => {
  const focoAntes = document.activeElement as HTMLElement | null;
  const lugar = document.createElement('div');
  document.body.appendChild(lugar);
  const raiz = createRoot(lugar);
  const cerrar = () => {
    raiz.unmount();
    lugar.remove();
    setTimeout(() => {
      if (focoAntes?.isConnected && focoAntes.offsetParent !== null) focoAntes.focus();
      else programarRestauracionFoco();
    }, 30);
  };
  raiz.render(<VentanaAutorizacion pedido={{ accion, permiso, responder }} cerrar={cerrar} />);
});

/**
 * Hace `accion` con permiso: si el empleado ya lo tiene, directo; si no, pide la clave del administrador
 * y la hace con su sesión. Devuelve false si se canceló.
 */
export const conAutorizacion = async (
  descripcion: string, permiso: ClavePermiso, tieneElPermiso: boolean,
  accion: (autorizo: string | null) => Promise<void>,
) => {
  if (tieneElPermiso) { await accion(null); return true; }
  const autorizacion = await pedirAutorizacion(descripcion, permiso);
  if (!autorizacion) return false;
  usarSesionAutorizada(autorizacion.token);
  try {
    await accion(autorizacion.nombre);
  } finally {
    usarSesionAutorizada(null);
    void supabase.rpc('fn_cerrar_sesion', { p_token: autorizacion.token }); // la sesión del admin no queda abierta
  }
  return true;
};
