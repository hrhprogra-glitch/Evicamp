// src/components/ListaVentana.tsx
// Piezas comunes para las listas dentro de ventanas flotantes, con el estilo del "Directorio de clientes"
// (Fiados > ModalClientes): fondo gris claro, barra de filtros en caja blanca, lista en caja blanca con
// líneas grises y filas de 3 zonas (ícono + título + datos en gris / etiqueta de estado / acciones o números).
// Usarlas en toda ventana nueva con una lista o tabla para que todas se vean iguales.
import React from 'react';

// Cuerpo de la ventana (debajo de la cabecera oscura)
export const CuerpoVentana: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 min-h-0 bg-[var(--color-bg)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-3 sm:p-6 flex flex-col gap-4">
    {children}
  </div>
);

// Barra de filtros, pestañas y botones de arriba
export const BarraFiltros: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-3 sm:p-4 border-2 border-[var(--color-border)] flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 bg-[var(--color-surface)]">
    {children}
  </div>
);

// Pestaña o botón de la barra: la activa como el botón principal (negro), las demás con borde gris
export const claseBotonBarra = (activo: boolean) =>
  `h-[44px] px-4 sm:px-6 border-2 font-black text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer rounded-none transition-colors outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] ${
    activo
      ? 'bg-[var(--color-ink)] text-white border-[var(--color-ink)]'
      : 'bg-white text-[var(--color-ink)] border-[var(--color-border)] hover:border-[var(--color-ink)]'
  }`;

// Campo de la barra (buscador, fecha, desplegable)
export const claseCampoBarra =
  'w-full sm:w-auto border-2 border-[var(--color-border)] px-4 py-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none bg-white rounded-none focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]';

// Buscador de la barra (va dentro de un div "relative" con la lupa: ver BuscadorBarra)
export const claseBuscadorBarra =
  'w-full bg-white border-2 border-[var(--color-border)] pl-9 pr-4 py-3 text-xs font-black uppercase outline-none focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-ink)] transition-colors rounded-none';

// Botón principal de la barra ("+ Nuevo cliente", "+ Nuevo proveedor")
export const claseBotonPrincipal =
  'w-full sm:w-auto h-[44px] bg-[var(--color-ink)] text-white px-3 sm:px-6 justify-center border-2 border-[var(--color-ink)] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-warning)] hover:text-[var(--color-ink)] focus:bg-[var(--color-warning)] focus:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-ink)] transition-colors shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] cursor-pointer rounded-none shrink-0';

// Botón cuadrado de ícono de la fila (editar / eliminar), como en el Directorio de clientes
export const claseBotonIcono = (tipo: 'editar' | 'eliminar') =>
  `p-2 bg-white text-[var(--color-subtle)] border-2 border-[var(--color-border)] transition-colors cursor-pointer outline-none rounded-none ${
    tipo === 'eliminar'
      ? 'hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] focus:border-[var(--color-danger)] focus:text-[var(--color-danger)] focus:ring-2 focus:ring-[var(--color-danger)]'
      : 'hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] focus:border-[var(--color-warning)] focus:text-[var(--color-warning)] focus:ring-2 focus:ring-[var(--color-warning)]'
  }`;

// Texto chico de la barra (resúmenes como "Con stock: 2 lotes")
export const TextoBarra: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-[12px] font-black uppercase tracking-wider text-[var(--color-muted)]">{children}</span>
);

// Caja blanca de la lista. Sin filas muestra el mensaje centrado. La última fila también lleva su línea
// (border-b-2): si no, el espacio blanco de abajo parece parte de ella.
export const CajaLista: React.FC<{ children?: React.ReactNode; vacia?: boolean; mensaje?: React.ReactNode }> = ({ children, vacia, mensaje }) => (
  <div className="flex-1 overflow-y-auto min-h-0 border-2 border-[var(--color-border)] bg-white [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
    {vacia ? (
      <div className="flex items-center justify-center gap-2 h-full min-h-[120px] p-6 text-center text-[var(--color-subtle)] font-bold text-sm uppercase">
        {mensaje}
      </div>
    ) : (
      <div className="grid grid-cols-1 divide-y-2 divide-[var(--color-border)] border-b-2 border-[var(--color-border)]">{children}</div>
    )}
  </div>
);

// Separador dentro de la lista (ej. "Agotados (3)")
export const SeparadorLista: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 sm:px-4 py-2 bg-[var(--color-bg)] text-[12px] font-black uppercase tracking-widest text-[var(--color-muted)]">
    {children}
  </div>
);

type PropsFila = Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  icono?: React.ReactNode;
  titulo: React.ReactNode;
  subtitulo?: React.ReactNode;
  centro?: React.ReactNode;
  derecha?: React.ReactNode;
  atenuada?: boolean; // ej. lotes agotados: texto más claro
  tono?: 'normal' | 'error';
  [dato: `data-${string}`]: string | undefined;
};

// Fila de 3 zonas: izquierda (ícono + título + datos en gris), centro (etiqueta) y derecha (acciones o números)
export const FilaLista: React.FC<PropsFila> = ({ icono, titulo, subtitulo, centro, derecha, atenuada, tono = 'normal', className = '', ...resto }) => (
  <div
    {...resto}
    className={`p-3 sm:p-4 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 sm:gap-0 hover:bg-[var(--color-bg)] focus:bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-ink)] transition-colors group ${
      tono === 'error' ? 'bg-[var(--color-danger-bg)]' : ''
    } ${className}`}
  >
    <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-1/3 min-w-0">
      {icono && <span className="text-[var(--color-subtle)] shrink-0">{icono}</span>}
      <div className="min-w-0">
        <p className={`font-black uppercase truncate ${atenuada ? 'text-[var(--color-subtle)]' : 'text-[var(--color-ink)]'}`}>{titulo}</p>
        {subtitulo && <div className="text-[12px] font-bold text-[var(--color-muted)]">{subtitulo}</div>}
      </div>
    </div>
    <div className="sm:w-1/3 text-left sm:text-center">{centro}</div>
    <div className="flex items-center justify-end gap-2 sm:w-1/3 ml-auto">{derecha}</div>
  </div>
);

// Línea de datos en gris debajo del título (varias = una debajo de otra); nunca se parte a mitad
export const LineaDato: React.FC<{ children: React.ReactNode; titulo?: string }> = ({ children, titulo }) => (
  <span className="block truncate" title={titulo}>{children}</span>
);

// Etiqueta de estado como "AL DÍA" (verde) o "DEBE" (rojo)
const TONOS = {
  verde: 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border-[var(--color-accent)]',
  rojo: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]',
  azul: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]',
  ambar: 'bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning)]',
  gris: 'bg-[var(--color-bg)] text-[var(--color-muted)] border-[var(--color-border)]',
} as const;
export type TonoEtiqueta = keyof typeof TONOS;

export const Etiqueta: React.FC<{ tono: TonoEtiqueta; children: React.ReactNode }> = ({ tono, children }) => (
  <span className={`inline-block px-3 py-1 text-[12px] font-black uppercase border ${TONOS[tono]}`}>{children}</span>
);

// Número destacado a la derecha de la fila (ej. "QUEDA 8 / 10 UND" o "+5 KG")
export const DatoFila: React.FC<{ etiqueta?: string; valor: React.ReactNode; tono?: 'normal' | 'verde' | 'rojo' }> = ({ etiqueta, valor, tono = 'normal' }) => (
  <div className="text-right">
    {etiqueta && <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted)]">{etiqueta}</p>}
    <p className={`font-black ${tono === 'verde' ? 'text-[var(--color-accent)]' : tono === 'rojo' ? 'text-[var(--color-danger)]' : 'text-[var(--color-ink)]'}`}>{valor}</p>
  </div>
);
