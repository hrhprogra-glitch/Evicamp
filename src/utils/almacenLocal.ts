/**
 * src/utils/almacenLocal.ts
 * Modo sin internet: almacén en el DISCO de la PC (IndexedDB del navegador / programa de PC).
 * Sobrevive a cerrar el programa, reiniciar la PC o un corte de luz. Es por negocio (cada link tiene el suyo).
 *  - "respuestas": copia de cada consulta al servidor, para seguir viendo los datos sin internet
 *  - "pendientes": lo que se hizo sin internet y falta subir (ventas, abonos...) — fases 3 y 4
 */
const NOMBRE_BD = 'siumax-local';
const VERSION_BD = 1;
export const ALMACEN_RESPUESTAS = 'respuestas';
export const ALMACEN_PENDIENTES = 'pendientes';

let abierta: Promise<IDBDatabase> | null = null;

const abrir = () => {
  if (!abierta) {
    abierta = new Promise((resolver, rechazar) => {
      const pedido = indexedDB.open(NOMBRE_BD, VERSION_BD);
      pedido.onupgradeneeded = () => {
        const bd = pedido.result;
        if (!bd.objectStoreNames.contains(ALMACEN_RESPUESTAS)) bd.createObjectStore(ALMACEN_RESPUESTAS);
        if (!bd.objectStoreNames.contains(ALMACEN_PENDIENTES)) bd.createObjectStore(ALMACEN_PENDIENTES, { keyPath: 'id' });
      };
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => { abierta = null; rechazar(pedido.error); };
    });
  }
  return abierta;
};

// Una operación en un almacén; termina cuando quedó escrita en disco (oncomplete)
const operar = async <T>(almacen: string, modo: IDBTransactionMode, accion: (s: IDBObjectStore) => IDBRequest<T> | void) => {
  const bd = await abrir();
  return new Promise<T | undefined>((resolver, rechazar) => {
    const tx = bd.transaction(almacen, modo);
    const pedido = accion(tx.objectStore(almacen));
    tx.oncomplete = () => resolver(pedido ? (pedido as IDBRequest<T>).result : undefined);
    tx.onerror = () => rechazar(tx.error);
    tx.onabort = () => rechazar(tx.error);
  });
};

export const guardarLocal = (almacen: string, valor: unknown, clave?: IDBValidKey) =>
  operar(almacen, 'readwrite', (s) => s.put(valor, clave)).then(() => undefined);

export const leerLocal = <T>(almacen: string, clave: IDBValidKey) =>
  operar<T>(almacen, 'readonly', (s) => s.get(clave) as IDBRequest<T>);

export const leerTodoLocal = <T>(almacen: string) =>
  operar<T[]>(almacen, 'readonly', (s) => s.getAll() as IDBRequest<T[]>).then((r) => r || []);

export const borrarLocal = (almacen: string, clave: IDBValidKey) =>
  operar(almacen, 'readwrite', (s) => s.delete(clave)).then(() => undefined);
