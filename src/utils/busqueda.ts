// =========================================================================
// 🔍 MOTOR DE BÚSQUEDA UNIVERSAL DE EVICAMP
// Normaliza tildes, mayúsculas y colapsa espacios múltiples ("lenteja  bebe" <-> "lenteja bebe")
// Permite encontrar coincidencias sin importar espacios accidentales ni tildes.
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

/**
 * Coincidencia flexible de búsqueda:
 * - Colapsa espacios repetidos en campos y en la búsqueda ("lenteja  bebe" <-> "lenteja bebe").
 * - Ignora tildes y mayúsculas/minúsculas.
 * - Busca por palabras sueltas: "lenteja bebe" encuentra productos que tengan ambas palabras.
 * - Soporta búsqueda sin separadores (códigos pegados, etc.).
 *
 * @param campos Campo o lista de campos donde buscar (ej. [p.name, p.code, p.barcode])
 * @param termino Lo que escribió el usuario en el buscador
 */
export function coincideBusqueda(
  campos: (string | null | undefined)[] | string | null | undefined,
  termino: string
): boolean {
  if (!termino || !termino.trim()) return true;
  const terminoNorm = normalizarTexto(termino);
  if (!terminoNorm) return true;

  const listaCampos = Array.isArray(campos) ? campos : [campos];
  const textosNorm = listaCampos.map(c => normalizarTexto(c)).filter(Boolean);
  if (textosNorm.length === 0) return false;

  const textoCombinado = textosNorm.join(' ');

  // 1. Si el texto combinado contiene el término normalizado completo
  if (textoCombinado.includes(terminoNorm)) return true;

  // 2. Si alguna propiedad individual contiene el término completo
  if (textosNorm.some(t => t.includes(terminoNorm))) return true;

  // 3. Búsqueda por palabras separadas: "lenteja bebe" encuentra "Lenteja  Bebe" o "Bebe Lenteja"
  const palabras = terminoNorm.split(' ').filter(Boolean);
  if (palabras.length > 0 && palabras.every(palabra => textoCombinado.includes(palabra))) {
    return true;
  }

  // 4. Comparación sin separadores (ej. códigos o palabras pegadas)
  const sinSepTexto = textoCombinado.replace(/[\s\-_/.]+/g, '');
  const sinSepTermino = terminoNorm.replace(/[\s\-_/.]+/g, '');
  if (sinSepTermino && sinSepTexto.includes(sinSepTermino)) {
    return true;
  }

  return false;
}
