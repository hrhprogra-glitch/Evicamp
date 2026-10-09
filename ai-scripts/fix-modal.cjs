const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/ModalClientes.tsx', 'utf-8');
const lines = code.split('\n');
const index = lines.findIndex(l => l.includes('fiadosDelCliente.map('));
const targetLines = lines.slice(index, index + 16);
const targetStr = targetLines.join('\n');

const newLines = [...targetLines];

// We want to insert product list right before the closing </div> of the item.
// The item closes at index + 14.
const insertIndex = 14;
const productCode = [
  '',
  '                        {/* PRODUCTOS */}',
  '                        {f.detalles && f.detalles.length > 0 && (',
  '                          <div className=\"flex flex-col gap-1 border-t-2 border-dashed border-[var(--color-border)] pt-2 mt-2\">',
  '                            <p className=\"text-xs font-black uppercase text-[var(--color-muted)] mb-1\">Productos Sacados:</p>',
  '                            {f.detalles.map((det, i) => (',
  '                              <div key={i} className=\"flex justify-between text-xs font-bold text-[var(--color-subtle)]\">',
  '                                <span>{det.qty} x {det.name}</span>',
  '                                <span>S/ {Number(det.subtotal).toFixed(2)}</span>',
  '                              </div>',
  '                            ))}',
  '                          </div>',
  '                        )}'
];
newLines.splice(insertIndex, 0, ...productCode);

// Also change the flex div to be flex-col so products appear below the headers
newLines[1] = newLines[1].replace('p-4 flex focus:outline-none', 'p-4 flex flex-col gap-2 focus:outline-none');
// Wrap the header in a flex row
newLines.splice(2, 0, '                        <div className=\"flex justify-between items-center w-full\">');
newLines.splice(13, 0, '                        </div>'); // Close the flex row

code = code.replace(targetStr, newLines.join('\n'));
fs.writeFileSync('src/sections/Fiados/components/ModalClientes.tsx', code);
console.log('Fixed ModalClientes using dynamic target');
