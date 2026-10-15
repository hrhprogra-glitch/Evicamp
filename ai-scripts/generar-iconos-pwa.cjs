// Genera los íconos PNG de la app instalable (PWA) sin dependencias: una "S" de bloques
// en el estilo cuadrado del sistema (fondo tinta, letra verde acento).
// Uso: node ai-scripts/generar-iconos-pwa.cjs  -> escribe en public/icons/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const TINTA = [0x1e, 0x29, 0x3b];
const ACENTO = [0x10, 0xb9, 0x81];

// "S" en una grilla de 5x7 bloques
const LETRA_S = [
  '.####',
  '#....',
  '#....',
  '.###.',
  '....#',
  '....#',
  '####.',
];

// CRC32 para los bloques del PNG
const TABLA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = TABLA_CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bloque = (tipo, datos) => {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
};

// zona: fracción del lado que ocupa la letra (los íconos "maskable" necesitan más margen)
const generar = (lado, zona) => {
  const celda = Math.floor((lado * zona) / LETRA_S.length);
  const ancho = celda * LETRA_S[0].length;
  const alto = celda * LETRA_S.length;
  const x0 = Math.floor((lado - ancho) / 2);
  const y0 = Math.floor((lado - alto) / 2);

  const filas = Buffer.alloc(lado * (lado * 3 + 1));
  for (let y = 0; y < lado; y++) {
    const inicio = y * (lado * 3 + 1);
    filas[inicio] = 0; // filtro "ninguno"
    for (let x = 0; x < lado; x++) {
      const fx = Math.floor((x - x0) / celda);
      const fy = Math.floor((y - y0) / celda);
      const dentro = x >= x0 && y >= y0 && fy < LETRA_S.length && fx < LETRA_S[0].length;
      const color = dentro && LETRA_S[fy][fx] === '#' ? ACENTO : TINTA;
      color.forEach((v, i) => { filas[inicio + 1 + x * 3 + i] = v; });
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloque('IHDR', ihdr),
    bloque('IDAT', zlib.deflateSync(filas, { level: 9 })),
    bloque('IEND', Buffer.alloc(0)),
  ]);
};

const destino = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(destino, { recursive: true });
const iconos = [
  ['icon-192.png', 192, 0.62],
  ['icon-512.png', 512, 0.62],
  ['icon-maskable-512.png', 512, 0.45],
  ['apple-touch-icon.png', 180, 0.62],
  ['favicon-32.png', 32, 0.75],
];
for (const [nombre, lado, zona] of iconos) {
  fs.writeFileSync(path.join(destino, nombre), generar(lado, zona));
  console.log('creado', nombre);
}
