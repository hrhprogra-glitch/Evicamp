/**
 * Direcciones legibles (26/11/2026, dueño).
 *
 * La carga migratoria guardó la dirección de varios clientes como texto JSON:
 *   {"zip":"","pais":"","calle":"MZ A LT 9 ...","calle2":"","ciudad":"","estado":"","distrito":""}
 * Si ese texto se copia tal cual al formulario de Salidas, el trabajador ve los corchetes
 * y el detalle de la salida muestra el JSON en vez de la dirección. Aquí se convierte a texto
 * simple (calle, distrito, ciudad...) y se deja intacto lo que ya era texto normal.
 */
export function direccionLegible(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const crudo = typeof valor === 'string' ? valor.trim() : '';
  if (!crudo && typeof valor !== 'object') return '';

  let objeto: any = valor;
  if (crudo.startsWith('{') && crudo.endsWith('}')) {
    try {
      objeto = JSON.parse(crudo);
    } catch {
      return crudo; // texto que solo parece JSON: se muestra como estaba
    }
  }
  if (typeof objeto !== 'object' || objeto === null || Array.isArray(objeto)) {
    return crudo || String(objeto);
  }

  const partes = [
    objeto.calle ?? objeto.street ?? '',
    objeto.calle2 ?? objeto.street2 ?? '',
    objeto.distrito ?? objeto.district ?? '',
    objeto.ciudad ?? objeto.city ?? '',
    objeto.estado ?? objeto.state ?? '',
    objeto.pais ?? objeto.country ?? '',
    objeto.zip ?? objeto.codigo_postal ?? '',
  ]
    .map((p: unknown) => (p === null || p === undefined ? '' : String(p).trim()))
    .filter(Boolean);

  // Un JSON sin ningún dato útil no debe convertirse en un guion suelto.
  return partes.length ? partes.join(', ') : crudo;
}
