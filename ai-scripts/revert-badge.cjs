const fs = require('fs');

let modalEC = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const regex = /<span className="ml-2 bg-\[var\(--color-success\)\] text-white border-2 border-\[var\(--color-ink\)\] shadow-\[2px_2px_0_0_var\(--color-ink\)\] px-2 py-0\.5 uppercase tracking-widest font-black text-xs">/g;

const replaceWith = `<span style={{ marginLeft: '8px', backgroundColor: '#22c55e', color: 'white', border: '1px solid #16a34a', padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '900', fontSize: '11px', borderRadius: '4px' }}>`;

if (regex.test(modalEC)) {
  modalEC = modalEC.replace(regex, replaceWith);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', modalEC);
  console.log("Reverted to green inline style with slight size bump!");
} else {
  console.log("Could not find the neobrutalist span to revert");
}
