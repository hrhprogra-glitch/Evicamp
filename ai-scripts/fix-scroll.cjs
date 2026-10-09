const fs = require('fs');
let indexCode = fs.readFileSync('src/sections/Inventario/index.tsx', 'utf-8');

const regex = /<div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 lg:gap-6 w-full xl:w-auto\s*overflow-x-auto custom-scrollbar pb-2 xl:pb-0">/;
const replaceWith = `<div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 lg:gap-6 w-full xl:w-auto pb-1 pr-1">`;

indexCode = indexCode.replace(regex, replaceWith);

fs.writeFileSync('src/sections/Inventario/index.tsx', indexCode);
console.log("Removed overflow-x-auto to fix scrollbar issue!");
