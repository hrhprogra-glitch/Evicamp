const fs = require('fs');

let code = fs.readFileSync('src/sections/Fiados/index.tsx', 'utf-8');

const regex = /const handleSaveCliente = async \(cli: Omit<Cliente, 'id'>\) => \{\r?\n?\s*const nuevoId = Date\.now\(\)\.toString\(\);\s*\r?\n?\s*\/\/ Guardar en Supabase\r?\n?\s*const \{ error \} = await supabase\.from\('customers'\)\.insert\(\[\{\r?\n?\s*id: nuevoId,\r?\n?\s*name: cli\.nombre,\r?\n?\s*dni: cli\.dni,\r?\n?\s*created_at: new Date\(\)\.toISOString\(\),\r?\n?\s*is_synced: '1'\r?\n?\s*\}\]\);\r?\n?\s*if \(error\) return alert\('Error al guardar cliente: ' \+ error\.message\);\r?\n?\s*setClientes\(\[\.\.\.clientes, \{ \.\.\.cli, id: nuevoId \}\]\);\r?\n?\s*\};/;

const replacement = `const handleSaveCliente = async (cli: Omit<Cliente, 'id'>) => {
      // Dejamos que Supabase asigne el ID (generalmente autoincremental)
      const { data, error } = await supabase.from('customers').insert([{
        name: cli.nombre,
        dni: cli.dni,
        phone: cli.telefono || '', // <-- Añadido soporte para teléfono si existe
        created_at: new Date().toISOString(),
        is_synced: '1'
      }]).select().single();
  
      if (error) return alert('Error al guardar cliente: ' + error.message);
      
      // Actualizamos el estado con el ID real que nos dio la base de datos
      setClientes([...clientes, { ...cli, id: data.id.toString() }]);
    };`;

if (regex.test(code)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/sections/Fiados/index.tsx', code);
  console.log("Fixed handleSaveCliente!");
} else {
  console.log("Regex not found. Let's try a simpler one.");
}
