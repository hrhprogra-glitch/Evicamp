// =========================================================================
// 🔍 MOTOR DE BÚSQUEDA UNIVERSAL DE EVICAMP
// Normaliza tildes, mayúsculas y colapsa espacios múltiples ("lenteja  bebe" <-> "lenteja bebe")
// Permite encontrar coincidencias sin importar espacios accidentales ni tildes.
// Tolerante: completo o incompleto, sin coma/espacio/símbolo, y con alguna letra faltante.
// =========================================================================

export function normalizarTexto(texto: any): string {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes y diéresis
    .toLowerCase()
    .replace(/\s+/g, ' ') // Colapsar múltiples espacios internos a uno solo
    .trim();
}

// Solo letras y números: ignora coma, espacio, guion, punto, paréntesis, etc.
function compactar(texto: string): string {
  return normalizarTexto(texto).replace(/[^a-z0-9]+/g, '');
}

// Distancia de edición acotada: solo calcula si vale la pena (evita costo alto).
// Devuelve 0..max+1 (max+1 significa "más lejos que max").
function distanciaAcotada(a: string, b: string, max: number): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  // DP por filas (O(la*lb), pero con strings cortos y max pequeño es barato)
  let prev = new Array(lb + 1);
  let curr = new Array(lb + 1);
  for (let j = 0; j <= lb; j++) prev[j] = j;
  for (let i = 1; i <= la; i++) {
    curr[0] = i;
    let filaMin = curr[0];
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= lb; j++) {
      const costo = ca === b.charCodeAt(j - 1) ? 0 : 1;
      const val = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + costo);
      curr[j] = val;
      if (val < filaMin) filaMin = val;
    }
    if (filaMin > max) return max + 1;
    const tmp = prev; prev = curr; curr = tmp;
  }
  return prev[lb];
}

// ¿El texto contiene el término permitiendo hasta "tol" errores de edición?
// Sirve para "sin alguna letra" / letra cambiada / letra de más.
function contieneAprox(texto: string, termino: string, tol: number): boolean {
  if (!termino) return true;
  if (tol <= 0) return texto.includes(termino);
  if (texto.includes(termino)) return true;
  const lt = termino.length;
  const lb = texto.length;
  if (lb === 0) return false;
  if (Math.abs(lb - lt) <= tol && distanciaAcotada(texto, termino, tol) <= tol) return true;
  const desde = Math.max(0, lt - tol);
  const hasta = lt + tol;
  for (let i = 0; i < lb; i++) {
    for (let len = desde; len <= hasta; len++) {
      if (i + len > lb) break;
      const trozo = texto.slice(i, i + len);
      if (distanciaAcotada(trozo, termino, tol) <= tol) return true;
    }
  }
  return false;
}

function camposNorm(campos: (string | null | undefined)[] | string | null | undefined): string[] {
  const lista = Array.isArray(campos) ? campos : [campos];
  return lista.map((c) => normalizarTexto(c)).filter(Boolean);
}

/**
 * Coincidencia flexible de búsqueda:
 * - Ignora tildes, mayúsculas/minúsculas, comas, espacios extra y símbolos.
 * - Encuentra completo o incompleto, y palabras en cualquier orden.
 * - Tolera alguna letra faltante/cambiada cuando el término es suficientemente largo.
 *
 * @param campos Campo o lista de campos donde buscar (ej. [p.name, p.code, p.barcode])
 * @param termino Lo que escribió el usuario en el buscador
 */
export function coincideBusqueda(
  campos: (string | null | undefined)[] | string | null | undefined,
  termino: string
): boolean {
  return puntajeBusqueda(campos, termino) > 0;
}

/**
 * Puntaje de relevancia (mayor = mejor coincidencia, 0 = no coincide).
 * Permite ordenar resultados para que lo más parecido aparezca primero.
 */
export function puntajeBusqueda(
  campos: (string | null | undefined)[] | string | null | undefined,
  termino: string
): number {
  if (!termino || !termino.trim()) return 1;
  const terminoNorm = normalizarTexto(termino);
  if (!terminoNorm) return 1;

  const textosNorm = camposNorm(campos);
  if (textosNorm.length === 0) return 0;

  const textoCombinado = textosNorm.join(' ');
  const compactoCombinado = compactar(textoCombinado);
  const terminoCompacto = compactar(terminoNorm);
  if (!terminoCompacto) return 1;

  // Tolerancia: 0 para muy corto, 1 para medio, 2 para largo
  const tol = terminoCompacto.length <= 3 ? 0 : terminoCompacto.length <= 6 ? 1 : 2;
  const palabras = terminoNorm.split(' ').filter(Boolean);
  const palabrasCompactas = palabras.map(compactar).filter(Boolean);

  let mejor = 0;
  for (let i = 0; i < textosNorm.length; i++) {
    const t = textosNorm[i];
    const c = compactar(t);
    if (!c) continue;
    let p = 0;

    if (c === terminoCompacto) p = 1200; // exacto sin símbolos
    else if (t === terminoNorm) p = 1180;
    else if (c.startsWith(terminoCompacto)) p = 1100;
    else if (t.startsWith(terminoNorm)) p = 1080;
    else if (t.includes(terminoNorm)) p = 1000 - Math.min(200, t.indexOf(terminoNorm));
    else if (c.includes(terminoCompacto)) p = 950 - Math.min(200, c.indexOf(terminoCompacto));
    else if (palabrasCompactas.length > 1 && palabrasCompactas.every((pc) => c.includes(pc))) p = 900;
    else if (palabrasCompactas.length > 1 && palabrasCompactas.every((pc) => compactoCombinado.includes(pc))) p = 850;
    else if (tol > 0 && c.length >= terminoCompacto.length && distanciaAcotada(c, terminoCompacto, tol) <= tol) p = 780;
    else if (tol > 0 && contieneAprox(c, terminoCompacto, tol)) p = 700;
    else if (tol > 0 && palabrasCompactas.length > 1 && palabrasCompactas.every((pc) => contieneAprox(compactoCombinado, pc, pc.length <= 3 ? 0 : 1))) p = 680;
    else if (tol > 0 && palabrasCompactas.length === 1 && contieneAprox(compactoCombinado, terminoCompacto, tol)) p = 660;

    // Bono leve por campos de identidad (código/barras suelen venir primero en los callers)
    if (p > 0 && i <= 2) p += 5;
    if (p > mejor) mejor = p;
  }

  // Fallback combinado (por si el término se reparte entre campos)
  if (mejor === 0) {
    if (compactoCombinado.includes(terminoCompacto)) mejor = 640;
    else if (palabrasCompactas.length > 1 && palabrasCompactas.every((pc) => compactoCombinado.includes(pc))) mejor = 620;
    else if (tol > 0 && contieneAprox(compactoCombinado, terminoCompacto, tol)) mejor = 560;
  }

  return mejor;
}
