// src/utils/buscarImagenes.ts
// Buscador de fotos para el formulario de producto (Inventario).
//
// 1. Pixabay (fotos profesionales, entiende español: "fresa", "arroz", "detergente"). Se consulta por
//    el propio servidor (/api/imagenes → nginx, snippets/siumax-imagenes.conf): la clave de Pixabay
//    queda en el servidor y nunca en el navegador.
// 2. Si Pixabay no está configurado o no encuentra nada: fotos de Wikimedia Commons cuyo título
//    tenga la palabra buscada (sin mapas, lugares ni edificios).
//
// Pixabay no permite enlazar sus fotos para siempre: al elegir una se guarda una copia achicada
// dentro del producto (fotoParaGuardar), igual que "Subir local".

export interface FotoEncontrada { url: string; titulo: string }

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'para', 'por', 'y', 'en', 'x']);
const palabras = (q: string) => normalizar(q).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !VACIAS.has(w));
const raiz = (w: string) => w.replace(/(es|s)$/, ''); // fresas → fresa, limones → limon

const NO_SIRVE = new RegExp('\\b(' + [
  'map', 'mapa', 'locator', 'location', 'ubicacion', 'flag', 'bandera', 'escudo', 'coat.of.arms', 'seal',
  'diagram', 'diagrama', 'chart', 'police', 'policia', 'sign', 'letrero', 'welcome', 'street', 'calle', 'avenue',
  'avenida', 'road', 'church', 'iglesia', 'station', 'estacion', 'school', 'escuela', 'building', 'edificio',
  'beach', 'playa', 'city', 'ciudad', 'hall', 'airport', 'aeropuerto', 'stadium', 'estadio', 'portrait', 'retrato',
  'museum', 'museo', 'tower', 'torre', 'skyline', 'hotel', 'inn', 'room', 'bathroom', 'interior', 'reserve', 'reserva',
  'river', 'rio', 'monument', 'monumento', 'statue', 'estatua',
].join('|') + ')(e?s)?\\b', 'i');

const leerJson = async (url: string, signal: AbortSignal) => {
  try {
    const r = await fetch(url, { signal });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return null; // sin proxy: index.html
    return await r.json();
  } catch {
    return null;
  }
};

const dePixabay = async (consulta: string, signal: AbortSignal): Promise<FotoEncontrada[]> => {
  const parametros = new URLSearchParams({
    q: consulta.trim(), lang: 'es', image_type: 'photo', safesearch: 'true', per_page: '12', order: 'popular',
  });
  const datos = await leerJson(`/api/imagenes?${parametros}`, signal);
  return (datos?.hits || []).map((h: any) => ({ url: h.webformatURL || h.previewURL, titulo: h.tags || '' }))
    .filter((f: FotoEncontrada) => !!f.url);
};

const deCommons = async (consulta: string, signal: AbortSignal): Promise<FotoEncontrada[]> => {
  const buscadas = palabras(consulta);
  const datos = await leerJson(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(`${consulta.trim()} filetype:bitmap`)}&gsrlimit=30&prop=imageinfo&iiprop=url&iiurlwidth=300&format=json&origin=*`, signal);
  return Object.values(datos?.query?.pages || {})
    .sort((a: any, b: any) => a.index - b.index)
    .map((p: any) => ({ url: p.imageinfo?.[0]?.thumburl as string, titulo: String(p.title).replace(/^File:/, '').replace(/[_-]/g, ' ') }))
    .filter((f) => f.url && !NO_SIRVE.test(normalizar(f.titulo))
      && buscadas.every((w) => normalizar(f.titulo).includes(raiz(w)))); // el título debe nombrar lo buscado
};

/** Fotos para `consulta`, las más relevantes primero. */
export const buscarImagenes = async (consulta: string, signal: AbortSignal, maximo = 4): Promise<FotoEncontrada[]> => {
  if (!palabras(consulta).length) return [];
  let fotos = await dePixabay(consulta, signal);
  if (fotos.length < maximo && !signal.aborted) fotos = [...fotos, ...(await deCommons(consulta, signal))];
  const vistas = new Set<string>();
  return fotos.filter((f) => !vistas.has(f.url) && vistas.add(f.url)).slice(0, maximo);
};

/**
 * La foto que se guarda en el producto. Las de Pixabay se copian achicadas (máx. 400 px, JPEG) dentro
 * del producto, porque Pixabay no permite enlazarlas para siempre; las demás se guardan como enlace.
 */
export const fotoParaGuardar = async (url: string): Promise<string> => {
  if (!/^https:\/\/(cdn\.)?pixabay\.com\//.test(url)) return url;
  try {
    const imagen = await createImageBitmap(await (await fetch(url)).blob());
    const escala = Math.min(1, 400 / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext('2d')?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    return lienzo.toDataURL('image/jpeg', 0.82);
  } catch {
    return url; // sin poder copiarla: al menos queda el enlace
  }
};
