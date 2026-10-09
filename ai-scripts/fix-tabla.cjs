const fs = require('fs');
let code = fs.readFileSync('src/sections/Fiados/components/TablaFiadosAgrupados.tsx', 'utf-8');

const target1 = `                <tr key={i}
                  {...clicConTeclado(() => onView(cli))}
                  className="hover:bg-[var(--color-surface)] transition-colors focus:outline-none focus:bg-[var(--color-accent-bg)] cursor-pointer"`;

const repl1 = `                <tr key={i}
                  {...clicConTeclado(() => onView(cli))}
                  onClick={() => onView(cli)}
                  className="hover:bg-[var(--color-surface)] transition-colors focus:outline-none focus:bg-[var(--color-accent-bg)] cursor-pointer"`;

const target2 = `<button className="p-2 border-2 border-[var(--color-ink)] bg-[var(--color-bg)] hover:bg-[var(--color-ink)] hover:text-white transition-all cursor-pointer inline-flex shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">`;
const repl2 = `<button onClick={(e) => { e.stopPropagation(); onView(cli); }} className="p-2 border-2 border-[var(--color-ink)] bg-[var(--color-bg)] hover:bg-[var(--color-ink)] hover:text-white transition-all cursor-pointer inline-flex shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-1 hover:translate-y-1">`;

code = code.replace(target1, repl1);
code = code.replace(target2, repl2);

fs.writeFileSync('src/sections/Fiados/components/TablaFiadosAgrupados.tsx', code);
console.log('Fixed TablaFiadosAgrupados');
