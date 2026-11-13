// Supabase devuelve como máximo 1000 filas por consulta (aunque se pida .limit(15000)).
// traerTodo pide la consulta por bloques de 1000 hasta completarla, así las pantallas
// nunca quedan incompletas cuando una tabla crece (productos, ventas, lotes, clientes...).
//
// Uso: const { data, error } = await traerTodo(() => supabase.from('products').select('*').order('id'));
// La consulta debe tener un .order() estable (por ejemplo 'id') para que los bloques no se crucen.
//
// Más rápido (13/11/2026, dueño: "cuando entro demora mucho en cargar", Evicamp): el primer bloque se pide solo (casi
// todas las consultas caben en uno); si viene lleno, los siguientes se piden de a 4 AL MISMO TIEMPO en vez de uno detrás
// de otro. Ej.: 5.120 lotes = 3 esperas en vez de 6. El resultado es el mismo y en el mismo orden.

const TAMANO_BLOQUE = 1000;
const EN_PARALELO = 4;

interface ConsultaPaginable<T> {
  range: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>;
}

export async function traerTodo<T = any>(consulta: () => ConsultaPaginable<T>): Promise<{ data: T[] | null; error: any }> {
  const primero = await consulta().range(0, TAMANO_BLOQUE - 1);
  if (primero.error) return { data: null, error: primero.error };
  const todo: T[] = [...(primero.data || [])];
  if (!primero.data || primero.data.length < TAMANO_BLOQUE) return { data: todo, error: null };

  for (let desde = TAMANO_BLOQUE; ; desde += TAMANO_BLOQUE * EN_PARALELO) {
    const bloques = await Promise.all(
      Array.from({ length: EN_PARALELO }, (_, i) => {
        const ini = desde + i * TAMANO_BLOQUE;
        return consulta().range(ini, ini + TAMANO_BLOQUE - 1);
      }),
    );
    for (const b of bloques) {
      if (b.error) return { data: null, error: b.error };
      todo.push(...(b.data || []));
    }
    // Se termina cuando algún bloque vino incompleto (los que siguen a ese vienen vacíos)
    if (bloques.some((b) => !b.data || b.data.length < TAMANO_BLOQUE)) break;
  }
  return { data: todo, error: null };
}
