const fs = require('fs');
let content = fs.readFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', 'utf-8');

const startString = '<div className="flex gap-2 border-b-2 border-[var(--color-ink)] mb-4 shrink-0">';

const startIndex = content.indexOf(startString);
const endOfBlock = content.indexOf('<div className="p-4 bg-[var(--color-bg)] border-t-2 border-[var(--color-ink)]">');

if (startIndex !== -1 && endOfBlock !== -1) {
    const toReplace = content.substring(startIndex, endOfBlock);
    content = content.replace(toReplace, `              <div className="flex-1 overflow-auto bg-white min-h-0 custom-scrollbar">
                <TablaMovimientos 
                  movimientos={unificados} 
                  onDelete={onDelete ? handleDeleteInterno : undefined as any}
                  onAnularTicket={onAnular ? handleAnularInterno : undefined as any}
                  onVerTicket={() => {}}
                  idsAnulando={idsProcesando}
                />
              </div>

            `);
    fs.writeFileSync('src/sections/Finanzas/components/ModalDetalleCaja.tsx', content);
    console.log('Fixed Tabs View.');
} else {
    console.log('startString or endOfBlock not found');
}
