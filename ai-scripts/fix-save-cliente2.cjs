const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

const regex = /phone: cli\.telefono \|\| '', \/\/ <-- Añadido soporte para teléfono si existe\r?\n?\s*/;

if (regex.test(code)) {
  code = code.replace(regex, '');
  fs.writeFileSync('src/sections/Fiados/index.tsx', code);
  console.log("Removed phone to avoid DB schema errors");
} else {
  console.log("Regex not found.");
}
