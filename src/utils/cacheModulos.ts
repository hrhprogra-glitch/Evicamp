import type { Product } from '../sections/Inventario/types';
import type { Fiado, Cliente, GrupoClientes } from '../sections/Clientes/types';
import type { Merma } from '../sections/Conteos/types';
import type { CashSession, UnifiedItem, SuperMetricas } from '../sections/Finanzas/types';
import type { AnalisisProducto } from '../sections/Utilidades/types';
import type { Proveedor } from '../sections/Proveedores/types';

// ==========================================
// 🚀 CACHÉ CENTRAL DE MÓDULOS EN MEMORIA
// Permite navegación instantánea (0 ms) entre
// sesiones sin pantallas de carga ni bloqueos.
// ==========================================

export interface CacheInventario {
  products: Product[];
  dbCategories: string[];
}

export let cacheInventarioMemoria: CacheInventario | null = null;
export const setCacheInventario = (data: { products: Product[]; dbCategories?: string[] }) => {
  cacheInventarioMemoria = {
    products: data.products,
    dbCategories: data.dbCategories || cacheInventarioMemoria?.dbCategories || [],
  };
};

export interface CacheClientes {
  fiados: Fiado[];
  clientes: Cliente[];
  grupos: GrupoClientes[];
  productos: Product[];
}

export let cacheClientesMemoria: CacheClientes | null = null;
export const setCacheClientes = (data: CacheClientes) => {
  cacheClientesMemoria = data;
};

export interface CacheConteos {
  mermas: Merma[];
  products: Product[];
}

export let cacheConteosMemoria: CacheConteos | null = null;
export const setCacheConteos = (data: CacheConteos) => {
  cacheConteosMemoria = data;
};

export interface CacheFinanzas {
  sessionActiva: CashSession | null;
  movimientos: UnifiedItem[];
  superMetricas: SuperMetricas | null;
}

export let cacheFinanzasMemoria: CacheFinanzas | null = null;
export const setCacheFinanzas = (data: CacheFinanzas) => {
  cacheFinanzasMemoria = data;
};

export interface CacheUtilidades {
  fechaInicio: string;
  fechaFin: string;
  gastos: number;
  ingresoTotal: number;
  analisis: AnalisisProducto[];
}

export let cacheUtilidadesMemoria: CacheUtilidades | null = null;
export const setCacheUtilidades = (data: CacheUtilidades) => {
  cacheUtilidadesMemoria = data;
};

export interface CacheProveedores {
  proveedores: Proveedor[];
  products: Product[];
}

export let cacheProveedoresMemoria: CacheProveedores | null = null;
export const setCacheProveedores = (data: CacheProveedores) => {
  cacheProveedoresMemoria = data;
};
