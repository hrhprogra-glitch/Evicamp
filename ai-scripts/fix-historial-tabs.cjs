const fs = require('fs');
let content = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');

const regex1 = /<div key=\{cli\.id\} \{\.\.\.clicConTeclado\(\(\) => \{ setClienteActivo\(cli\); setView\('HISTORIAL'\); \}\)\} className=\"p-3 sm:p-4 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 sm:gap-0 hover:bg-\[var\(--color-bg\)\] focus:bg-\[var\(--color-bg\)\] focus:outline-none focus:ring-2 focus:ring-\[var\(--color-ink\)\] transition-colors group\">/g;
content = content.replace(regex1, `<div key={cli.id} {...clicConTeclado(() => { setClienteActivo(cli); setView('HISTORIAL'); setHistorialTab('PAGADAS'); })} className="p-3 sm:p-4 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 sm:gap-0 hover:bg-[var(--color-bg)] focus:bg-[var(--color-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] transition-colors group">`);

const regex2 = /<button onClick=\{\(e\) => \{ e\.stopPropagation\(\); setClienteActivo\(cli\); setView\('HISTORIAL'\); \}\} className=\"px-4 py-2 bg-\[var\(--color-bg\)\] text-\[var\(--color-info\)\] border-2 border-\[var\(--color-info\)\] text-\[12px\] font-black uppercase hover:bg-\[var\(--color-info\)\] hover:text-white transition-colors cursor-pointer ml-2\">/g;
content = content.replace(regex2, `<button onClick={(e) => { e.stopPropagation(); setClienteActivo(cli); setView('HISTORIAL'); setHistorialTab('PAGADAS'); }} className="px-4 py-2 bg-[var(--color-bg)] text-[var(--color-info)] border-2 border-[var(--color-info)] text-[12px] font-black uppercase hover:bg-[var(--color-info)] hover:text-white transition-colors cursor-pointer ml-2">`);

fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', content);
