import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 🛡️ EVICAMP: Portal para Centrado Absoluto a prueba de fallos
import { supabase } from '../../../db/supabase';
import { Eye, EyeOff, BarChart3, X, Clock, Receipt, Coins, Smartphone, CreditCard, BookOpen } from 'lucide-react';

interface Props {
  refreshTrigger: number;
}

export const MiniReporteDiario: React.FC<Props> = ({ refreshTrigger }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [totales, setTotales] = useState({
    efectivo: 0, yape: 0, tarjeta: 0, transferencia: 0, fiado: 0, totalReal: 0
  });
  const [ventasHoy, setVentasHoy] = useState<any[]>([]);

  useEffect(() => {
    const fetchHoy = async () => {
      // 🛡️ PARCHE EVICAMP: 1. Consultar a qué hora exacta se abrió la caja actual
      const { data: sesionActiva } = await supabase
        .from('cash_sessions')
        .select('opened_at')
        .eq('status', 'ABIERTA')
        .order('opened_at', { ascending: false })
        .limit(1)
        .single();

      // Si no hay ninguna caja abierta, la pantalla se queda en cero
      if (!sesionActiva) {
        setTotales({ efectivo: 0, yape: 0, tarjeta: 0, transferencia: 0, fiado: 0, totalReal: 0 });
        setVentasHoy([]);
        return;
      }

      // 🛡️ PARCHE EVICAMP: 2. Traer SOLO las ventas ocurridas DESDE que se abrió esta caja
      const { data } = await supabase
        .from('sales')
        .select('id, payment_type, amount_cash, amount_yape, amount_card, amount_transfer, amount_credit, total, created_at')
        .gte('created_at', sesionActiva.opened_at)
        .neq('sunat_status', 'ANULADO')
        .order('created_at', { ascending: false });

      if (data) {
        let ef = 0, ya = 0, ta = 0, tr = 0, fi = 0;
        data.forEach(s => {
          ef += Number(s.amount_cash || 0);
          ya += Number(s.amount_yape || 0);
          ta += Number(s.amount_card || 0);
          tr += Number(s.amount_transfer || 0);
          fi += Number(s.amount_credit || 0);
        });
        const real = ef + ya + ta + tr;
        setTotales({ efectivo: ef, yape: ya, tarjeta: ta, transferencia: tr, fiado: fi, totalReal: real });
        setVentasHoy(data);
      }
    };
    fetchHoy();
  }, [refreshTrigger]);

  // 🛡️ EL PORTAL EVICAMP: Este código arranca el modal de la caja y lo pega en la capa más alta del navegador (Centrado Perfecto)
  const modalContent = isModalOpen ? createPortal(
    <div className="fixed inset-0 bg-[#1E293B]/90 backdrop-blur-md z-[999999] flex items-center justify-center p-4 sm:p-8 animate-fade-in font-mono">
      <div className="bg-white border-4 border-[#1E293B] shadow-[16px_16px_0_0_#1E293B] w-full max-w-6xl flex flex-col h-[90vh] rounded-none">
        
        {/* HEADER DEL MODAL MÁS GRANDE */}
        <div className="bg-[#1E293B] text-white p-6 flex justify-between items-center shrink-0">
          <h2 className="font-black uppercase tracking-widest text-xl flex items-center gap-3">
            <Receipt size={28} className="text-[#10B981]" /> Rendimiento de Caja Actual
          </h2>
          <button onClick={() => setIsModalOpen(false)} className="hover:text-[#EF4444] transition-colors cursor-pointer bg-white/10 p-2 hover:bg-white/20">
            <X size={32} strokeWidth={3} />
          </button>
        </div>

        <div className="p-6 sm:p-8 bg-[#F8FAFC] flex-1 overflow-hidden">
          {/* EL min-h-0 ES EL SECRETO PARA QUE EL SCROLL DE LOS TICKETS FUNCIONE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
            
            {/* COLUMNA IZQUIERDA: TOTALES Y DESGLOSE GIGANTE */}
            <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-4 min-h-0">
              <div className="bg-[#1E293B] p-8 text-center border-4 border-[#1E293B] shrink-0 shadow-[8px_8px_0_0_#CBD5E1]">
                <p className="text-[#94A3B8] text-xs font-black uppercase tracking-widest mb-2">Total Ingresado a Caja (Físico + Digital)</p>
                <p className="text-6xl sm:text-7xl font-black text-white mt-2 drop-shadow-lg">S/ {totales.totalReal.toFixed(2)}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-5 shrink-0">
                <div className="bg-white border-4 border-[#E2E8F0] p-5 flex flex-col items-center text-center shadow-[6px_6px_0_0_#E2E8F0]">
                  <Coins size={32} className="text-[#10B981] mb-2" />
                  <span className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">Efectivo Físico</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#1E293B] mt-1">S/ {totales.efectivo.toFixed(2)}</span>
                </div>
                <div className="bg-white border-4 border-[#E2E8F0] p-5 flex flex-col items-center text-center shadow-[6px_6px_0_0_#E2E8F0]">
                  <Smartphone size={32} className="text-[#8B5CF6] mb-2" />
                  <span className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">Yape / Plin / Transf.</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#1E293B] mt-1">S/ {(totales.yape + totales.transferencia).toFixed(2)}</span>
                </div>
                <div className="bg-white border-4 border-[#E2E8F0] p-5 flex flex-col items-center text-center shadow-[6px_6px_0_0_#E2E8F0]">
                  <CreditCard size={32} className="text-[#3B82F6] mb-2" />
                  <span className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">Tarjeta (POS)</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#1E293B] mt-1">S/ {totales.tarjeta.toFixed(2)}</span>
                </div>
                <div className="bg-white border-4 border-[#E2E8F0] p-5 flex flex-col items-center text-center shadow-[6px_6px_0_0_#E2E8F0]">
                  <BookOpen size={32} className="text-[#EF4444] mb-2" />
                  <span className="text-[10px] font-black text-[#64748B] uppercase tracking-widest">Deuda (Fiados)</span>
                  <span className="text-2xl sm:text-3xl font-black text-[#1E293B] mt-1">S/ {totales.fiado.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: ÚLTIMOS TICKETS (CON SCROLL BLINDADO) */}
            <div className="border-4 border-[#E2E8F0] bg-white flex flex-col h-full min-h-0 shadow-[8px_8px_0_0_#E2E8F0]">
              <div className="bg-[#F8FAFC] border-b-4 border-[#E2E8F0] p-5 shrink-0 flex justify-between items-center">
                <h3 className="text-base font-black text-[#1E293B] uppercase tracking-widest">Desglose de Tickets ({ventasHoy.length})</h3>
              </div>
              {/* 🛡️ min-h-0 es clave aquí para que el scroll lea todos tus tickets infinitamente */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-0">
                {ventasHoy.length > 0 ? ventasHoy.map((v) => (
                  <div key={v.id} className="flex justify-between items-center p-5 border-2 border-[#E2E8F0] hover:border-[#1E293B] bg-white hover:bg-[#F8FAFC] transition-all">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-[#64748B] flex items-center gap-2">
                        <Clock size={16}/> {new Date(v.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-base font-black uppercase mt-2 tracking-widest ${v.payment_type === 'FIADO' ? 'text-[#EF4444]' : 'text-[#1E293B]'}`}>
                        {v.payment_type}
                      </span>
                    </div>
                    <span className="text-2xl font-black text-[#10B981]">S/ {v.total.toFixed(2)}</span>
                  </div>
                )) : (
                  <div className="text-center p-12 text-lg font-bold text-[#94A3B8]">Caja vacía. Aún no hay ventas.</div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  , document.body) : null;

  return (
    <>
      {/* 🛡️ BARRA PRINCIPAL ESTILO EVICAMP (FUERA DEL MODAL) */}
      <div className="bg-white border-2 border-[#1E293B] shadow-[4px_4px_0_0_#E2E8F0] shrink-0 font-mono flex flex-col">
        
        {/* HEADER CON TOTAL Y OJO CENSOR */}
        <div className="bg-[#1E293B] text-white p-3 flex justify-between items-center">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 hover:text-[#10B981] transition-colors cursor-pointer"
            title="Ver Historial del Día"
          >
            <BarChart3 size={18} />
            <span className="text-[11px] font-black uppercase tracking-widest hidden sm:inline">Caja Actual:</span>
            <span className="text-lg font-black text-[#10B981] ml-1">
              {isVisible ? `S/ ${totales.totalReal.toFixed(2)}` : 'S/ ***.**'}
            </span>
          </button>
          <button 
            onClick={() => setIsVisible(!isVisible)}
            className="text-[#94A3B8] hover:text-white transition-colors cursor-pointer px-2"
          >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* SUB-BARRA DE DESGLOSE (Siempre a la vista) */}
        <div className="grid grid-cols-4 divide-x-2 divide-[#E2E8F0] bg-[#F8FAFC]">
          <div className="p-2 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-[#64748B] uppercase mb-1">Efectivo</span>
            <span className="text-xs font-black text-[#1E293B]">{isVisible ? `S/ ${totales.efectivo.toFixed(1)}` : '***'}</span>
          </div>
          <div className="p-2 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-[#8B5CF6] uppercase mb-1">Yape/Plin</span>
            <span className="text-xs font-black text-[#1E293B]">{isVisible ? `S/ ${(totales.yape + totales.transferencia).toFixed(1)}` : '***'}</span>
          </div>
          <div className="p-2 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-[#3B82F6] uppercase mb-1">Tarjeta</span>
            <span className="text-xs font-black text-[#1E293B]">{isVisible ? `S/ ${totales.tarjeta.toFixed(1)}` : '***'}</span>
          </div>
          <div className="p-2 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] font-black text-[#EF4444] uppercase mb-1">Fiados</span>
            <span className="text-xs font-black text-[#1E293B]">{isVisible ? `S/ ${totales.fiado.toFixed(1)}` : '***'}</span>
          </div>
        </div>
      </div>

      {modalContent}
    </>
  );
};