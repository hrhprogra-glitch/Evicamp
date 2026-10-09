const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

// 1. Remove auto-select
code = code.replace(
  /const pendingIds = cliente\.fiados\.filter\(f => f\.saldoPendiente > 0\)\.map\(f => f\.id\);\s*setSelectedIds\(new Set\(pendingIds\)\);\s*const total = cliente\.fiados\.filter\(f => f\.saldoPendiente > 0\)\.reduce\(\(acc, f\) => acc \+ f\.saldoPendiente, 0\);\s*setEfectivo\(total\.toFixed\(2\)\);/,
  `setSelectedIds(new Set());
        setEfectivo('');`
);

// 2. Make whole card clickable
code = code.replace(
  /className=\{\`bg-white border-2 p-4 flex flex-col gap-2 relative transition-all \$\{selectedIds\.has\(fiado\.id\) \? 'border-\[var\(--color-accent\)\] shadow-\[4px_4px_0_0_var\(--color-accent\)\] bg-\[var\(--color-accent-bg\)\]' : 'border-\[var\(--color-border\)\] hover:border-\[var\(--color-ink\)\]'\}\`\}/g,
  `onClick={() => handleToggleSelect(fiado.id)} className={\`cursor-pointer bg-white border-2 p-4 flex flex-col gap-2 relative transition-all \${selectedIds.has(fiado.id) ? 'border-[var(--color-accent)] shadow-[4px_4px_0_0_var(--color-accent)] bg-[var(--color-accent-bg)]' : 'border-[var(--color-border)] hover:border-[var(--color-ink)]'}\`}`
);

// Stop propagation on edit inputs
code = code.replace(
  /<div className="flex items-center gap-1">/g,
  '<div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>'
);
code = code.replace(
  /<button onClick=\{\(\) => \{ setFechaEditId\(fiado\.id\);/g,
  '<button onClick={(e) => { e.stopPropagation(); setFechaEditId(fiado.id);'
);

// 3. Add global details to right panel
const targetPanel = `<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md">S/ {cliente.totalPendiente.toFixed(2)}</h1>`;
const newPanel = `<h1 className="text-5xl font-black text-[var(--color-danger)] drop-shadow-md mb-4">S/ {cliente.totalPendiente.toFixed(2)}</h1>
                <div className="flex flex-col gap-2 text-xs font-black uppercase tracking-widest">
                  <div className="flex justify-between text-[var(--color-ink)] opacity-70 border-b border-[var(--color-ink)]/20 pb-1">
                    <span>Deuda Original Histórica</span>
                    <span>S/ {cliente.totalOriginal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[var(--color-success)] border-b border-[var(--color-success)]/20 pb-1">
                    <span>Total Abonado (Global)</span>
                    <span>S/ {cliente.totalPagado.toFixed(2)}</span>
                  </div>
                </div>`;
code = code.replace(targetPanel, newPanel);

fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', code);
console.log('Fixed auto-select, clickability, and global totals');
