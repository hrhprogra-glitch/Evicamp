const fs = require('fs');

let modalEC = fs.readFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', 'utf-8');

const abonoRegex = /<span style=\{\{ marginLeft: '8px', backgroundColor: '#22c55e', color: 'white', border: '1px solid #16a34a', padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0\.1em', fontWeight: '900', fontSize: '10px', borderRadius: '4px' \}\}>/g;

const replaceWith = `<span className="ml-2 bg-[var(--color-success)] text-white border-2 border-[var(--color-ink)] shadow-[2px_2px_0_0_var(--color-ink)] px-2 py-0.5 uppercase tracking-widest font-black text-xs">`;

if (abonoRegex.test(modalEC)) {
  modalEC = modalEC.replace(abonoRegex, replaceWith);
  fs.writeFileSync('src/sections/Fiados/components/ModalEstadoCuenta.tsx', modalEC);
  console.log("Updated Abonos badge to be neobrutalist and bigger!");
} else {
  console.log("Could not find the inline style for Abonos");
}
