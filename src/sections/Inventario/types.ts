export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  quantity: number;
  minStock: number;
  code: string;
  barcode: string;
  category: string;
  unit: string;
  imageUrl?: string | null;
  control_type?: string;
  vencimiento?: string | null; // el más cercano de sus lotes con stock (filtros Vencidos / Vencen en 30 días)
}
