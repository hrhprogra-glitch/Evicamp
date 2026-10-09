const fs = require('fs');

let indexCode = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

const badEffectRegex = /\s*useEffect\(\(\) => \{\r?\n?\s*const handleAbrir = \(e: any\) => \{\r?\n?\s*const nombre = e\.detail;\r?\n?\s*const cliAgrupado = clientesAgrupados\.find\(c => c\.clienteNombre === nombre\);\r?\n?\s*if \(cliAgrupado\) \{\r?\n?\s*setClienteEstadoCuenta\(cliAgrupado\);\r?\n?\s*setIsModalEstadoCuentaOpen\(true\);\r?\n?\s*setIsModalClientesOpen\(false\);\r?\n?\s*\}\r?\n?\s*\};\r?\n?\s*window\.addEventListener\('abrirEstadoCuentaGlobal', handleAbrir\);\r?\n?\s*return \(\) => window\.removeEventListener\('abrirEstadoCuentaGlobal', handleAbrir\);\r?\n?\s*\}, \[clientesAgrupados\]\);/;

if (badEffectRegex.test(indexCode)) {
  const extractedEffect = indexCode.match(badEffectRegex)[0];
  indexCode = indexCode.replace(badEffectRegex, ''); // remove it from the top

  const returnRegex = /\s*return \(\r?\n?\s*<div className="h-full flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">/;
  if (returnRegex.test(indexCode)) {
    indexCode = indexCode.replace(returnRegex, extractedEffect + '\n\n  return (\n      <div className="h-full flex flex-col gap-4 sm:gap-6 p-0 w-full font-mono relative">');
    fs.writeFileSync('src/sections/Fiados/index.tsx', indexCode);
    console.log("Moved useEffect to the correct place!");
  } else {
    console.log("Could not find return block.");
  }
} else {
  console.log("Could not find bad effect.");
}
