// src/sections/Salidas/empresa.ts
// Datos de la empresa para el comprobante de salida (hoja, ticket, PDF y WhatsApp).
// Igual que en Compras: se leen de Ajustes > Datos de la empresa y se guarda una copia para funcionar sin internet.
import { useEffect, useState } from 'react';
import { supabase } from '../../db/supabase';
import logoSiumax from '../../assets/logo.png';

export interface EmpresaComprobante {
  nombre: string;
  ruc: string;
  direccion: string;
  telefono: string;
  logo: string;
}

const CLAVE = 'siumax_nego_empresa_comprobante';
const POR_DEFECTO: EmpresaComprobante = {
  nombre: 'ECO SISTEMAS URH',
  ruc: '',
  direccion: '',
  telefono: '',
  logo: logoSiumax,
};

const leerCopia = (): EmpresaComprobante => {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (guardado && (guardado.nombre || guardado.logo)) return { ...POR_DEFECTO, ...guardado };
  } catch { /* sin almacenamiento: se usa el logo del sistema */ }
  return POR_DEFECTO;
};

/** Datos de la empresa con copia local: si no hay internet, sigue saliendo el logo y el nombre. */
export const useEmpresaComprobante = (): EmpresaComprobante => {
  const [empresa, setEmpresa] = useState<EmpresaComprobante>(leerCopia);

  useEffect(() => {
    let vivo = true;
    // Solo las columnas que existen en empresa_config (en PanelCompras se usan estas mismas).
    const cargar = async () => {
      const { data } = await supabase.from('empresa_config').select('nombre_empresa, telefono, logo_url').limit(1).maybeSingle();
      if (!vivo || !data) return;
      const next: EmpresaComprobante = {
        nombre: String(data.nombre_empresa || POR_DEFECTO.nombre),
        ruc: POR_DEFECTO.ruc,
        direccion: POR_DEFECTO.direccion,
        telefono: String(data.telefono || ''),
        logo: String(data.logo_url || '') || logoSiumax,
      };
      setEmpresa(next);
      try { localStorage.setItem(CLAVE, JSON.stringify(next)); } catch { /* solo por esta vez */ }
    };
    void cargar().catch(() => { /* sin internet: se mantiene la copia */ });
    return () => { vivo = false; };
  }, []);

  return empresa;
};
