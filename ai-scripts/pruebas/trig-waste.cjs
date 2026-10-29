const path = require('path'); const P = process.argv[2];
const { NodeSSH } = require(path.join(P, 'node_modules/node-ssh')); const { conexionVps } = require(path.join(P, 'ai-scripts/vps.cjs'));
(async () => { const s = new NodeSSH(); await s.connect(conexionVps);
 const q = `select tgname, pg_get_triggerdef(t.oid) from pg_trigger t where tgrelid in ('public.waste'::regclass,'public.batches'::regclass) and not tgisinternal;
 select pg_get_functiondef(p.oid) from pg_proc p where proname in (select p2.proname from pg_trigger t join pg_proc p2 on p2.oid=t.tgfoid where tgrelid='public.waste'::regclass and tgname ilike '%reduce%');`;
 const r = await s.execCommand('runuser -u postgres -- psql -At -d siumax', { stdin: q }); console.log(r.stdout, r.stderr); s.dispose(); })();
