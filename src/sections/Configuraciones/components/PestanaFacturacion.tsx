import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Save, Loader2, KeyRound, PlugZap, CircleCheck, CircleAlert, Server, Building2 } from 'lucide-react';
import { supabase } from '../../../db/supabase';
import { avisar, confirmar } from '../../../utils/dialogos';
import { rucValido } from '../../../utils/documento';
import { ModalComprobantes } from '../../../components/ModalComprobantes';

// Ajustes > Facturación (fase 11.1): series, numeración, modo y proveedor. Los datos del negocio
// (RUC, razón social, dirección, régimen) se toman de Ajustes > Datos de la empresa: un solo lugar.
// Las boletas/facturas las envía el FACTURADOR del servidor (servidor/facturador); esta pantalla solo
// guarda la configuración y muestra si el facturador está funcionando.

type Modo = 'SIMULADO' | 'PRUEBA' | 'REAL';
type PorDefecto = 'NOTA' | 'BOLETA' | 'FACTURA';

interface Config {
  activo: boolean;
  modo: Modo;
  proveedor: 'NUBEFACT' | 'SUNAT';
  serie_boleta: string;
  serie_factura: string;
  serie_nc_boleta: string;
  serie_nc_factura: string;
  comprobante_por_defecto: PorDefecto;
  icbper_monto: number;
  prueba_pedida_at: string | null;
  prueba_at: string | null;
  prueba_ok: boolean | null;
  prueba_mensaje: string | null;
  facturador_visto_at: string | null;
  facturador_version: string | null;
}

// Lo que se lee de Datos de la empresa (empresa_config)
interface Empresa {
  nombre_empresa: string | null;
  razon_social: string | null;
  ruc: string | null;
  direccion: string | null;
  regimen: string | null;
}

interface EstadoClave {
  tiene: boolean;
  sunat_usuario?: string | null;    // fase 11.8: usuario SOL secundario guardado
  sunat_certificado?: boolean;      // y si hay certificado (.pfx)
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
const NOMBRE_REGIMEN: Record<string, string> = { NRUS: 'Nuevo RUS', RER: 'RER', MYPE: 'MYPE Tributario', GENERAL: 'General' };
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

export const PestanaFacturacion: React.FC<{ onIrEmpresa: () => void }> = ({ onIrEmpresa }) => {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [clave, setClave] = useState<EstadoClave>({ tiene: false });
  const [correlativos, setCorrelativos] = useState<Record<string, number>>({});
  const [ruta, setRuta] = useState('');
  const [token, setToken] = useState('');
  const [desdeBoleta, setDesdeBoleta] = useState('');
  const [desdeFactura, setDesdeFactura] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [, setReloj] = useState(0);
  const [verComprobantes, setVerComprobantes] = useState(false);
  // Fase 11.8: directo a SUNAT (usuario SOL secundario y certificado digital)
  const [solUsuario, setSolUsuario] = useState('');
  const [solClave, setSolClave] = useState('');
  const [certArchivo, setCertArchivo] = useState<{ nombre: string; base64: string } | null>(null);
  const [certClave, setCertClave] = useState('');
  const contenedor = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async (soloEstado = false) => {
    const { data } = await supabase.from('facturacion_config').select('*').eq('id', 1).maybeSingle();
    if (!data) return;
    setCfg((previo) => (soloEstado && previo
      ? { ...previo, facturador_visto_at: data.facturador_visto_at, facturador_version: data.facturador_version, prueba_at: data.prueba_at, prueba_ok: data.prueba_ok, prueba_mensaje: data.prueba_mensaje }
      : data));
    if (soloEstado) return;
    const [{ data: estado }, { data: series }, { data: datosEmpresa }] = await Promise.all([
      supabase.rpc('fn_estado_credenciales_facturacion'),
      supabase.from('cpe_correlativos').select('serie, ultimo'),
      supabase.from('empresa_config').select('nombre_empresa, razon_social, ruc, direccion, regimen').order('id').limit(1).maybeSingle(),
    ]);
    if (estado) setClave(estado as EstadoClave);
    setEmpresa((datosEmpresa as Empresa) || { nombre_empresa: null, razon_social: null, ruc: null, direccion: null, regimen: null });
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

  // Qué falta en Datos de la empresa para poder emitir
  const faltanEmpresa = [
    !empresa?.ruc || !rucValido(empresa.ruc.trim()) ? 'RUC válido' : '',
    !empresa?.razon_social?.trim() ? 'razón social' : '',
    !empresa?.direccion?.trim() ? 'dirección fiscal' : '',
    !empresa?.regimen ? 'régimen' : '',
  ].filter(Boolean);

  const guardar = async () => {
    const icbper = Number(cfg.icbper_monto);
    if (!Number.isFinite(icbper) || icbper < 0 || icbper > 10) return avisar('El impuesto a la bolsa debe ser un monto entre 0 y 10 soles (hoy es 0.50).');
    for (const [serie, letra, nombre] of [[cfg.serie_boleta, 'B', 'boletas'], [cfg.serie_factura, 'F', 'facturas'], [cfg.serie_nc_boleta, 'B', 'notas de crédito de boletas'], [cfg.serie_nc_factura, 'F', 'notas de crédito de facturas']] as const) {
      if (!new RegExp(`^${letra}[A-Z0-9]{3}$`).test(serie)) return avisar(`La serie de ${nombre} debe tener 4 caracteres y empezar con ${letra} (ej. ${letra}001).`);
    }
    if (cfg.activo) {
      // Fase 11.7: SiuMax habilita la facturación de cada tienda (Panel); sin eso el facturador no la atiende
      if (visto === null || visto > 300) {
        return avisar('La facturación de esta tienda todavía no está habilitada por SiuMax (el facturador no la atiende). Pide que la habiliten y vuelve a intentar.');
      }
      if (faltanEmpresa.length) {
        return avisar(`Para activar la facturación falta en Ajustes > Datos de la empresa: ${faltanEmpresa.join(', ')}.`);
      }
      if (cfg.proveedor === 'NUBEFACT' && cfg.modo !== 'SIMULADO' && !clave.tiene) return avisar('Para el modo Prueba o Real primero guarda la ruta y la clave de Nubefact.');
      if (cfg.proveedor === 'SUNAT' && cfg.modo === 'REAL' && !(clave.sunat_usuario && clave.sunat_certificado)) {
        return avisar('Para enviar directo a SUNAT en modo Real guarda el usuario SOL secundario y el certificado digital (.pfx).');
      }
      if (cfg.comprobante_por_defecto === 'FACTURA' && empresa?.regimen === 'NRUS') return avisar('En el Nuevo RUS solo se emiten boletas: elige otro comprobante por defecto.');
      if (cfg.modo === 'REAL' && !(await confirmar('Modo REAL: las boletas y facturas tendrán valor ante SUNAT. ¿Continuar?'))) return;
    }
    setGuardando(true);
    const { error } = await supabase.from('facturacion_config').update({
      activo: cfg.activo,
      modo: cfg.modo,
      proveedor: cfg.proveedor,
      serie_boleta: cfg.serie_boleta,
      serie_factura: cfg.serie_factura,
      serie_nc_boleta: cfg.serie_nc_boleta,
      serie_nc_factura: cfg.serie_nc_factura,
      comprobante_por_defecto: cfg.comprobante_por_defecto,
      icbper_monto: Number(cfg.icbper_monto),
      updated_at: new Date().toISOString(),
    }).eq('id', 1);
    setGuardando(false);
    if (error) return avisar(`No se pudo guardar: ${error.message}`);
    await cargar();
    avisar(cfg.activo ? `Facturación guardada y ACTIVA (modo ${cfg.modo.toLowerCase()}).` : 'Facturación guardada (todavía desactivada).');
  };

  const elegirCertificado = (archivo?: File | null) => {
    if (!archivo) return;
    if (archivo.size > 140000) { avisar('Ese archivo es muy grande para ser un certificado (.pfx).'); return; }
    const lector = new FileReader();
    lector.onload = () => setCertArchivo({ nombre: archivo.name, base64: String(lector.result).split(',')[1] || '' });
    lector.readAsDataURL(archivo);
  };
  const guardarCredencialesSunat = async () => {
    if (!/^[A-Za-z0-9]{3,20}$/.test(solUsuario.trim())) return avisar('Escribe el usuario SOL SECUNDARIO (solo letras y números, sin el RUC delante).');
    if (solClave.length < 4) return avisar('Escribe la clave del usuario SOL secundario.');
    if (!certArchivo) return avisar('Elige el archivo del certificado digital (.pfx o .p12).');
    const { data, error } = await supabase.rpc('fn_guardar_credenciales_sunat', { p_usuario: solUsuario.trim(), p_clave: solClave, p_pfx: certArchivo.base64, p_pfx_clave: certClave });
    if (error) return avisar(`No se pudo guardar: ${error.message}`);
    setClave(data as EstadoClave);
    setSolClave(''); setCertArchivo(null); setCertClave('');
    avisar('Usuario SOL y certificado guardados en el servidor. Ahora usa "Probar conexión" (revisa que el certificado abra con su contraseña).');
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

      {/* Datos del negocio: se leen de Ajustes > Datos de la empresa (no se escriben aquí) */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-[var(--color-border)] pb-1">Datos del negocio ante SUNAT</h3>
        <div className="p-3 border-2 border-[var(--color-border)] bg-[var(--color-bg)] text-xs font-sans space-y-1">
          {([
            ['Razón social', empresa?.razon_social],
            ['Nombre comercial', empresa?.nombre_empresa],
            ['RUC', empresa?.ruc],
            ['Dirección fiscal', empresa?.direccion],
            ['Régimen', empresa?.regimen ? NOMBRE_REGIMEN[empresa.regimen] || empresa.regimen : ''],
          ] as const).map(([nombre, valor]) => (
            <p key={nombre} className="flex gap-2">
              <span className="w-32 shrink-0 font-bold font-mono uppercase text-[var(--color-muted)]">{nombre}</span>
              {valor ? <span className="font-mono">{valor}</span> : <span className="text-red-700 font-bold">Falta</span>}
            </p>
          ))}
          {empresa?.ruc && !rucValido(empresa.ruc.trim()) && <p className="text-red-700 font-bold">El RUC no es válido: revísalo.</p>}
          {empresa?.regimen === 'NRUS' && <p className="text-amber-700">Nuevo RUS: solo boletas. La Caja no permitirá facturas.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button id="fact-btn-ir-empresa" data-fila="empresa" type="button" onClick={onIrEmpresa} className={claseOpcion(false)}>
            <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> Cambiar en Datos de la empresa</span>
          </button>
          <span className="text-xs text-[var(--color-muted)] font-sans">Se escriben una sola vez ahí y salen en el ticket y en las boletas y facturas.</span>
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
        <div>
          <Etiqueta htmlFor="fact-icbper">Impuesto a la bolsa plástica (ICBPER), S/ por bolsa</Etiqueta>
          <input id="fact-icbper" data-fila="icbper" inputMode="decimal" value={String(cfg.icbper_monto ?? '')} onChange={(e) => cambiar('icbper_monto', e.target.value.replace(/[^\d.]/g, '') as unknown as number)} className={`${claseCampo} w-32`} />
          <p className="text-xs text-[var(--color-muted)] font-sans mt-1">Se aplica a los productos marcados como "Es bolsa plástica" (Inventario). Hoy es S/ 0.50; cámbialo solo si la ley cambia.</p>
        </div>
      </section>

      {/* Proveedor */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest border-b border-[var(--color-border)] pb-1">Proveedor y modo</h3>
        <div className="flex flex-wrap gap-2">
          {([['NUBEFACT', 'Nubefact'], ['SUNAT', 'Directo a SUNAT']] as const).map(([id, nombre]) => (
            <button key={id} id={`fact-prov-${id}`} data-fila="proveedor" type="button" onClick={() => cambiar('proveedor', id)} className={claseOpcion(cfg.proveedor === id)}>{nombre}</button>
          ))}
        </div>
        <p className="text-xs font-sans text-[var(--color-muted)]">
          {cfg.proveedor === 'SUNAT'
            ? 'SiuMax arma, firma y envía cada comprobante directo a SUNAT, sin pagar proveedor. Necesita el usuario SOL secundario y el certificado digital del negocio (en modo Prueba usa el ambiente de pruebas de SUNAT y no los pide).'
            : 'Nubefact (proveedor autorizado por SUNAT) recibe cada comprobante y lo envía a SUNAT. Necesita la ruta y el token de tu cuenta.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {MODOS.map((m) => (
            <button key={m.id} id={`fact-modo-${m.id}`} data-fila="modo" type="button" onClick={() => cambiar('modo', m.id)} className={claseOpcion(cfg.modo === m.id)}>{m.nombre}</button>
          ))}
        </div>
        <p className={`text-xs font-sans ${cfg.modo === 'REAL' ? 'text-red-700 font-bold' : 'text-[var(--color-muted)]'}`}>{modoActual.ayuda}</p>

        <div className="p-3 border-2 border-[var(--color-border)] space-y-3">
          {cfg.proveedor === 'SUNAT' ? (<>
          <p className="text-xs font-sans flex items-center gap-2">
            <KeyRound size={14} />
            {clave.sunat_usuario && clave.sunat_certificado
              ? <span>Guardado: usuario SOL secundario <b>{clave.sunat_usuario}</b> y certificado digital{clave.actualizado_por ? ` (por ${clave.actualizado_por})` : ''} {fechaCorta(clave.updated_at)}. No se pueden volver a ver.</span>
              : <span>Todavía no hay usuario SOL secundario ni certificado. Créalos en SUNAT Operaciones en Línea (usuario secundario con permiso de comprobantes electrónicos) y en una entidad certificadora.</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Etiqueta htmlFor="fact-sol-usuario">Usuario SOL secundario</Etiqueta>
              <input id="fact-sol-usuario" data-fila="sunat-sol" value={solUsuario} onChange={(e) => setSolUsuario(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Sin el RUC: ej. FACTURA1" autoComplete="off" className={claseCampo} />
            </div>
            <div>
              <Etiqueta htmlFor="fact-sol-clave">Clave del usuario SOL</Etiqueta>
              <input id="fact-sol-clave" data-fila="sunat-sol" type="password" value={solClave} onChange={(e) => setSolClave(e.target.value)} autoComplete="new-password" className={claseCampo} />
            </div>
            <div>
              <Etiqueta htmlFor="fact-cert">Certificado digital (.pfx / .p12)</Etiqueta>
              <input id="fact-cert" data-fila="sunat-cert" type="file" accept=".pfx,.p12" onChange={(e) => elegirCertificado(e.target.files?.[0])} className={`${claseCampo} file:mr-2 file:border-0 file:bg-[var(--color-ink)] file:text-white file:px-2 file:py-1`} />
              {certArchivo && <p className="text-[11px] font-sans mt-1">Elegido: {certArchivo.nombre}</p>}
            </div>
            <div>
              <Etiqueta htmlFor="fact-cert-clave">Contraseña del certificado</Etiqueta>
              <input id="fact-cert-clave" data-fila="sunat-cert" type="password" value={certClave} onChange={(e) => setCertClave(e.target.value)} autoComplete="new-password" className={claseCampo} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button id="fact-btn-guardar-sunat" data-fila="clave-btn" type="button" onClick={guardarCredencialesSunat} className={claseOpcion(false)}>
              <span className="inline-flex items-center gap-1.5"><KeyRound size={14} /> Guardar usuario SOL y certificado</span>
            </button>
            <button id="fact-btn-probar" data-fila="clave-btn" type="button" aria-disabled={probando} onClick={() => !probando && probarConexion()} className={claseOpcion(false)}>
              <span className="inline-flex items-center gap-1.5">{probando ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />} {probando ? 'Probando…' : 'Probar conexión'}</span>
            </button>
          </div>
          </>) : (<>
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
          </>)}
          {cfg.prueba_at && (
            <p className={`text-xs font-sans flex items-center gap-1.5 ${cfg.prueba_ok ? 'text-emerald-700' : 'text-red-700'}`}>
              {cfg.prueba_ok ? <CircleCheck size={14} /> : <CircleAlert size={14} />} {cfg.prueba_mensaje} <span className="text-[var(--color-muted)]">({fechaCorta(cfg.prueba_at)})</span>
            </p>
          )}
          <p className="text-[11px] text-[var(--color-muted)] font-sans">La prueba usa el modo guardado: guarda primero si lo cambiaste.</p>
        </div>
      </section>

      {/* Comprobantes emitidos (fila propia: ↓ desde aquí llega a "Guardar", el botón principal) */}
      <div>
        <button id="fact-btn-comprobantes" data-fila="comprobantes" type="button" onClick={() => setVerComprobantes(true)} className={claseOpcion(false)}>
          <span className="inline-flex items-center gap-1.5"><FileText size={14} /> Ver comprobantes emitidos</span>
        </button>
      </div>

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
      <ModalComprobantes isOpen={verComprobantes} onClose={() => { setVerComprobantes(false); setTimeout(() => document.getElementById('fact-btn-comprobantes')?.focus(), 50); }} />
    </div>
  );
};
