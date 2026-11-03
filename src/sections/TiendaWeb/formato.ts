// Ayudas de presentación de la Tienda Web (solo cambian cómo se VE el texto, nunca el dato guardado).

const MINUSCULAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'con', 'sin', 'para', 'por', 'en', 'a', 'x']);

/** "PANETÓN DONOFRIO 900G" → "Panetón Donofrio 900G". Las palabras con números (1L, 900G, 75ML) quedan igual. */
export const nombreBonito = (texto: string | null | undefined): string => {
  if (!texto) return '';
  return texto
    .trim()
    .split(/\s+/)
    .map((palabra, i) => {
      if (/\d/.test(palabra)) return palabra.toUpperCase();
      const min = palabra.toLocaleLowerCase('es-PE');
      if (i > 0 && MINUSCULAS.has(min)) return min;
      return min.charAt(0).toLocaleUpperCase('es-PE') + min.slice(1);
    })
    .join(' ');
};

/** Dos letras para el recuadro de un producto sin foto: "Inca Kola 1.5L" → "IK". */
export const iniciales = (texto: string): string => {
  const palabras = texto.trim().split(/\s+/).filter((p) => /[a-záéíóúñ]/i.test(p));
  return ((palabras[0]?.[0] || '') + (palabras[1]?.[0] || '')).toUpperCase() || '•';
};

// Colores suaves para los productos sin foto: cada categoría siempre recibe el mismo color.
const TONOS = [
  { fondo: '#ECFDF5', letra: '#047857' },
  { fondo: '#EFF6FF', letra: '#1D4ED8' },
  { fondo: '#FFF7ED', letra: '#C2410C' },
  { fondo: '#FDF2F8', letra: '#BE185D' },
  { fondo: '#F5F3FF', letra: '#6D28D9' },
  { fondo: '#FEFCE8', letra: '#A16207' },
  { fondo: '#F0FDFA', letra: '#0F766E' },
  { fondo: '#FEF2F2', letra: '#B91C1C' },
];

export const tonoCategoria = (categoria: string) => {
  let h = 0;
  for (const c of categoria || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONOS[h % TONOS.length];
};

export const soles = (monto: number) => `S/ ${Number(monto || 0).toFixed(2)}`;

/** Número de WhatsApp listo para el link (con 51 adelante una sola vez). Vacío si no hay número. */
export const numeroWhatsapp = (...numeros: (string | null | undefined)[]): string => {
  const limpio = (numeros.find((n) => n && n.replace(/\D/g, '')) || '').replace(/\D/g, '');
  if (!limpio) return '';
  return limpio.startsWith('51') && limpio.length > 9 ? limpio : `51${limpio}`;
};
