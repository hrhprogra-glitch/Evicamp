const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/index.tsx', 'utf-8');

const regex = /\n(\s*){\/\* PANEL MAESTRO DE RECAUDACIÓN \(ESTILO EVICAMP\) \*\/}\r?\n\s*<div className=\"mb-0 bg-\[var\(--color-ink\)\] border border-\[var\(--color-ink\)\] rounded-none p-4 sm:p-6 text-center shadow-none shrink-0\">\r?\n\s*<span className=\"text-\[var\(--color-muted\)\] text-xs sm:text-sm uppercase tracking-widest font-bold\">Gran Total de ESTA Caja<\/span>\r?\n\s*<h1 className=\"text-\[var\(--color-surface\)\] text-3xl sm:text-5xl font-mono font-black mt-2\">\r?\n\s*S\/ \{\(superMetricas\.efectivoEsperadoCaja \+ superMetricas\.yapeEsperado \+ superMetricas\.tarjetaEsperada\)\.toFixed\(2\)\}\r?\n\s*<\/h1>\r?\n\s*<p className=\"text-\[var\(--color-subtle\)\] text-xs mt-2 uppercase\">Incluye Efectivo \(con fondo inicial\), Yape, Transferencias y Tarjetas de ESTE turno<\/p>\r?\n\s*<\/div>\r?\n\r?\n\s*{\/\* SÚPER PANEL DE MÉTRICAS \*\/}\r?\n\s*<div className=\"grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0\">/;

const replacement = `\n$1<div className="flex flex-col xl:flex-row gap-4 sm:gap-6 shrink-0">\n$1  {/* PANEL MAESTRO DE RECAUDACIÓN (ESTILO EVICAMP) */}\n$1  <div className="xl:w-[25%] flex flex-col justify-center items-center bg-[var(--color-ink)] border border-[var(--color-ink)] rounded-none p-4 sm:p-6 text-center shadow-none">\n$1    <span className="text-[var(--color-muted)] text-xs sm:text-[10px] 2xl:text-xs uppercase tracking-widest font-bold">Gran Total de ESTA Caja</span>\n$1    <h1 className="text-[var(--color-surface)] text-3xl sm:text-4xl 2xl:text-5xl font-mono font-black mt-2">\n$1      S/ {(superMetricas.efectivoEsperadoCaja + superMetricas.yapeEsperado + superMetricas.tarjetaEsperada).toFixed(2)}\n$1    </h1>\n$1    <p className="text-[var(--color-subtle)] text-[10px] mt-2 uppercase max-w-[200px] xl:max-w-full">Incluye Efectivo (con fondo inicial), Yape, Transferencias y Tarjetas de ESTE turno</p>\n$1  </div>\n\n$1  {/* SÚPER PANEL DE MÉTRICAS */}\n$1  <div className="xl:w-[75%] grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">`;

content = content.replace(regex, replacement);

const closingRegex = /\n(\s*)<p className=\"text-\[11px\] font-bold text-\[var\(--color-danger\)\] uppercase mt-2 border-t border-\[var\(--color-danger\)\]\/20 pt-2\">Salió del cajón<\/p>\r?\n\s*<\/div>\r?\n\s*<\/div>/;

const closingReplacement = `\n$1<p className="text-[11px] font-bold text-[var(--color-danger)] uppercase mt-2 border-t border-[var(--color-danger)]/20 pt-2">Salió del cajón</p>\n$1  </div>\n$1</div>\n$1</div>`;

content = content.replace(closingRegex, closingReplacement);

fs.writeFileSync('src/sections/Finanzas/index.tsx', content);
console.log('Layout updated.');
