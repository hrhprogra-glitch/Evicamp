const path=require('path');const proyecto=process.argv[2];
const { NodeSSH } = require(path.join(proyecto,'node_modules/node-ssh')); const { conexionVps } = require(path.join(proyecto,'ai-scripts/vps.cjs'));
(async()=>{const s=new NodeSSH();await s.connect(conexionVps);
const q=process.argv[3];
const r=await s.execCommand('runuser -u postgres -- psql -At -F "|" -d siuhub',{stdin:q});console.log(r.stdout,r.stderr);s.dispose();})();
