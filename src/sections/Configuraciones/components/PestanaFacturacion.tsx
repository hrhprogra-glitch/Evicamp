import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Save, Loader2, KeyRound, PlugZap, CircleCheck, CircleAlert, Server } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { avisar, confirmar } from '../../../utils/dialogos';
import { rucValido } from '../../../utils/documento';

// Ajustes > Facturación (fase 11.1): datos del emisor para SUNAT, series, numeración y el proveedor.
// Las boletas/facturas las envía el FACTURADOR del servidor (servidor/facturador); esta pantalla solo
// guarda la configuración y muestra si el facturador está funcionando.

type Modo = 'SIMULADO' | 'PRUEBA' | 'REAL';
type Regimen = 'GENERAL' | 'MYPE' | 'RER' | 'NRUS';
type PorDefecto = 'NOTA' | 'BOLETA' | 'FACTURA';

interface Config {
  activo: boolean;
  modo: Modo;
  ruc: string | null;
  razon_social: string | null;
  nombre_comercial: string | null;
  direccion_fiscal: string | null;
  ubigeo: string | null;
  regimen: Regimen | null;
  serie_boleta: string;
  serie_factura: string;
  serie_nc_boleta: string;
  serie_nc_factura: string;
  comprobante_por_defecto: PorDefecto;
  prueba_pedida_at: string | null;
  prueba_at: string | null;
  prueba_ok: boolean | null;
  prueba_mensaje: string | null;
  facturador_visto_at: string | null;
  facturador_version: string | null;
}

interface EstadoClave {
  tiene: boolean;
  ruta?: string;
  token_final?: string;
  actualizado_por?: string | null;
  updated_at?: string;
}

const MODOS: { id: Modo; nombre: string; ayuda: string }[] = [
  { id: 'SIMULADO', nombre: 'Simulado', ayuda: 'Para practicar: hace todo el recorrido pero NO envía nada a SUNAT. No necesita proveedor.' },
  { id: 'PRUEBA', nombre: 'Prueba', ayuda: 'Usa la cuenta de PRUEBA del proveedor: los comprobantes no tienen valor ante SUNAT.' },
  { id: 'REAL', nombre: 'Real', ayuda: 'Comprobantes REALES ante SUNAT con la cuenta de producción del proveedor.' },
];
const REGIMENES: { id: Regimen; nombre: string }[] = [
  { id: 'NRUS', nombre: 'Nuevo RUS' },
  { id: 'RER', nombre: 'RER' },
  { id: 'MYPE', nombre: 'MYPE Tributario' },
  { id: 'GENERAL', nombre: 'General' },
];
const POR_DEFECTO: { id: PorDefecto; nombre: string }[] = [
  { id: 'NOTA', nombre: 'Nota de venta' },
  { id: 'BOLETA', nombre: 'Boleta' },
  { id: 'FACTURA', nombre: 'Factura' },
];

const segundosDesde = (fecha: string | null) => (fecha ? Math.max(0, Math.round((Date.now() - new Date(fecha).getTime()) / 1000)) : null);
const fechaCorta = (fecha?: string | null) =>
  fecha ? new Date(fecha).toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

const claseCampo = 'w-full px-3 py-2 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-sm font-sans focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] rounded-none';
const claseOpcion = (activa: boolean) =>
  `px-3 py-2 border-2 text-xs font-bold uppercase tracking-wider cursor-pointer rounded-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] ${
    activa ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]' : 'bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
  }`;

const Etiqueta: React.FC<{ htmlFor?: string; children: React.ReactNode }> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-xs font-bold uppercase mb-1">{children}</label>
);

export const PestanaFacturacion: React.FC = () => {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [clave, setClave] = useState<EstadoClave>({ tiene: false });
  const [correlativos, setCorrelativos] = useState<Record<string, number>>({});
  const [ruta, setRuta] = useState('');
  const [token, setToken] = useState('');
  const [desdeBoleta, setDesdeBoleta] = useState('');
  const [desdeFactura, setDesdeFactura] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [, setReloj] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async (soloEstado = false) => {
    const { data } = await supabase.from('facturacion_config').select('*').eq('id', 1).maybeSingle();
    if (!data) return;
    setCfg((previo) => (soloEstado && previo
      ? { ...previo, facturador_visto_at: data.facturador_visto_at, facturador_version: data.facturador_version, prueba_at: data.prueba_at, prueba_ok: data.prueba_ok, prueba_mensaje: data.prueba_mensaje }
      : data));
    if (soloEstado) return;
    const [{ data: estado }, { data: series }] = await Promise.all([
      supabase.rpc('fn_estado_credenciales_facturacion'),
      supabase.from('cpe_correlativos').select('serie, ultimo'),
    ]);
    if (estado) setClave(estado as EstadoClave);
    setCorrelativos(Object.fromEntries((series || []).map((s: any) => [s.serie, Number(s.ultimo)])));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Cada 5 s: ¿sigue vivo el facturador? (y el "hace X s" se actualiza)
  useEffect(() => {
    const t = setInterval(() => { cargar(true); setReloj((n) => n + 1); }, 5000);
    return () => clearInterval(t);
  }, [cargar]);

  // Selector de teclado: ↑ ↓ entre filas; ← → entre los controles de una fila (en un campo, cuando el cursor
  // está en el borde del texto o el texto está todo seleccionado); Enter en un campo pasa al siguiente control.
  const moverSelector = (e: React.KeyboardEvent) => {
    const actual = document.activeElement as HTMLElement | null;
    if (!actual?.dataset.fila || !contenedor.current) return;
    const todos = Array.from(contenedor.current.querySelectorAll<HTMLElement>('[data-fila]')).filter((el) => el.offsetParent !== null);
    const filas = Array.from(new Set(todos.map((el) => el.dataset.fila)));
    const fila = filas.indexOf(actual.dataset.fila);
    const deFila = (f: number) => todos.filter((el) => el.dataset.fila === filas[f]);
    const campo = actual.tagName === 'INPUT' ? (actual as HTMLInputElement) : null;
    const ir = (el?: HTMLElement) => { if (el) { e.preventDefault(); el.focus(); if (el.tagName === 'INPUT') (el as HTMLInputElement).select(); } };
    const vecinos = deFila(fila);
    const pos = vecinos.indexOf(actual);

    if (e.key === 'Enter' && campo) {
      ir(todos[todos.indexOf(actual) + 1]);
    } else if (e.key === 'ArrowDown') {
      if (fila < filas.length - 1) ir(deFila(fila + 1)[0]); else e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      if (fila > 0) ir(deFila(fila - 1)[0]); else ir(document.getElementById('btn-tab-facturacion') || undefined);
    } else if (e.key === 'ArrowRight' && (!campo || campo.selectionEnd === campo.value.length)) {
      ir(vecinos[pos + 1]);
    } else if (e.key === 'ArrowLeft' && (!campo || campo.selectionStart === 0)) {
      ir(vecinos[pos - 1]);
    }
  };

  if (!cfg) {
    return <div className="py-12 text-center font-mono text-xs uppercase text-[var(--color-muted)]">Cargando facturación…</div>;
  }

  const cambiar = <K extends keyof Config>(campo: K, valor: Config[K]) => setCfg({ ...cfg, [campo]: valor });
  const visto = segundosDesde(cfg.facturador_visto_at);
  const facturadorVivo = visto !== null && visto < 30;

  const guardar = async () => {
    const ruc = (cfg.ruc || '').trim();
    if (ruc && !rucValido(ruc)) return avisar('El RUC del negocio no es válido: revisa los 11 números.');
    if (cfg.ubigeo && !/^\d{6}$/.test(cfg.ubigeo.trim())) return avisar('El ubigeo tiene 6 números (o déjalo vacío).');
    for (const [serie, letra, nombre] of [[cfg.serie_boleta, 'B', 'boletas'], [cfg.serie_factura, 'F', 'facturas'], [cfg.serie_nc_boleta, 'B', 'notas de crédito de boletas'], [cfg.serie_nc_factura, 'F', 'notas de crédito de facturas']] as const) {
      if (!new RegExp(`^${letra}[A-Z0-9]{3}$`).test(serie)) return avisar(`La serie de ${nombre} debe tener 4 caracteres y empezar con ${letra} (ej. ${letra}001).`);
    }
    if (cfg.activo) {
      if (!ruc || !cfg.razon_social?.trim() || !cfg.direccion_fiscal?.trim() || !cfg.regimen) {
        return avisar('Para activar la facturación completa el RUC, la razón social, la dirección fiscal y el régimen.');
      }
      if (cfg.modo !== 'SIMULADO' && !clave.tiene) return avisar('Para el modo Prueba o Real primero guarda la ruta y la clave del proveedor.');
      if (cfg.comprobante_por_defecto === 'FACTURA' && cfg.regimen === 'NRUS') return avisar('En el Nuevo RUS solo se emiten boletas: elige otro comprobante por defecto.');
      if (cfg.modo === 'REAL' && !(await confirmar('Modo REAL: las boletas y facturas tendrán valor ante SUNAT. ¿Continuar?'))) return;
    }
    setGuardando(true);
    const { error } = await supabase.from('facturacion_config').update({
      activo: cfg.activo,
      modo: cfg.modo,
      ruc: ruc || null,
      razon_social: cfg.razon_social?.trim().toUpperCase() || null,
      nombre_comercial: cfg.nombre_comercial?.trim() || null,
      direccion_fiscal: cfg.direccion_fiscal?.trim().toUpperCase() || null,
      ubigeo: cfg.ubigeo?.trim() || null,
      regimen: cfg.regimen,
      serie_boleta: cfg.serie_boleta,
      serie_factura: cfg.serie_factura,
      serie_nc_boleta: cfg.serie_nc_boleta,
      serie_nc_factura: cfg.serie_nc_factura,
      comprobante_por_defecto: cfg.comprobante_por_defecto,
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setGuardando(false);
    if (error) return avisar(`No se pudo guardar: ${error.message}`);
    await cargar();
    avisar(cfg.activo ? `Facturación guardada y ACTIVA (modo ${cfg.modo.toLowerCase()}).` : 'Facturación guardada (todavía desactivada).');
  };

  const guardarClave = async () => {
    if (!/^https:\/\/\S+$/.test(ruta.trim())) return avisar('La ruta del proveedor empieza con https:// (cópiala tal cual de tu cuenta).');
    if (token.trim().length < 10) return avisar('La clave (token) parece incompleta: cópiala completa de tu cuenta del proveedor.');
    const { data, error } = await supabase.rpc('fn_guardar_credenciales_facturacion', { p_ruta: ruta.trim(), p_token: token.trim() });
    if (error) return avisar(`No se pudo guardar la clave: ${error.message}`);
    setClave(data as EstadoClave);
    setRuta('');
    setToken('');
    avisar('Clave del proveedor guardada en el servidor. Ahora usa "Probar conexión".');
  };

  const probarConexion = async () => {
    setProbando(true);
    // prueba_at en blanco = el facturador sabe que hay una prueba nueva (sin depender del reloj de esta PC)
    const { error } = await supabase.from('facturacion_config').update({ prueba_pedida_at: new Date().toISOString(), prueba_at: null, prueba_ok: null, prueba_mensaje: null }).eq('id', 1);
    if (error) { setProbando(false); return avisar(`No se pudo pedir la prueba: ${error.message}`); }
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data } = await supabase.from('facturacion_config').select('prueba_at, prueba_ok, prueba_mensaje, modo').eq('id', 1).maybeSingle();
      if (data?.prueba_at) {
        setCfg((previo) => (previo ? { ...previo, prueba_at: data.prueba_at, prueba_ok: data.prueba_ok, prueba_mensaje: data.prueba_mensaje } : previo));
        setProbando(false);
        return;
      }
    }
    setProbando(false);
    avisar('El facturador del servidor no respondió. Avisa a SiuMax para revisarlo.');
  };

  const fijarNumeracion = async () => {
    const pedidos = [[cfg.serie_boleta, desdeBoleta], [cfg.serie_factura, desdeFactura]].filter(([, v]) => v.trim() !== '');
    if (!pedidos.length) return avisar('Escribe el último número que emitiste antes de SiuMax (boletas, facturas o ambos).');
    for (const [serie, valor] of pedidos) {
      if (!/^\d{1,8}$/.test(valor.trim())) return avisar(`El número de la serie ${serie} debe tener solo números (hasta 8).`);
    }
    for (const [serie, valor] of pedidos) {
      const { error } = await supabase.rpc('fn_fijar_correlativo', { p_serie: serie, p_ultimo: Number(valor) });
      if (error) return avisar(error.message);
    }
    setDesdeBoleta('');
    setDesdeFactura('');
    await cargar();
    avisar('Numeración actualizada.');
  };

  const proximo = (serie: string) => `${serie}-${String((correlativos[serie] || 0) + 1).padStart(8, '0')}`;
  const modoActual = MODOS.find((m) => m.id === cfg.modo)!;

  return (
    <div ref={contenedor} onKeyDown={moverSelector} className="space-y-6 font-mono text-[var(--color-ink)] max-w-3xl">
      {/* Cabecera */}
      <div className="pb-3 border-b-2 border-[var(--color-ink)]">
        <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
          <FileText size={18} className="text-[var(--color-accent)]" /> Facturación electrónica SUNAT
        </h2>
        <p className="text-xs text-[var(--color-muted)] font-sans mt-0.5">
          Boletas y facturas electrónicas desde la Caja. Mientras esté desactivada, la Caja sigue entregando Nota de venta como siempre.
        </p>
      </div>

      {/* Estado del facturador */}
      <div className={`p-3 border-2 flex items-start gap-3 ${facturadorVivo ? 'border-emerald-600 bg-emerald-50' : 'border-red-600 bg-red-50'}`}>
        <Server size={18} className={facturadorVivo ? 'text-emerald-700 mt-0.5' : 'text-red-700 mt-0.5'} />
        <div className="text-xs font-sans">
          <p className="font-bold font-mono uppercase">
            {facturadorVivo ? 'Facturador del servidor: funcionando' : 'Facturador del servidor: sin conexión'}
          </p>
          <p className="text-[var(--color-muted)]">
            {facturadorVivo
              ? `Revisó hace ${visto} s${cfg.facturador_version ? ` · versión ${cfg.facturador_version}` : ''}. Envía las boletas y facturas pendientes cada pocos segundos.`
              : visto === null ? 'Todavía no se instaló en el servidor de este negocio. Avisa a SiuMax.' : `No responde desde hace ${Math.round(visto / 60)} min. Las ventas quedan en cola y se envían cuando vuelva. Avisa a SiuMax.`}
          </p>
        </div>
      </div>

      {/* Activar */}
      <div className="p-3 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase block">Facturación electrónica</span>
          <span className="text-xs text-[var(--color-muted)] font-sans">Al activarla, la Caja permite cobrar con Boleta o Factura.</span>
        </div>
        <button id="fact-activo" data-fila="activo" type="button" role="switch" aria-checked={cfg.activo} onClick={() => cambiar('activo', !cfg.activo)} className={claseOpcion(cfg.activo)}>
          {cfg.activo ? 'Activada' : 'Desactivada'}
        </button>
      </div>

      {/* Datos del emisor */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-[var(--color-border)] pb-1">Datos del negocio ante SUNAT</h3>
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
          <div>
            <Etiqueta htmlFor="fact-ruc">RUC</Etiqueta>
            <input id="fact-ruc" data-fila="ruc" inputMode="numeric" maxLength={11} value={cfg.ruc || ''} onChange={(e) => cambiar('ruc', e.target.value.replace(/\D/g, ''))} placeholder="20601234561" className={claseCampo} />
          </div>
          <div>
            <Etiqueta htmlFor="fact-razon">Razón social</Etiqueta>
            <input id="fact-razon" data-fila="razon" value={cfg.razon_social || ''} onChange={(e) => cambiar('razon_social', e.target.value)} placeholder="Como figura en SUNAT" className={claseCampo} />
          </div>
        </div>
        <div>
          <Etiqueta htmlFor="fact-comercial">Nombre comercial (opcional)</Etiqueta>
          <input id="fact-comercial" data-fila="comercial" value={cfg.nombre_comercial || ''} onChange={(e) => cambiar('nombre_comercial', e.target.value)} placeholder="Ej. Bodega La Esquina" className={claseCampo} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
          <div>
            <Etiqueta htmlFor="fact-direccion">Dirección fiscal</Etiqueta>
            <input id="fact-direccion" data-fila="direccion" value={cfg.direccion_fiscal || ''} onChange={(e) => cambiar('direccion_fiscal', e.target.value)} placeholder="Como figura en la ficha RUC" className={claseCampo} />
          </div>
          <div>
            <Etiqueta htmlFor="fact-ubigeo">Ubigeo (opcional)</Etiqueta>
            <input id="fact-ubigeo" data-fila="ubigeo" inputMode="numeric" maxLength={6} value={cfg.ubigeo || ''} onChange={(e) => cambiar('ubigeo', e.target.value.replace(/\D/g, ''))} placeholder="150101" className={claseCampo} />
          </div>
        </div>
        <div>
          <Etiqueta>Régimen tributario (pregúntalo a tu contador)</Etiqueta>
          <div className="flex flex-wrap gap-2">
            {REGIMENES.map((r) => (
              <button key={r.id} id={`fact-regimen-${r.id}`} data-fila="regimen" type="button" onClick={() => cambiar('regimen', r.id)} className={claseOpcion(cfg.regimen === r.id)}>{r.nombre}</button>
            ))}
          </div>
          {cfg.regimen === 'NRUS' && <p className="text-xs text-amber-700 font-sans mt-1">Nuevo RUS: solo boletas. La Caja no permitirá facturas.</p>}
        </div>
      </section>

      {/* Comprobantes y numeración */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-[var(--color-border)] pb-1">Series y numeración</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            ['serie_boleta', 'fact-serie-boleta', 'Boletas'],
            ['serie_factura', 'fact-serie-factura', 'Facturas'],
            ['serie_nc_boleta', 'fact-serie-nc-boleta', 'N. crédito boletas'],
            ['serie_nc_factura', 'fact-serie-nc-factura', 'N. crédito facturas'],
          ] as const).map(([campo, id, nombre]) => (
            <div key={campo}>
              <Etiqueta htmlFor={id}>{nombre}</Etiqueta>
              <input id={id} data-fila="series" maxLength={4} value={cfg[campo]} onChange={(e) => cambiar(campo, e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className={`${claseCampo} uppercase`} />
            </div>
          ))}
        </div>
        <div className="p-3 border-2 border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-sans space-y-2">
          <p>
            Próxima boleta: <b className="font-mono">{proximo(cfg.serie_boleta)}</b> · Próxima factura: <b className="font-mono">{proximo(cfg.serie_factura)}</b>
          </p>
          <p className="text-[var(--color-muted)]">¿Ya emitías con estas series en otro sistema? Escribe el último número que emitiste para seguir desde ahí.</p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Etiqueta htmlFor="fact-desde-boleta">Último {cfg.serie_boleta}</Etiqueta>
              <input id="fact-desde-boleta" data-fila="desde" inputMode="numeric" maxLength={8} value={desdeBoleta} onChange={(e) => setDesdeBoleta(e.target.value.replace(/\D/g, ''))} placeholder="0" className={`${claseCampo} w-32`} />
            </div>
            <div>
              <Etiqueta htmlFor="fact-desde-factura">Último {cfg.serie_factura}</Etiqueta>
              <input id="fact-desde-factura" data-fila="desde" inputMode="numeric" maxLength={8} value={desdeFactura} onChange={(e) => setDesdeFactura(e.target.value.replace(/\D/g, ''))} placeholder="0" className={`${claseCampo} w-32`} />
            </div>
            <button id="fact-btn-fijar" data-fila="desde-btn" type="button" onClick={fijarNumeracion} className={claseOpcion(false)}>Fijar numeración</button>
          </div>
        </div>
        <div>
          <Etiqueta>Comprobante que sale marcado al cobrar</Etiqueta>
          <div className="flex flex-wrap gap-2">
            {POR_DEFECTO.map((p) => (
              <button key={p.id} id={`fact-defecto-${p.id}`} data-fila="defecto" type="button" onClick={() => cambiar('comprobante_por_defecto', p.id)} className={claseOpcion(cfg.comprobante_por_defecto === p.id)}>{p.nombre}</button>
            ))}
          </div>
        </div>
      </section>

      {/* Proveedor */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-[var(--color-border)] pb-1">Proveedor y modo</h3>
        <div className="flex flex-wrap gap-2">
          {MODOS.map((m) => (
            <button key={m.id} id={`fact-modo-${m.id}`} data-fila="modo" type="button" onClick={() => cambiar('modo', m.id)} className={claseOpcion(cfg.modo === m.id)}>{m.nombre}</button>
          ))}
        </div>
        <p className={`text-xs font-sans ${cfg.modo === 'REAL' ? 'text-red-700 font-bold' : 'text-[var(--color-muted)]'}`}>{modoActual.ayuda}</p>

        <div className="p-3 border-2 border-[var(--color-border)] space-y-3">
          <p className="text-xs font-sans flex items-center gap-2">
            <KeyRound size={14} />
            {clave.tiene
              ? <span>Clave de Nubefact guardada ({clave.ruta} · token {clave.token_final}){clave.actualizado_por ? ` por ${clave.actualizado_por}` : ''} {fechaCorta(clave.updated_at)}. No se puede volver a ver: si cambia, escribe la nueva.</span>
              : <span>Todavía no hay clave del proveedor. Sácala de tu cuenta de Nubefact (ruta y token).</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Etiqueta htmlFor="fact-ruta">Ruta (URL)</Etiqueta>
              <input id="fact-ruta" data-fila="clave" value={ruta} onChange={(e) => setRuta(e.target.value)} placeholder="https://api.nubefact.com/api/v1/..." autoComplete="off" className={claseCampo} />
            </div>
            <div>
              <Etiqueta htmlFor="fact-token">Token</Etiqueta>
              <input id="fact-token" data-fila="clave" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={clave.tiene ? '•••••••• (guardado)' : 'Pega aquí el token'} autoComplete="new-password" className={claseCampo} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button id="fact-btn-guardar-clave" data-fila="clave-btn" type="button" onClick={guardarClave} className={claseOpcion(false)}>
              <span className="inline-flex items-center gap-1.5"><KeyRound size={14} /> Guardar clave</span>
            </button>
            <button id="fact-btn-probar" data-fila="clave-btn" type="button" aria-disabled={probando} onClick={() => !probando && probarConexion()} className={claseOpcion(false)}>
              <span className="inline-flex items-center gap-1.5">{probando ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />} {probando ? 'Probando…' : 'Probar conexión'}</span>
            </button>
          </div>
          {cfg.prueba_at && (
            <p className={`text-xs font-sans flex items-center gap-1.5 ${cfg.prueba_ok ? 'text-emerald-700' : 'text-red-700'}`}>
              {cfg.prueba_ok ? <CircleCheck size={14} /> : <CircleAlert size={14} />} {cfg.prueba_mensaje} <span className="text-[var(--color-muted)]">({fechaCorta(cfg.prueba_at)})</span>
            </p>
          )}
          <p className="text-[11px] text-[var(--color-muted)] font-sans">La prueba usa el modo guardado: guarda primero si lo cambiaste.</p>
        </div>
      </section>

      {/* Guardar */}
      <div className="flex justify-end pt-3 border-t-2 border-[var(--color-ink)]">
        <button
          id="fact-btn-guardar"
          data-fila="guardar"
          type="button"
          aria-disabled={guardando}
          onClick={() => !guardando && guardar()}
          className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-accent)] text-[var(--color-ink)] border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest hover:bg-[var(--color-ink)] hover:text-[var(--color-accent)] transition-all cursor-pointer shadow-[3px_3px_0_0_var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] rounded-none"
        >
          {guardando ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : <><Save size={16} /> Guardar cambios</>}
        </button>
      </div>
    </div>
  );
};
