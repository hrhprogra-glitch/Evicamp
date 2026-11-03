export interface Store {
  id: number;
  nombre: string;
  codigo?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  es_almacen_principal?: boolean;
  activo?: boolean;
  created_at?: string;
}

export interface StoreTransferItem {
  id?: number;
  transfer_id?: number;
  product_id: number;
  product_name: string;
  variant_id?: number | null;
  variant_name?: string | null;
  cantidad: number;
  cost_price?: number;
}

export interface StoreTransfer {
  id: number;
  codigo: string;
  origen_store_id: number;
  destino_store_id: number;
  estado: 'EN_TRANSITO' | 'RECIBIDO' | 'ANULADO';
  creado_por?: string | null;
  recibido_por?: string | null;
  fecha_envio: string;
  fecha_recepcion?: string | null;
  notas?: string | null;
  origen_nombre?: string;
  destino_nombre?: string;
  items?: StoreTransferItem[];
}
