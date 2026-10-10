const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

// Fix chunk 0
content = content.replace(
  '<div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar flex flex-col gap-4">',
  '<div className="flex-1 overflow-hidden flex flex-col">\n<div className="p-4 sm:p-6 pb-4 flex flex-col gap-4 shrink-0 overflow-y-auto max-h-[40vh] custom-scrollbar">'
);

// Fix chunk 1
content = content.replace(
  '<div className="p-3 sm:p-4 bg-[var(--color-bg)] border-b-2 border-[var(--color-ink)] flex flex-col sm:flex-row gap-3 shrink-0">',
  '</div>\n<div className="px-4 sm:px-6 pb-4 shrink-0">\n<div className="p-3 sm:p-4 bg-[var(--color-bg)] border-2 border-[var(--color-ink)] flex flex-wrap gap-3">'
);

// Let's fix the select inputs to have flex-1 min-w-[140px]
content = content.replace(/className="px-3 py-2\.5 text-xs font-black uppercase tracking-widest border-2 border-\[var\(--color-ink\)\] focus:outline-none cursor-pointer bg-white min-w-\[140px\]"/g, 'className="px-3 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-[var(--color-ink)] focus:outline-none cursor-pointer bg-white flex-1 min-w-[140px]"');

// The search input wrapper flex-1
content = content.replace('<div className="relative flex-1">', '<div className="relative flex-1 min-w-[200px]">');

fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
console.log('Fixed ModalDetalleCaja');
