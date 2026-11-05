// Estilo "SiuMax Sobrio" para las ventanas flotantes (pedido del dueño 04/11/2026, modelo: detalle de producto en Utilidades).
// En cada ventana agrega las piezas compartidas de src/index.css SIN tocar su teclado ni su lógica:
//   marco → ventana-sobria (sin sombra) · cabecera → ventana-cabecera (clara; el color pasa al cuadrito del ícono con --icono)
//   título → ventana-cabecera__titulo · X → ventana-cerrar
// Uso: node ai-scripts/estilo-ventanas.cjs [--aplicar] [archivo…]   (sin --aplicar solo muestra lo que encontró)
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const APLICAR = process.argv.includes('--aplicar');
const pedidos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const EXCLUIR = ['layout/SideBar.tsx', 'sections/TiendaWeb/'];   // menú del celular y Tienda Web pública

const todos = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => d.isDirectory() ? todos(path.join(dir, d.name)) : d.name.endsWith('.tsx') ? [path.join(dir, d.name)] : []);
const archivos = (pedidos.length ? pedidos.map((p) => path.resolve(RAIZ, p)) : todos(path.join(RAIZ, 'src')))
  .filter((f) => !EXCLUIR.some((x) => f.replace(/\\/g, '/').includes(x)));

const SOMBRA = /\s*(?:sm:|lg:|md:)?shadow-\[(?:8|6|10|12|16)px_(?:8|6|10|12|16)px_0_0_var\(--color-ink\)\]/g;
const conClase = (linea, clase) => linea.includes(clase) ? linea : linea.replace(/className=(["`{])/, (m) => m + (m.endsWith('{') ? '' : '') ).replace(/className="/, `className="${clase} `).replace(/className=\{`/, `className={\`${clase} `);
const colorIcono = (linea) => {
  const m = linea.match(/bg-\[var\(--color-([a-z-]+)\)\]/);
  if (!m) return null;
  const c = m[1];
  if (['ink', 'accent', 'surface', 'bg', 'bg-2'].includes(c)) return 'var(--color-accent-shadow)';
  return `var(--color-${c.replace(/-dark$/, '')})`;
};

let total = 0;
for (const f of archivos) {
  const o = fs.readFileSync(f, 'utf8');
  if (!o.includes('fixed inset-0')) continue;
  const crlf = o.includes('\r\n');
  const L = o.replace(/\r\n/g, '\n').split('\n');
  const rel = path.relative(RAIZ, f).replace(/\\/g, '/');
  const informe = [];
  for (let i = 0; i < L.length; i++) {
    if (!L[i].includes('fixed inset-0')) continue;
    // Marco: la primera línea siguiente con un "max-w-" (el recuadro de la ventana)
    let m = -1;
    for (let j = i; j < Math.min(i + 12, L.length); j++) if (/className=.*max-w-/.test(L[j]) && /border-(2|4)\b|border-\[/.test(L[j])) { m = j; break; }
    if (m < 0) { informe.push(`  ? fixed inset-0 en ${i + 1}: no encontré el marco`); continue; }
    // Cabecera: el primer div con justify-between en las 8 líneas siguientes
    let c = -1;
    for (let j = m + 1; j < Math.min(m + 9, L.length); j++) if (/<div[^>]*className=.*justify-between/.test(L[j])) { c = j; break; }
    // Título: el primer h2/h3 después de la cabecera
    let t = -1;
    if (c >= 0) for (let j = c + 1; j < Math.min(c + 14, L.length); j++) if (/<h[23][\s>]/.test(L[j])) { t = j; break; }
    // X: el primer <X dentro de un botón, después de la cabecera
    let x = -1;
    if (c >= 0) for (let j = c + 1; j < Math.min(c + 45, L.length); j++) if (/<X\b/.test(L[j])) { for (let k = j; k > c; k--) if (/<button/.test(L[k])) { x = k; break; } break; }
    // className del botón de la X puede estar unas líneas más abajo
    let xc = -1;
    if (x >= 0) for (let k = x; k < Math.min(x + 20, L.length); k++) if (/className=/.test(L[k])) { xc = k; break; }
    const icono = c >= 0 ? colorIcono(L[c]) : null;
    informe.push(`  marco ${m + 1}${c >= 0 ? ` · cabecera ${c + 1} (ícono ${icono || 'verde'})` : ' · SIN cabecera'}${t >= 0 ? ` · título ${t + 1}` : ''}${xc >= 0 ? ` · X ${xc + 1}` : ''}`);
    if (APLICAR) {
      L[m] = conClase(L[m].replace(SOMBRA, ''), 'ventana-sobria');
      if (c >= 0) {
        L[c] = conClase(L[c], 'ventana-cabecera');
        if (icono && !L[c].includes('--icono')) L[c] = L[c].replace(/<div /, `<div style={{ '--icono': '${icono}' } as React.CSSProperties} `);
      }
      if (t >= 0) L[t] = conClase(L[t], 'ventana-cabecera__titulo');
      if (xc >= 0) L[xc] = conClase(L[xc], 'ventana-cerrar');
    }
    total++;
  }
  if (informe.length) {
    console.log(rel);
    console.log(informe.join('\n'));
    if (APLICAR) fs.writeFileSync(f, crlf ? L.join('\n').replace(/\n/g, '\r\n') : L.join('\n'));
  }
}
console.log(`\n${total} ventanas ${APLICAR ? 'actualizadas' : 'encontradas (solo revisión; usa --aplicar)'}`);
