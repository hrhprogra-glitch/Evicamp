const fs = require('fs');

let indexCode = fs.readFileSync('src/sections/Inventario/index.tsx', 'utf-8');

// Eliminar las métricas
const metricsRegex = /\{\/\* Métricas \(Sin Valor Total\) \*\/\}\r?\n?\s*<div className="flex gap-3 lg:gap-4 shrink-0">\r?\n?\s*<TarjetaMetrica label="Total SKUs"[\s\S]*?<\/div>/;
indexCode = indexCode.replace(metricsRegex, '');

// Limpiar el import no usado de TarjetaMetrica
indexCode = indexCode.replace(/import \{ TarjetaMetrica \} from '\.\/components\/TarjetaMetrica';\r?\n?/, '');

fs.writeFileSync('src/sections/Inventario/index.tsx', indexCode);
console.log("Metrics removed!");
