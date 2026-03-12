// src/sections/Resumen/components/DashboardResumen.tsx
import React from 'react';
import { 
  LayoutDashboard, DollarSign, TrendingUp, ShoppingCart, 
  Users, Package, Hash, Tags, Trash2, CreditCard, Star 
} from 'lucide-react';
import { TarjetaMetrica } from './TarjetaMetrica';

export const DashboardResumen: React.FC = () => {
    return (
      <div className="flex flex-col h-full bg-[#F8FAFC]">
        {/* HEADER DEL MÓDULO */}
        <div className="bg-white border-b border-[#E2E8F0] p-6 shrink-0 flex justify-between items-center z-10">
          <div>
            <h1 className="text-2xl font-black text-[#1E293B] tracking-tight flex items-center gap-3 uppercase">
              <LayoutDashboard className="text-[#10B981]" size={28} />
              Resumen Operativo
            </h1>
            <p className="text-[#64748B] text-sm mt-1 font-mono">
              Métricas globales y estado actual del sistema.
            </p>
          </div>
          
          {/* Indicador de estado */}
          <div className="hidden md:flex items-center gap-2 border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[#10B981]">
            <span className="w-2 h-2 bg-[#10B981] animate-pulse"></span>
            Sistema En Línea
          </div>
        </div>
  
        {/* ÁREA DE CONTENIDO (DASHBOARD) */}
        <div className="flex-1 overflow-auto p-6 space-y-8 custom-scrollbar">
  
          {/* =========================================
              SUBTÍTULO 1: RESUMEN (FINANCIERO)
          ========================================= */}
          <section>
            <h2 className="text-xs font-black text-[#1E293B] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="w-2 h-4 bg-[#10B981]"></div>
              Resumen
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <TarjetaMetrica 
                titulo="Ventas Brutas" valor="S/ 12,450.00" 
                icono={DollarSign} colorIcono="text-[#10B981]" bgIcono="bg-[#D1FAE5]" 
                tendencia="+15.2%" esPositivo={true} 
              />
              <TarjetaMetrica 
                titulo="Ganancia" valor="S/ 4,230.50" 
                icono={TrendingUp} colorIcono="text-[#0EA5E9]" bgIcono="bg-[#E0F2FE]" 
                tendencia="+8.4%" esPositivo={true} 
              />
              <TarjetaMetrica 
                titulo="Costo Venta" valor="S/ 8,219.50" 
                icono={ShoppingCart} colorIcono="text-[#F59E0B]" bgIcono="bg-[#FEF3C7]" 
              />
              <TarjetaMetrica 
                titulo="Cuentas x Cobrar" valor="S/ 1,850.00" 
                icono={Users} colorIcono="text-red-500" bgIcono="bg-red-100" 
              />
            </div>
          </section>
  
          {/* =========================================
              SUBTÍTULO 2: CONTROL DE INVENTARIO
          ========================================= */}
          <section>
            <h2 className="text-xs font-black text-[#1E293B] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="w-2 h-4 bg-[#3B82F6]"></div>
              Control de Inventario
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <TarjetaMetrica 
                titulo="Valorización (Costo)" valor="S/ 45,200.00" 
                icono={Package} colorIcono="text-[#3B82F6]" bgIcono="bg-[#DBEAFE]" 
              />
              <TarjetaMetrica 
                titulo="Unidades Totales" valor="4,205" 
                icono={Hash} colorIcono="text-[#8B5CF6]" bgIcono="bg-[#EDE9FE]" 
              />
              <TarjetaMetrica 
                titulo="Catálogo Activo" valor="312" 
                icono={Tags} colorIcono="text-[#14B8A6]" bgIcono="bg-[#CCFBF1]" 
              />
              <TarjetaMetrica 
                titulo="Mermas (Valor)" valor="S/ 320.00" 
                icono={Trash2} colorIcono="text-red-500" bgIcono="bg-red-100" 
                tendencia="-2.1%" esPositivo={true} 
              />
            </div>
          </section>
  
          {/* =========================================
              SECCIÓN INFERIOR: TABLAS DE ANÁLISIS
          ========================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            
            {/* TABLA: FLUJO NETO POR MÉTODO */}
            <div className="bg-white border border-[#E2E8F0] shadow-sm flex flex-col">
              <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                 <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-[0.1em] flex items-center gap-2">
                   <CreditCard size={14} className="text-[#10B981]"/> Flujo Neto por Método
                 </h3>
              </div>
              <div className="p-4 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                      <th className="pb-2 font-bold">Método de Pago</th>
                      <th className="pb-2 font-bold text-center">Transacciones</th>
                      <th className="pb-2 font-bold text-right">Monto (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-mono text-[#1E293B]">
                    <tr className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold">Efectivo</td>
                      <td className="py-3 text-center">142</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 4,250.00</td>
                    </tr>
                    <tr className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold">Yape</td>
                      <td className="py-3 text-center">215</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 5,100.00</td>
                    </tr>
                    <tr className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold">Plin</td>
                      <td className="py-3 text-center">98</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 2,100.00</td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold">Tarjeta / POS</td>
                      <td className="py-3 text-center">24</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 1,000.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
  
            {/* TABLA: TOP 5 PRODUCTOS */}
            <div className="bg-white border border-[#E2E8F0] shadow-sm flex flex-col">
              <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                 <h3 className="text-xs font-black text-[#1E293B] uppercase tracking-[0.1em] flex items-center gap-2">
                   <Star size={14} className="text-[#F59E0B]"/> Top 5 Productos (Mensual)
                 </h3>
              </div>
              <div className="p-4 flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                      <th className="pb-2 font-bold">Producto</th>
                      <th className="pb-2 font-bold text-center">Unid. Vendidas</th>
                      <th className="pb-2 font-bold text-right">Ingreso Generado</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-mono text-[#1E293B]">
                    <tr className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold text-xs truncate max-w-[150px]">Cemento Sol 42.5kg</td>
                      <td className="py-3 text-center">450</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 12,600.00</td>
                    </tr>
                    <tr className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold text-xs truncate max-w-[150px]">Fierro Corrugado 1/2"</td>
                      <td className="py-3 text-center">320</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 9,280.00</td>
                    </tr>
                    <tr className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold text-xs truncate max-w-[150px]">Ladrillo King Kong</td>
                      <td className="py-3 text-center">2500</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 1,750.00</td>
                    </tr>
                    <tr className="border-b border-[#E2E8F0]/50 hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold text-xs truncate max-w-[150px]">Pintura CPP Blanco</td>
                      <td className="py-3 text-center">45</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 1,575.00</td>
                    </tr>
                    <tr className="hover:bg-[#F8FAFC]">
                      <td className="py-3 font-bold text-xs truncate max-w-[150px]">Tubo PVC 2" Agua</td>
                      <td className="py-3 text-center">120</td>
                      <td className="py-3 text-right text-[#10B981]">S/ 1,080.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}; 
