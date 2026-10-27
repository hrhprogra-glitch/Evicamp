// Solo lectura: ejecuta una consulta en la base indicada (siuhub = pruebas, postgres = Evicamp) dentro de una transacción de solo lectura
const path=require('path');const [proyecto, base, q]=process.argv.slice(2);
const { NodeSSH } = require(path.join(proyecto,'node_modules/node-ssh')); const { conexionVps } = require(path.join(proyecto,'ai-scripts/vps.cjs'));
(async()=>{const s=new NodeSSH();await s.connect(conexionVps);
const r=await s.execCommand(`runuser -u postgres -- psql -At -F "|" -d ${base}`,{stdin:'BEGIN READ ONLY;\n'+q+'\nROLLBACK;'});console.log(r.stdout,r.stderr);s.dispose();})();
