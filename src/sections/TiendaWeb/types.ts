export interface TiendaEmpresaConfig {
  nombre_empresa: string;
  ruc?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  logo_url?: string | null;
  catalogo_activo: boolean;
  catalogo_whatsapp?: string | null;
  catalogo_ocultar_precios: boolean;
  catalogo_mensaje_bienvenida?: string | null;
}

export interface TiendaStore {
  id: number;
  nombre: string;
  codigo?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
}

export interface TiendaVariante {
  id: number;
  nombre_variante: string;
  talla?: string | null;
  color?: string | null;
  barcode?: string | null;
  price: number;
  stock: number;
}

export interface TiendaProducto {
  id: number;
  name: string;
  code?: string | null;
  barcode?: string | null;
  marca?: string | null;
  modelo?: string | null;
  category: string;
  image_url?: string | null;
  price: number;
  precio_mayorista?: number | null;
  unit?: string | null;
  destacado: boolean;
  stock_disponible: number;
  variantes?: TiendaVariante[];
}

export interface ItemCarrito {
  producto: TiendaProducto;
  variante?: TiendaVariante | null;
  cantidad: number;
  precioUnitario: number;
}
