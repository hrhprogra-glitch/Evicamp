// src/utils/decodificarBarras.ts
// Lector de códigos de barras 100 % sin internet para celular:
// 1. Usa el lector nativo del navegador (BarcodeDetector en Android Chrome / Edge / Samsung / iOS 17+) si existe.
// 2. Incluye un decodificador propio en TypeScript (EAN-13, UPC-A, EAN-8 y CODE-128) sobre las líneas de imagen
//    de la cámara, para que también funcione en iPhone (Safari) o navegadores sin BarcodeDetector y sin internet.

import type { Product } from '../sections/Inventario/types';
import { coincideBusqueda } from './busqueda';

// Patrones de ancho (4 tramos = 7 módulos) para dígitos EAN / UPC
const EAN_L: number[][] = [
  [3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2],
  [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2],
];
const EAN_G: number[][] = EAN_L.map((p) => [...p].reverse());

const PARIDAD_EAN13: Record<string, number> = {
  LLLLLL: 0, LLGLGG: 1, LLGGLG: 2, LLGGGL: 3, LGLLGG: 4,
  LGGLLG: 5, LGGGLL: 6, LGLGLG: 7, LGLGGL: 8, LGGLGL: 9,
};

// Patrones CODE-128 (valores 0 a 105: 6 tramos = 11 módulos; 106 = STOP con 7 tramos = 13 módulos)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232',
];

function mejorDigitoEan(tramos: number[], soloR = false): { digito: number; paridad: 'L' | 'G' | 'R'; err: number } {
  const total = tramos[0] + tramos[1] + tramos[2] + tramos[3];
  if (total <= 0) return { digito: -1, paridad: 'L', err: 999 };
  const norm = tramos.map((t) => (t * 7) / total);
  let mejor = { digito: -1, paridad: (soloR ? 'R' : 'L') as 'L' | 'G' | 'R', err: 999 };

  for (let d = 0; d < 10; d++) {
    const pL = EAN_L[d];
    const eL = Math.abs(norm[0] - pL[0]) + Math.abs(norm[1] - pL[1]) + Math.abs(norm[2] - pL[2]) + Math.abs(norm[3] - pL[3]);
    if (eL < mejor.err) mejor = { digito: d, paridad: soloR ? 'R' : 'L', err: eL };
    if (!soloR) {
      const pG = EAN_G[d];
      const eG = Math.abs(norm[0] - pG[0]) + Math.abs(norm[1] - pG[1]) + Math.abs(norm[2] - pG[2]) + Math.abs(norm[3] - pG[3]);
      if (eG < mejor.err) mejor = { digito: d, paridad: 'G', err: eG };
    }
  }
  return mejor;
}

function intentarEan13(runs: number[], idx: number): string | null {
  // EAN-13 necesita 59 tramos: 3 (inicio) + 24 (6 dígitos izq) + 5 (centro) + 24 (6 dígitos der) + 3 (fin)
  if (idx + 59 > runs.length) return null;
  const mIni = (runs[idx] + runs[idx + 1] + runs[idx + 2]) / 3;
  if (mIni <= 0.5) return null;
  if (Math.abs(runs[idx] - mIni) > mIni * 0.85 || Math.abs(runs[idx + 1] - mIni) > mIni * 0.85 || Math.abs(runs[idx + 2] - mIni) > mIni * 0.85) {
    return null;
  }
  // Verificar guarda central (idx + 27 .. idx + 31)
  const cIdx = idx + 27;
  const mCen = (runs[cIdx] + runs[cIdx + 1] + runs[cIdx + 2] + runs[cIdx + 3] + runs[cIdx + 4]) / 5;
  for (let k = 0; k < 5; k++) {
    if (Math.abs(runs[cIdx + k] - mCen) > mCen * 0.9) return null;
  }
  // Verificar guarda final (idx + 56 .. idx + 58)
  const eIdx = idx + 56;
  const mFin = (runs[eIdx] + runs[eIdx + 1] + runs[eIdx + 2]) / 3;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(runs[eIdx + k] - mFin) > mFin * 0.9) return null;
  }

  let paridades = '';
  const digitos: number[] = [];
  for (let i = 0; i < 6; i++) {
    const base = idx + 3 + i * 4;
    const r = mejorDigitoEan([runs[base], runs[base + 1], runs[base + 2], runs[base + 3]], false);
    if (r.err > 1.85 || r.digito < 0) return null;
    paridades += r.paridad;
    digitos.push(r.digito);
  }
  const primero = PARIDAD_EAN13[paridades];
  if (primero === undefined) return null;

  for (let i = 0; i < 6; i++) {
    const base = idx + 32 + i * 4;
    const r = mejorDigitoEan([runs[base], runs[base + 1], runs[base + 2], runs[base + 3]], true);
    if (r.err > 1.85 || r.digito < 0) return null;
    digitos.push(r.digito);
  }

  const todos = [primero, ...digitos];
  let suma = 0;
  for (let i = 0; i < 12; i++) suma += todos[i] * (i % 2 === 0 ? 1 : 3);
  if ((suma + todos[12]) % 10 !== 0) return null;
  return todos.join('');
}

function intentarEan8(runs: number[], idx: number): string | null {
  // EAN-8 necesita 43 tramos: 3 (inicio) + 16 (4 dígitos izq) + 5 (centro) + 16 (4 dígitos der) + 3 (fin)
  if (idx + 43 > runs.length) return null;
  const mIni = (runs[idx] + runs[idx + 1] + runs[idx + 2]) / 3;
  if (mIni <= 0.5) return null;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(runs[idx + k] - mIni) > mIni * 0.85) return null;
  }
  const cIdx = idx + 19;
  const mCen = (runs[cIdx] + runs[cIdx + 1] + runs[cIdx + 2] + runs[cIdx + 3] + runs[cIdx + 4]) / 5;
  for (let k = 0; k < 5; k++) {
    if (Math.abs(runs[cIdx + k] - mCen) > mCen * 0.85) return null;
  }
  const eIdx = idx + 40;
  const mFin = (runs[eIdx] + runs[eIdx + 1] + runs[eIdx + 2]) / 3;
  for (let k = 0; k < 3; k++) {
    if (Math.abs(runs[eIdx + k] - mFin) > mFin * 0.85) return null;
  }

  const digitos: number[] = [];
  for (let i = 0; i < 4; i++) {
    const base = idx + 3 + i * 4;
    const r = mejorDigitoEan([runs[base], runs[base + 1], runs[base + 2], runs[base + 3]], true);
    if (r.err > 1.75 || r.digito < 0) return null;
    digitos.push(r.digito);
  }
  for (let i = 0; i < 4; i++) {
    const base = idx + 24 + i * 4;
    const r = mejorDigitoEan([runs[base], runs[base + 1], runs[base + 2], runs[base + 3]], true);
    if (r.err > 1.75 || r.digito < 0) return null;
    digitos.push(r.digito);
  }
  let suma = 0;
  for (let i = 0; i < 7; i++) suma += digitos[i] * (i % 2 === 0 ? 3 : 1);
  if ((suma + digitos[7]) % 10 !== 0) return null;
  return digitos.join('');
}

function simboloCode128(tramos: number[]): { code: number; err: number } {
  const total = tramos[0] + tramos[1] + tramos[2] + tramos[3] + tramos[4] + tramos[5];
  if (total <= 0) return { code: -1, err: 999 };
  const norm = tramos.map((t) => (t * 11) / total);
  let mejor = { code: -1, err: 999 };
  for (let c = 0; c < CODE128_PATTERNS.length; c++) {
    const pat = CODE128_PATTERNS[c];
    let err = 0;
    for (let k = 0; k < 6; k++) err += Math.abs(norm[k] - Number(pat[k]));
    if (err < mejor.err) mejor = { code: c, err };
  }
  return mejor;
}

function esStopCode128(tramos: number[]): boolean {
  if (tramos.length < 7) return false;
  const stopPat = [2, 3, 3, 1, 1, 1, 2];
  const total = tramos[0] + tramos[1] + tramos[2] + tramos[3] + tramos[4] + tramos[5] + tramos[6];
  if (total <= 0) return false;
  let err = 0;
  for (let k = 0; k < 7; k++) err += Math.abs((tramos[k] * 13) / total - stopPat[k]);
  return err < 2.4;
}

function intentarCode128(runs: number[], idx: number): string | null {
  // Al menos: Inicio (6) + 1 dato (6) + Checksum (6) + Stop (7) = 25 tramos
  if (idx + 25 > runs.length) return null;
  const ini = simboloCode128(runs.slice(idx, idx + 6));
  if (ini.err > 1.9 || (ini.code !== 103 && ini.code !== 104 && ini.code !== 105)) return null;

  const codigos: number[] = [];
  let pos = idx + 6;
  while (pos + 7 <= runs.length && codigos.length < 48) {
    if (codigos.length >= 2 && esStopCode128(runs.slice(pos, pos + 7))) {
      // Verificar checksum módulo 103
      const checkLeido = codigos[codigos.length - 1];
      const datos = codigos.slice(0, -1);
      let suma = ini.code;
      for (let i = 0; i < datos.length; i++) suma += datos[i] * (i + 1);
      if (suma % 103 !== checkLeido) return null;

      // Decodificar según conjunto A, B o C
      let modo: 'A' | 'B' | 'C' = ini.code === 103 ? 'A' : ini.code === 104 ? 'B' : 'C';
      let texto = '';
      for (const c of datos) {
        if (modo === 'C') {
          if (c < 100) texto += String(c).padStart(2, '0');
          else if (c === 100) modo = 'B';
          else if (c === 101) modo = 'A';
        } else if (modo === 'B') {
          if (c < 95) texto += String.fromCharCode(32 + c);
          else if (c === 99) modo = 'C';
          else if (c === 101) modo = 'A';
        } else {
          if (c < 64) texto += String.fromCharCode(32 + c);
          else if (c < 96) texto += String.fromCharCode(c - 64);
          else if (c === 99) modo = 'C';
          else if (c === 100) modo = 'B';
        }
      }
      return texto.trim() || null;
    }
    if (pos + 6 > runs.length) break;
    const sym = simboloCode128(runs.slice(pos, pos + 6));
    if (sym.err > 2.0 || sym.code < 0) return null;
    codigos.push(sym.code);
    pos += 6;
  }
  return null;
}

/** Extrae los tramos blanco/negro de una fila de píxeles e intenta decodificar EAN-13, EAN-8 o CODE-128 */
function decodificarFilaPixeles(data: Uint8ClampedArray, width: number, y: number): string | null {
  const offset = y * width * 4;
  const gris = new Uint8Array(width);
  let min = 255;
  let max = 0;
  for (let x = 0; x < width; x++) {
    const p = offset + x * 4;
    const lum = (data[p] * 77 + data[p + 1] * 150 + data[p + 2] * 29) >> 8;
    gris[x] = lum;
    if (lum < min) min = lum;
    if (lum > max) max = lum;
  }
  if (max - min < 30) return null; // sin contraste suficiente

  // Umbral adaptativo por bloques para tolerar sombras o reflejos en el celular
  const ventana = Math.max(24, Math.floor(width / 12));
  const esNegro = new Uint8Array(width);
  let sumaVentana = 0;
  for (let x = 0; x < width; x++) {
    sumaVentana += gris[x];
    if (x >= ventana) sumaVentana -= gris[x - ventana];
    const cont = Math.min(x + 1, ventana);
    const mediaLocal = sumaVentana / cont;
    const umbral = (mediaLocal * 3 + (min + max) / 2) / 4;
    esNegro[x] = gris[x] < umbral ? 1 : 0;
  }

  // Convertir en longitudes de tramo (runs), empezando en el primer tramo negro
  const runs: number[] = [];
  let actual = esNegro[0];
  let largo = 1;
  let empiezaEnNegro = actual === 1;
  for (let x = 1; x < width; x++) {
    if (esNegro[x] === actual) {
      largo++;
    } else {
      if (runs.length > 0 || empiezaEnNegro) runs.push(largo);
      else empiezaEnNegro = true;
      actual = esNegro[x];
      largo = 1;
    }
  }
  if (runs.length > 0 || empiezaEnNegro) runs.push(largo);

  // Recorrer tramos negros (índices pares: 0, 2, 4...)
  for (let idx = 0; idx < runs.length - 20; idx += 2) {
    const ean13 = intentarEan13(runs, idx);
    if (ean13) return ean13;
    const code128 = intentarCode128(runs, idx);
    if (code128 && code128.length >= 2) return code128;
    const ean8 = intentarEan8(runs, idx);
    if (ean8) return ean8;
  }
  return null;
}

/** Decodifica un código de barras 1D desde un canvas analizando varias franjas horizontales */
export function decodificarBarrasCanvas(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || canvas.width < 40 || canvas.height < 10) return null;
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const franjas = [0.5, 0.42, 0.58, 0.34, 0.66, 0.25, 0.75, 0.46, 0.54];
  const votos = new Map<string, number>();

  for (const f of franjas) {
    const y = Math.min(height - 1, Math.max(0, Math.floor(height * f)));
    const leido = decodificarFilaPixeles(img.data, width, y);
    if (leido) {
      const n = (votos.get(leido) || 0) + 1;
      votos.set(leido, n);
      // EAN-13 y EAN-8 y CODE-128 ya validan dígito verificador matemático; 1 lectura válida basta
      return leido;
    }
  }
  return null;
}

// Instancia reutilizable de BarcodeDetector si el navegador del celular la trae
let detectorNativo: any = null;
let detectorInicializado = false;

async function obtenerDetectorNativo(): Promise<any> {
  if (detectorInicializado) return detectorNativo;
  detectorInicializado = true;
  const BD = (window as any).BarcodeDetector;
  if (!BD) return null;
  try {
    const formatosDeseados = [
      'ean_13', 'ean_8', 'upc_a', 'upc_e',
      'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'qr_code',
    ];
    let soportados: string[] = formatosDeseados;
    if (typeof BD.getSupportedFormats === 'function') {
      const disp: string[] = await BD.getSupportedFormats();
      const inter = formatosDeseados.filter((f) => disp.includes(f));
      if (inter.length > 0) soportados = inter;
    }
    detectorNativo = new BD({ formats: soportados });
  } catch {
    try { detectorNativo = new BD(); } catch { detectorNativo = null; }
  }
  return detectorNativo;
}

/** Detecta un código de barras desde un elemento de video, imagen o canvas (100 % sin internet) */
export async function detectarCodigoEnFuente(
  fuente: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  canvasAuxiliar: HTMLCanvasElement,
): Promise<string | null> {
  // 1. Intentar con BarcodeDetector nativo del celular (Android Chrome / Edge / Samsung / iOS 17+)
  const nativo = await obtenerDetectorNativo();
  if (nativo) {
    try {
      const resultados = await nativo.detect(fuente);
      if (Array.isArray(resultados) && resultados.length > 0) {
        const valor = String(resultados[0]?.rawValue || '').trim();
        if (valor) return valor;
      }
    } catch {
      // Si falla sobre el video directo, continúa con el canvas abajo
    }
  }

  // 2. Copiar el cuadro actual al canvas auxiliar y decodificar con el motor 1D propio
  const w = fuente instanceof HTMLVideoElement ? fuente.videoWidth : fuente.width;
  const h = fuente instanceof HTMLVideoElement ? fuente.videoHeight : fuente.height;
  if (!w || !h) return null;

  const escala = Math.min(1, 960 / w);
  const cw = Math.max(1, Math.round(w * escala));
  const ch = Math.max(1, Math.round(h * escala));
  if (canvasAuxiliar.width !== cw) canvasAuxiliar.width = cw;
  if (canvasAuxiliar.height !== ch) canvasAuxiliar.height = ch;

  const ctx = canvasAuxiliar.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(fuente, 0, 0, cw, ch);

  if (nativo) {
    try {
      const resCanvas = await nativo.detect(canvasAuxiliar);
      if (Array.isArray(resCanvas) && resCanvas.length > 0) {
        const valor = String(resCanvas[0]?.rawValue || '').trim();
        if (valor) return valor;
      }
    } catch { /* ignorar */ }
  }

  return decodificarBarrasCanvas(canvasAuxiliar);
}

/**
 * Busca el producto que corresponde al código escaneado:
 * 1° Coincidencia exacta por código de barras o SKU (incluyendo presentaciones por caja y tallas/colores).
 * 2° Coincidencia numérica sin ceros a la izquierda (UPC-A de 12 dígitos vs EAN-13 con 0 adelante).
 * 3° Coincidencia flexible de búsqueda.
 */
export function buscarProductoPorCodigo<T extends Product>(productos: T[], codigoEscaneado: string): T | null {
  const q = String(codigoEscaneado || '').trim().toUpperCase();
  if (!q) return null;
  const activos = productos.filter((p) => p.activo !== false);

  // 1. Exacto en barcode o code principal
  const exactoPrincipal = activos.find((p) =>
    [p.barcode, p.code].some((c) => c && String(c).trim().toUpperCase() === q)
  );
  if (exactoPrincipal) return exactoPrincipal;

  // 2. Exacto en presentaciones (caja, paquete) o variantes (tallas y colores)
  const exactoSub = activos.find((p) => {
    const enPres = Array.isArray(p.presentaciones) && p.presentaciones.some((pr) => pr?.barcode && String(pr.barcode).trim().toUpperCase() === q);
    const enVar = Array.isArray(p.variantes) && p.variantes.some((v) => v?.barcode && String(v.barcode).trim().toUpperCase() === q);
    return enPres || enVar;
  });
  if (exactoSub) return exactoSub;

  // 3. Coincidencia numérica UPC-A / EAN-13 (ej. 012345678905 vs 12345678905)
  if (/^\d{8,14}$/.test(q)) {
    const sinCeros = q.replace(/^0+/, '');
    if (sinCeros.length >= 7) {
      const porNumero = activos.find((p) =>
        [p.barcode, p.code].some((c) => c && /^\d+$/.test(String(c).trim()) && String(c).trim().replace(/^0+/, '') === sinCeros)
      );
      if (porNumero) return porNumero;
    }
  }

  // 4. Búsqueda general flexible
  return activos.find((p) =>
    coincideBusqueda([p.name, p.code, p.barcode, p.marca, p.modelo, p.medida, p.laboratorio, p.ubicacion], q)
  ) || null;
}

/** Emite un pitido corto y vibración suave en el celular al detectar el código */
export function sonarConfirmacionEscaneo(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(60);
    }
  } catch { /* sin vibración */ }
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // Do6 claro y corto
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
    setTimeout(() => { void ctx.close().catch(() => {}); }, 150);
  } catch { /* sin audio */ }
}

