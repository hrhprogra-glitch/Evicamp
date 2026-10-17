import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Modo sin internet: al terminar la compilación, el service worker (dist/sw.js) recibe la lista de
// TODOS los archivos del sistema y un número de versión. Así guarda una copia completa en la PC y,
// cuando sale una versión nueva, la cambia sola (y borra la vieja).
const copiaSinInternet = (): Plugin => ({
  name: 'siumax-copia-sin-internet',
  apply: 'build',
  closeBundle() {
    const dist = join(process.cwd(), 'dist')
    const archivos: string[] = []
    const recorrer = (carpeta: string) => {
      for (const nombre of readdirSync(carpeta)) {
        const ruta = join(carpeta, nombre)
        if (statSync(ruta).isDirectory()) recorrer(ruta)
        else archivos.push('/' + relative(dist, ruta).split('\\').join('/'))
      }
    }
    recorrer(dist)
    const delSistema = archivos.filter((a) => a !== '/sw.js' && !a.startsWith('/descargas/') && !a.startsWith('/actualizaciones/')).sort()
    const huella = createHash('sha256')
    for (const a of delSistema) huella.update(a).update(readFileSync(join(dist, a)))
    const version = huella.digest('hex').slice(0, 12)
    const sw = join(dist, 'sw.js')
    writeFileSync(sw, readFileSync(sw, 'utf8')
      .replace("'__VERSION__'", JSON.stringify(version))
      .replace('[/*__ARCHIVOS__*/]', JSON.stringify(['/', ...delSistema])))
  },
})

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    copiaSinInternet(),
  ],
})
