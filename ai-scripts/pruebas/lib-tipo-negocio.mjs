// 17/11/2026: las pruebas cambian el tipo de negocio para ver menús y pestañas; al terminar DEBEN devolver
// la elección del dueño (por ejemplo solo Servicios). Antes forzaban Comercio y el dueño veía cómo se cambiaba
// solo al entrar. Guarda el valor al empezar y lo restaura al terminar, pase lo que pase en la prueba.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(path.join(aqui, 'x.js'));
const { NodeSSH } = req('node-ssh');
const { conexionVps } = req('../vps.cjs');

const sqlTipo = async (q) => {
  const s = new NodeSSH();
  await s.connect(conexionVps);
  const r = await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siumax', { stdin: q });
  s.dispose();
  if (r.stderr && /ERROR/.test(r.stderr)) throw new Error(r.stderr);
  return r.stdout.trim();
};

export const tipoInicial = () => sqlTipo('select tipos_negocio from empresa_config limit 1');
export const tipoActual = () => sqlTipo('select tipos_negocio from empresa_config limit 1');
export const restaurarTipo = (valor) => sqlTipo(`update empresa_config set tipos_negocio = '${valor}'`);
