import React, { useState, useEffect } from 'react';
import { X, Save,  Building2 } from 'lucide-react';
import type { Proveedor } from '../types';
import { useCerrarConEscape } from '../../../utils/useCerrarConEscape';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (proveedor: Partial<Proveedor>) => void;
  proveedorAEditar?: Proveedor | null;
  proveedoresExistentes?: Proveedor[]; // <-- NUEVA PROP DE SEGURIDAD
}

export const ModalProveedor: React.FC<Props> = ({ isOpen, onClose, onSave, proveedorAEditar, proveedoresExistentes = [] }) => {
  useCerrarConEscape(isOpen, onClose); // Escape (o "Atrás" del control de TV) cierra la ventana
  const [formData, setFormData] = useState<Partial<Proveedor>>({
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    telefono: '',
    email: '',
    direccion: '',
    estado: 'ACTIVO'
  });

  const MODAL_ELEMENT_IDS = [
    'btn-cerrar-modal-proveedor',
    'input-ruc-proveedor',
    'select-estado-proveedor',
    'input-razon-proveedor',
    'input-nombre-comercial-proveedor',
    'input-telefono-proveedor',
    'input-email-proveedor',
    'input-direccion-proveedor',
    'btn-cancelar-proveedor',
    'btn-guardar-proveedor'
  ];

  // Focus Trap y Navegación Espacial para ModalProveedor
  useEffect(() => {
    if (!isOpen) return;

    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      // ================= TAB CYCLE DETERMINÍSTICO =================
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        
        const focusables = MODAL_ELEMENT_IDS
          .map(id => document.getElementById(id))
          .filter((el): el is HTMLElement => Boolean(el && el.offsetParent !== null && !el.hasAttribute('disabled')));

        if (focusables.length > 0) {
          const currentIndex = focusables.indexOf(active);
          if (e.shiftKey) {
            const prevIndex = currentIndex <= 0 ? focusables.length - 1 : currentIndex - 1;
            focusables[prevIndex]?.focus();
          } else {
            const nextIndex = currentIndex === -1 || currentIndex >= focusables.length - 1 ? 0 : currentIndex + 1;
            focusables[nextIndex]?.focus();
          }
        }
        return;
      }

      // ================= NAVEGACIÓN DIRECCIONAL ENTRE CAMPOS =================
      if (active?.id === 'btn-cerrar-modal-proveedor') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          document.getElementById('input-ruc-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'input-ruc-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('btn-cerrar-modal-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          document.getElementById('select-estado-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-razon-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'select-estado-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('btn-cerrar-modal-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          document.getElementById('input-ruc-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-razon-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'input-razon-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-ruc-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-nombre-comercial-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'input-nombre-comercial-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-razon-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-telefono-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'input-telefono-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-nombre-comercial-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          document.getElementById('input-email-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-direccion-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'input-email-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-nombre-comercial-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          document.getElementById('input-telefono-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('input-direccion-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'input-direccion-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-telefono-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('btn-guardar-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'btn-cancelar-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-direccion-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          document.getElementById('btn-guardar-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('btn-cerrar-modal-proveedor')?.focus();
          return;
        }
      }

      if (active?.id === 'btn-guardar-proveedor') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          document.getElementById('input-direccion-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          document.getElementById('btn-cancelar-proveedor')?.focus();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          document.getElementById('btn-cerrar-modal-proveedor')?.focus();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleFormKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleFormKeyDown, { capture: true });
  }, [isOpen]);

  // Auto-focus en el primer campo al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const inputRuc = document.getElementById('input-ruc-proveedor');
        inputRuc?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Efecto para cargar datos si estamos en MODO EDICIÓN
  useEffect(() => {
    if (isOpen) {
      if (proveedorAEditar) {
        setFormData(proveedorAEditar);
      } else {
        // MODO NUEVO
        setFormData({
          ruc: '',
          razon_social: '',
          nombre_comercial: '',
          telefono: '',
          email: '',
          direccion: '',
          estado: 'ACTIVO'
        });
      }
    }
  }, [isOpen, proveedorAEditar]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const rucLimpio = formData.ruc?.trim() || '';
    const razonLimpia = formData.razon_social?.trim().toUpperCase() || '';

    if (!rucLimpio || !razonLimpia) {
      alert('Por favor, ingresa al menos el RUC y la Razón Social.');
      return;
    }

    // === VALIDACIÓN DE INTEGRIDAD: EVITAR DUPLICADOS ===
    const isDuplicate = proveedoresExistentes.some(p => {
      // Si estamos editando y es el mismo ID, ignorar la colisión consigo mismo
      if (proveedorAEditar && p.id === proveedorAEditar.id) return false;

      const mismoRUC = rucLimpio !== '' && p.ruc === rucLimpio;
      const mismaRazon = p.razon_social.toUpperCase() === razonLimpia;

      return mismoRUC || mismaRazon;
    });

    if (isDuplicate) {
      alert('⚠️ Error de Integridad: Ya existe un proveedor registrado con este mismo RUC o Razón Social.');
      return; // Bloquea el guardado
    }

    onSave({
      ...formData,
      ruc: rucLimpio,
      razon_social: razonLimpia
    });
  };

  return (
    <div id="modal-proveedor-container" className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4 font-mono">
      <div className="bg-white w-full max-w-2xl border-2 border-[var(--color-ink)] shadow-[8px_8px_0_0_var(--color-ink)] flex flex-col max-h-[calc(var(--alto-pantalla)*0.94)] sm:max-h-[calc(var(--alto-pantalla)*0.9)]">
        
        {/* HEADER */}
        <div className="bg-[var(--color-ink)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-[var(--color-info)]" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-info)]">
                {proveedorAEditar ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <p className="text-[12px] font-bold opacity-80 uppercase tracking-widest">
                Datos de la empresa o distribuidor
              </p>
            </div>
          </div>
          <button 
            id="btn-cerrar-modal-proveedor"
            type="button"
            onClick={onClose} 
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                document.getElementById('input-ruc-proveedor')?.focus();
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
              }
            }}
            className="text-white hover:bg-[var(--color-danger)] hover:text-white focus:bg-[var(--color-danger)] focus:text-white focus:outline-none focus:ring-2 focus:ring-white p-1.5 transition-colors cursor-pointer border border-transparent focus:border-white rounded-none"
            title="Cerrar ventana (Escape)"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORMULARIO */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-[var(--color-bg)] flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <div className="space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">RUC / DNI *</label>
              <input 
                id="input-ruc-proveedor"
                autoComplete="off" 
                type="text"
                maxLength={11}
                placeholder="Ej: 20123456789"
                value={formData.ruc}
                onChange={(e) => setFormData({...formData, ruc: e.target.value.replace(/\D/g, '')})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('input-razon-proveedor')?.focus();
                  }
                }}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info)] focus:bg-[#EFF6FF] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">Estado</label>
              <select 
                id="select-estado-proveedor"
                value={formData.estado}
                onChange={(e) => setFormData({...formData, estado: e.target.value as 'ACTIVO' | 'INACTIVO'})}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    document.getElementById('btn-cerrar-modal-proveedor')?.focus();
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    document.getElementById('input-razon-proveedor')?.focus();
                  }
                }}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info)] focus:bg-[#EFF6FF] transition-colors cursor-pointer"
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">Razón Social *</label>
              <input 
                id="input-razon-proveedor"
                autoComplete="off" 
                type="text"
                placeholder="Ej: DISTRIBUIDORA DE ALIMENTOS S.A.C."
                value={formData.razon_social}
                onChange={(e) => setFormData({...formData, razon_social: e.target.value.toUpperCase()})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('input-nombre-comercial-proveedor')?.focus();
                  }
                }}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info)] focus:bg-[#EFF6FF] transition-colors"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">Nombre Comercial (Opcional)</label>
              <input 
                id="input-nombre-comercial-proveedor"
                autoComplete="off" 
                type="text"
                placeholder="Ej: DISTRIBUCIONES PERÚ"
                value={formData.nombre_comercial}
                onChange={(e) => setFormData({...formData, nombre_comercial: e.target.value.toUpperCase()})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('input-telefono-proveedor')?.focus();
                  }
                }}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info)] focus:bg-[#EFF6FF] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">Teléfono / Celular</label>
              <input 
                id="input-telefono-proveedor"
                autoComplete="off" 
                type="text"
                placeholder="Ej: 987654321"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('input-email-proveedor')?.focus();
                  }
                }}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info)] focus:bg-[#EFF6FF] transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">Correo Electrónico</label>
              <input 
                id="input-email-proveedor"
                autoComplete="off" 
                type="text"
                inputMode="email"
                placeholder="contacto@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value.toLowerCase()})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('input-direccion-proveedor')?.focus();
                  }
                }}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] outline-none focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info)] focus:bg-[#EFF6FF] transition-colors"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[12px] font-black text-[var(--color-ink)] uppercase tracking-widest">Dirección de la empresa</label>
              <input 
                id="input-direccion-proveedor"
                autoComplete="off" 
                type="text"
                placeholder="Av. Principal 123, Distrito..."
                value={formData.direccion}
                onChange={(e) => setFormData({...formData, direccion: e.target.value.toUpperCase()})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    document.getElementById('btn-guardar-proveedor')?.focus();
                  }
                }}
                className="w-full bg-white border-2 border-[var(--color-border)] p-3 text-xs font-black text-[var(--color-ink)] uppercase outline-none focus:border-[var(--color-info)] focus:ring-2 focus:ring-[var(--color-info)] focus:bg-[#EFF6FF] transition-colors"
              />
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div className="w-full p-6 bg-white border-t-2 border-[var(--color-border)] flex justify-end gap-3 shrink-0">
          <button 
            id="btn-cancelar-proveedor"
            type="button"
            onClick={onClose}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                document.getElementById('btn-guardar-proveedor')?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('input-direccion-proveedor')?.focus();
              }
            }}
            className="px-6 py-3 border-2 border-[var(--color-border)] text-[var(--color-muted)] font-black text-[12px] uppercase tracking-widest hover:bg-[var(--color-bg)] hover:border-[var(--color-ink)] hover:text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-bg)] focus:text-[var(--color-ink)] transition-all cursor-pointer rounded-none"
          >
            Cancelar
          </button>
          <button 
            id="btn-guardar-proveedor"
            type="button"
            onClick={handleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                document.getElementById('btn-cancelar-proveedor')?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                document.getElementById('input-direccion-proveedor')?.focus();
              }
            }}
            className="bg-[var(--color-info)] text-white px-6 py-3 border-2 border-[var(--color-ink)] font-black text-[12px] uppercase tracking-widest flex items-center gap-2 hover:bg-[var(--color-ink)] hover:text-[var(--color-info)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)] focus:bg-[var(--color-ink)] focus:text-[var(--color-info)] transition-all cursor-pointer rounded-none shadow-[4px_4px_0_0_var(--color-ink)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]"
          >
            <Save size={16} /> Guardar Proveedor
          </button>
        </div>

      </div>
    </div>
  );
};