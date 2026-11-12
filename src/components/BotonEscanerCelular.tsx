// src/components/BotonEscanerCelular.tsx
// Botón de cámara [ 📷 ] EXCLUSIVO PARA CELULAR (.solo-celular-escaner: oculto en PC y laptops).
// Abre la cámara trasera del celular, lee el código de barras del producto (100 % sin internet)
// y entrega el código al buscador o formulario donde se tocó.

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Flashlight, ImageUp, ScanLine, X } from 'lucide-react';
import { useCerrarConEscape } from '../utils/useCerrarConEscape';
import { detectarCodigoEnFuente, sonarConfirmacionEscaneo } from '../utils/decodificarBarras';

interface Props {
  onScan: (codigo: string) => void;
  id?: string;
  titulo?: string;
  /** Variante visual: 'sobrio' para barra .buscador-sobrio, 'campo' para ir pegado a un input */
  variante?: 'sobrio' | 'campo' | 'compacto';
  className?: string;
  disabled?: boolean;
}

export const BotonEscanerCelular: React.FC<Props> = ({
  onScan,
  id,
  titulo = 'Escanear código de barras con la cámara',
  variante = 'campo',
  className = '',
  disabled = false,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [linternaDisponible, setLinternaDisponible] = useState(false);
  const [linternaActiva, setLinternaActiva] = useState(false);
  const [leyendoFoto, setLeyendoFoto] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onScanRef = useRef(onScan);
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const detenerCamara = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch { /* ignorar */ }
      });
      streamRef.current = null;
    }
    setLinternaDisponible(false);
    setLinternaActiva(false);
  };

  const cerrar = () => {
    detenerCamara();
    setAbierto(false);
    setErrorCamara(null);
  };

  useCerrarConEscape(abierto, cerrar);

  const entregarCodigo = (codigo: string) => {
    const limpio = String(codigo || '').trim();
    if (!limpio) return;
    sonarConfirmacionEscaneo();
    cerrar();
    onScanRef.current(limpio);
  };

  // Permitir prueba automatizada desde scripts de verificación (Evento Custom 'siumax:escaner-celular')
  useEffect(() => {
    if (!abierto) return;
    const escucharSimulacion = (e: Event) => {
      const codigo = (e as CustomEvent<string>).detail;
      if (codigo) entregarCodigo(codigo);
    };
    window.addEventListener('siumax:escaner-celular', escucharSimulacion);
    return () => window.removeEventListener('siumax:escaner-celular', escucharSimulacion);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Iniciar cámara trasera y bucle de lectura cuando se abre la ventana
  useEffect(() => {
    if (!abierto) return;
    let activo = true;
    let timer: number | undefined;
    setErrorCamara(null);

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }

    const iniciar = async () => {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        setErrorCamara('Tu navegador bloqueó la cámara en vivo. Usa el botón «Tomar foto del código» abajo.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!activo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const caps = track.getCapabilities() as any;
          if (caps && caps.torch) setLinternaDisponible(true);
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        const escanearCuadro = async () => {
          if (!activo) return;
          const v = videoRef.current;
          const c = canvasRef.current;
          if (v && c && v.readyState >= 2 && v.videoWidth > 0) {
            const codigo = await detectarCodigoEnFuente(v, c);
            if (!activo) return;
            if (codigo) {
              entregarCodigo(codigo);
              return;
            }
          }
          timer = window.setTimeout(escanearCuadro, 140);
        };
        timer = window.setTimeout(escanearCuadro, 200);
      } catch {
        if (!activo) return;
        setErrorCamara('No se pudo abrir la cámara en vivo (revisa el permiso de cámara del navegador o usa «Tomar foto del código» abajo).');
      }
    };

    void iniciar();
    return () => {
      activo = false;
      if (timer) window.clearTimeout(timer);
      detenerCamara();
    };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  const alternarLinterna = async () => {
    const track = streamRef.current?.getVideoTracks()[0] as any;
    if (!track || typeof track.applyConstraints !== 'function') return;
    const nuevo = !linternaActiva;
    try {
      await track.applyConstraints({ advanced: [{ torch: nuevo }] });
      setLinternaActiva(nuevo);
    } catch { /* algunos equipos no permiten cambiarla en caliente */ }
  };

  const procesarFotoArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLeyendoFoto(true);
    setErrorCamara(null);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        const c = canvasRef.current || (canvasRef.current = document.createElement('canvas'));
        const codigo = await detectarCodigoEnFuente(img, c);
        if (codigo) {
          entregarCodigo(codigo);
        } else {
          setErrorCamara('No se distinguió el código de barras en la foto. Acércate un poco más y asegúrate de que las barras se vean claras.');
        }
      } finally {
        URL.revokeObjectURL(url);
        setLeyendoFoto(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setLeyendoFoto(false);
      setErrorCamara('No se pudo leer la imagen tomada.');
    };
    img.src = url;
  };

  const baseClase =
    variante === 'sobrio'
      ? 'buscador-sobrio__camara solo-celular-escaner'
      : variante === 'compacto'
      ? 'solo-celular-escaner shrink-0 w-9 h-9 border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-accent)] hover:opacity-90 items-center justify-center cursor-pointer rounded-none'
      : 'solo-celular-escaner shrink-0 h-10 px-3 border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-accent)] hover:opacity-90 items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider cursor-pointer rounded-none';

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        data-escaner-celular="true"
        onMouseDown={(e) => {
          // Evita que el buscador cierre su lista por onBlur antes de abrir la cámara
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setAbierto(true);
        }}
        title={titulo}
        aria-label={titulo}
        className={`${baseClase} ${className}`}
      >
        <Camera size={variante === 'compacto' ? 16 : 18} />
      </button>

      {abierto &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Escanear código de barras"
            data-dialogo-sistema="1"
            id="modal-escaner-celular"
            onClick={(e) => {
              if (e.target === e.currentTarget) cerrar();
            }}
            className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-3 font-mono"
          >
            <div className="ventana-sobria bg-[var(--color-surface)] w-full max-w-md border-2 border-[var(--color-ink)] flex flex-col">
              {/* CABECERA */}
              <div
                style={{ '--icono': 'var(--color-accent-shadow)' } as React.CSSProperties}
                className="ventana-cabecera px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ScanLine size={20} className="text-[var(--color-accent)] shrink-0" />
                  <div className="min-w-0">
                    <h2 className="ventana-cabecera__titulo text-xs font-black uppercase tracking-widest truncate">
                      Escanear Código
                    </h2>
                    <p className="text-[10px] font-bold text-[var(--color-muted)] uppercase">
                      Apunta al código de barras del producto
                    </p>
                  </div>
                </div>
                <button
                  id="btn-cerrar-escaner-celular"
                  type="button"
                  onClick={cerrar}
                  title="Cerrar cámara (Escape)"
                  aria-label="Cerrar cámara"
                  className="ventana-cerrar p-1.5 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* VISOR DE CÁMARA */}
              <div className="p-3 bg-[var(--color-bg)] flex flex-col gap-3">
                <div className="relative w-full aspect-[4/3] bg-black border-2 border-[var(--color-ink)] overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                  {/* Marco guía rectangular (0px border-radius, estilo SiuMax Sobrio) */}
                  <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 h-28 border-2 border-[var(--color-accent)] bg-black/10 flex items-center justify-center">
                    <div className="w-full h-[2px] bg-[var(--color-danger)] opacity-85" />
                  </div>

                  {linternaDisponible && (
                    <button
                      id="btn-linterna-escaner"
                      type="button"
                      onClick={() => void alternarLinterna()}
                      className={`absolute top-2 right-2 px-2.5 py-1.5 border-2 border-[var(--color-ink)] text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                        linternaActiva
                          ? 'bg-[var(--color-warning)] text-black'
                          : 'bg-[var(--color-surface)] text-[var(--color-ink)]'
                      }`}
                    >
                      <Flashlight size={14} /> {linternaActiva ? 'Luz ON' : 'Luz'}
                    </button>
                  )}
                </div>

                {errorCamara && (
                  <p
                    id="aviso-error-escaner"
                    role="alert"
                    className="p-2.5 border-2 border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-ink)] text-[11px] font-black uppercase"
                  >
                    {errorCamara}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <label
                    id="btn-foto-escaner-celular"
                    className="flex-1 py-2.5 px-3 border-2 border-[var(--color-ink)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-bg-2)] text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <ImageUp size={15} />
                    <span>{leyendoFoto ? 'Leyendo código…' : 'Tomar foto del código'}</span>
                    <input
                      id="input-foto-escaner-celular"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={procesarFotoArchivo}
                      className="hidden"
                    />
                  </label>

                  <button
                    id="btn-cancelar-escaner-celular"
                    type="button"
                    onClick={cerrar}
                    className="py-2.5 px-4 border-2 border-[var(--color-ink)] bg-[var(--color-ink)] text-white text-[11px] font-black uppercase tracking-wider cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.getElementById('root') ?? document.body,
        )}
    </>
  );
};

