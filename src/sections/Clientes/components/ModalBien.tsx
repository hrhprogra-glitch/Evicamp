// src/sections/Clientes/components/ModalBien.tsx
// AGREGAR O EDITAR "LO QUE SE ATIENDE" de un cliente (SiuMax Servic, fase 1): piscina, jardín, vehículo, equipo...
// Los datos cambian según el tipo (piscina: volumen; vehículo: placa, marca, modelo, año; equipo: marca, modelo, serie).
// Mismo estilo que la ficha del cliente. Teclado: ↓ ↑ entre campos, en orden de lectura; las flechas nunca cambian
// una opción de las listas (Enter las abre); Enter en un campo no pasa al siguiente (el selector se queda; se mueve con flechas).
import React, { useEffect, useState } from 'react';
import { Box, X } from 'lucide-react';
import type { BienCliente, Cliente, TipoBien } from '../types';
import { TIPOS_BIEN } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';
import { avisar } from '../../../utils/dialogos';
import { errorUbicacion } from '../../../utils/documento';
import { claseBotonPrincipal } from '../../../components/ListaVentana';

export interface DatosBien {
  tipo: TipoBien; nombre: string; direccion: string; ubicacion: string; volumen_m3: string; placa: string; marca: string;
  modelo: string; anio: string; serie: string; estado: BienCliente['estado']; notas: string;
}

interface Props {
  abierta: boolean;
  cliente: Cliente | null;     // de quién es
  bien: BienCliente | null;    // null = nuevo
  onGuardar: (datos: DatosBien) => Promise<boolean>;
  onClose: () => void;
}

const vacio = (c: Cliente | null): DatosBien => ({
  tipo: 'PISCINA', nombre: '', direccion: c?.direccion || '', ubicacion: c?.ubicacion || '', volumen_m3: '', placa: '',
  marca: '', modelo: '', anio: '', serie: '', estado: 'ACTIVO', notas: '',
});
const enfocar = (id: string) => setTimeout(() => { const el = document.getElementById(id) as HTMLInputElement | null; el?.focus(); el?.select?.(); }, 30);

// Campos propios de cada tipo, en orden
const PROPIOS: Record<TipoBien, string[]> = {
  PISCINA: ['bien-volumen'],
  JARDIN: [],
  VEHICULO: ['bien-placa', 'bien-marca', 'bien-modelo', 'bien-anio'],
  EQUIPO: ['bien-marca', 'bien-modelo', 'bien-serie'],
  LOCAL: [],
  OTRO: [],
};

export const ModalBien: React.FC<Props> = ({ abierta, cliente, bien, onGuardar, onClose }) => {
  const [datos, setDatos] = useState<DatosBien>(vacio(null));
  const [guardando, setGuardando] = useState(false);
  useCerrarConEscape(abierta, onClose);

  useEffect(() => {
    if (!abierta) return;
    setDatos(bien
      ? {
          tipo: bien.tipo, nombre: bien.nombre, direccion: bien.direccion || '', ubicacion: bien.ubicacion || '',
          volumen_m3: bien.volumenM3 != null ? String(bien.volumenM3) : '', placa: bien.placa || '', marca: bien.marca || '',
          modelo: bien.modelo || '', anio: bien.anio != null ? String(bien.anio) : '', serie: bien.serie || '',
          estado: bien.estado, notas: bien.notas || '',
        }
      : vacio(cliente));
    enfocar('bien-tipo');
  }, [abierta, bien, cliente]);

  if (!abierta || !cliente) return null;

  const poner = (campo: keyof DatosBien, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));
  // Orden de lectura (cambia con el tipo): ↓ ↑ siguen este orden
  const orden = ['btn-cerrar-bien', 'bien-tipo', 'bien-nombre', ...PROPIOS[datos.tipo], 'bien-direccion', 'bien-ubicacion', 'bien-estado', 'bien-notas', 'btn-guardar-bien'];
  const mover = (id: string, paso: 1 | -1) => {
    const sig = orden[orden.indexOf(id) + paso];
    if (!sig) return;
    if (sig.startsWith('btn-') || sig === 'bien-tipo' || sig === 'bien-estado') document.getElementById(sig)?.focus();
    else enfocar(sig);
  };

  const teclas = (id: string) => (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const el = e.currentTarget;
    if (el instanceof HTMLSelectElement) {
      // Las flechas nunca cambian la opción: mueven el selector. Enter abre la lista.
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mover(id, e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); try { el.showPicker(); } catch { /* sin lista */ } }
      return;
    }
    if (e.key === 'Enter' && !(el instanceof HTMLTextAreaElement)) { e.preventDefault(); return; } // Enter: el selector se queda (regla de Nego)
    if (el instanceof HTMLTextAreaElement) {
      if (e.key === 'ArrowUp' && el.value.slice(0, el.selectionStart).includes('\n')) return;
      if (e.key === 'ArrowDown' && el.value.slice(el.selectionEnd).includes('\n')) return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); mover(id, e.key === 'ArrowDown' ? 1 : -1); }
  };

  const guardar = async () => {
    if (guardando) return;
    const nombre = datos.nombre.trim().replace(/\s+/g, ' ');
    if (nombre.length < 2) { await avisar('Escribe un nombre (ej.: "Piscina de la casa de playa").'); enfocar('bien-nombre'); return; }
    const problema = errorUbicacion(datos.ubicacion);
    if (problema) { await avisar(problema); enfocar('bien-ubicacion'); return; }
    if (datos.anio && (Number(datos.anio) < 1950 || Number(datos.anio) > new Date().getFullYear() + 1)) {
      await avisar('El año del vehículo no parece correcto.'); enfocar('bien-anio'); return;
    }
    setGuardando(true);
    try {
      const ok = await onGuardar({ ...datos, nombre });
      if (ok) onClose();
      else document.getElementById('btn-guardar-bien')?.focus();
    } finally {
      setGuardando(false);
    }
  };

  const claseCampo = 'w-full bg-white border-2 border-[var(--color-border)] p-3 text-sm font-bold text-[var(--color-ink)] outline-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';
  const etiqueta = 'text-[10px] font-black text-[var(--color-ink)] uppercase tracking-widest mb-1 block';
  const campo = (id: string, titulo: string, clave: keyof DatosBien, extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {}, limpiar?: (v: string) => string) => (
    <div>
      <label htmlFor={id} className={etiqueta}>{titulo}</label>
      <input id={id} autoComplete="off" spellCheck={false} data-lpignore="true" value={datos[clave] as string}
        onChange={(e) => poner(clave, limpiar ? limpiar(e.target.value) : e.target.value)} onKeyDown={teclas(id)} className={claseCampo} {...extra} />
    </div>
  );
  const propios = PROPIOS[datos.tipo];

  return (
    <div id="modal-bien-cliente" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 font-mono">
      <div role="dialog" aria-label={bien ? 'Editar lo que se atiende' : 'Agregar lo que se atiende'} className="ventana-sobria bg-[var(--color-surface)] w-full max-w-lg border-2 border-[var(--color-ink)] flex flex-col max-h-[calc(94dvh/var(--ui-zoom))]">
        <div style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties} className="ventana-cabecera bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Box size={24} className="text-[var(--color-info)] shrink-0" />
            <div className="min-w-0">
              <h2 className="ventana-cabecera__titulo text-sm font-black uppercase tracking-widest">{bien ? 'Editar lo que se atiende' : 'Agregar lo que se atiende'}</h2>
              <p className="text-[9px] font-bold opacity-80 uppercase tracking-widest truncate">Cliente: {cliente.nombre}</p>
            </div>
          </div>
          <button id="btn-cerrar-bien" onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); document.getElementById('bien-tipo')?.focus(); }
              else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); }
            }}
            className="ventana-cerrar hover:text-[var(--color-danger)] focus:text-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-red-400 focus:bg-white/20 p-1.5 cursor-pointer" title="Cerrar (Escape)">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <div>
            <label htmlFor="bien-tipo" className={etiqueta}>Tipo *</label>
            <select id="bien-tipo" value={datos.tipo} onChange={(e) => poner('tipo', e.target.value)} onKeyDown={teclas('bien-tipo')} className={`${claseCampo} uppercase cursor-pointer`}>
              {TIPOS_BIEN.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </div>
          {campo('bien-nombre', 'Nombre *', 'nombre', { placeholder: 'EJ.: PISCINA CASA DE PLAYA · HILUX DE LA OFICINA', className: `${claseCampo} uppercase` })}
          {propios.includes('bien-volumen') && campo('bien-volumen', 'Volumen (m³)', 'volumen_m3', { inputMode: 'decimal', placeholder: 'OPCIONAL · EJ.: 45' }, (v) => v.replace(/[^0-9.]/g, ''))}
          {propios.includes('bien-placa') && campo('bien-placa', 'Placa', 'placa', { placeholder: 'OPCIONAL · EJ.: ABC-123', className: `${claseCampo} uppercase tracking-widest` }, (v) => v.toUpperCase().slice(0, 10))}
          {propios.includes('bien-marca') && campo('bien-marca', 'Marca', 'marca', { placeholder: 'OPCIONAL' })}
          {propios.includes('bien-modelo') && campo('bien-modelo', 'Modelo', 'modelo', { placeholder: 'OPCIONAL' })}
          {propios.includes('bien-anio') && campo('bien-anio', 'Año', 'anio', { inputMode: 'numeric', placeholder: 'OPCIONAL · EJ.: 2019' }, (v) => v.replace(/\D/g, '').slice(0, 4))}
          {propios.includes('bien-serie') && campo('bien-serie', 'Número de serie', 'serie', { placeholder: 'OPCIONAL' })}
          {campo('bien-direccion', 'Dirección (si es otra que la del cliente)', 'direccion', { placeholder: 'OPCIONAL' })}
          {campo('bien-ubicacion', 'Link de ubicación (Google Maps)', 'ubicacion', { placeholder: 'OPCIONAL · PEGA EL LINK DE GOOGLE MAPS', inputMode: 'url' })}
          <div>
            <label htmlFor="bien-estado" className={etiqueta}>Estado</label>
            <select id="bien-estado" value={datos.estado} onChange={(e) => poner('estado', e.target.value)} onKeyDown={teclas('bien-estado')} className={`${claseCampo} uppercase cursor-pointer`}>
              <option value="ACTIVO">Activo</option>
              <option value="MANTENIMIENTO">En mantenimiento</option>
              <option value="BAJA">De baja (ya no se atiende)</option>
            </select>
          </div>
          <div>
            <label htmlFor="bien-notas" className={etiqueta}>Notas</label>
            <textarea id="bien-notas" rows={2} spellCheck={false} value={datos.notas}
              onChange={(e) => poner('notas', e.target.value)} onKeyDown={teclas('bien-notas')}
              placeholder="OPCIONAL · EJ.: LA LLAVE LA TIENE EL GUARDIÁN" className={`${claseCampo} resize-none`} />
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 border-t-2 border-[var(--color-border)] flex justify-end shrink-0">
          <button id="btn-guardar-bien" type="button" aria-disabled={guardando} onClick={() => void guardar()}
            onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); enfocar('bien-notas'); } }}
            className={claseBotonPrincipal}>
            {guardando ? 'Guardando...' : bien ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};
