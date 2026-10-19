/**
 * src/utils/navegacionSesion.ts
 * Devuelve el foco al elemento interactivo primario de la sesión activa
 * garantizando que nunca quede atrapado en el SideBar al cerrar con Tab o Esc.
 */

export const restaurarFocoSesion = (view?: string): boolean => {
  const activeView = view || localStorage.getItem('evicamp_last_view') || 'pos';

  // 1. POS
  if (activeView === 'pos') {
    const b = document.getElementById('buscador-global-pos') as HTMLInputElement | null;
    if (b && b.offsetParent !== null) { b.focus(); b.select(); return true; }
    const btnCobrar = document.getElementById('btn-cobrar-venta') as HTMLElement | null;
    if (btnCobrar && btnCobrar.offsetParent !== null) { btnCobrar.focus(); return true; }
  }

  // 2. FIADOS
  if (activeView === 'fiados') {
    const b = document.getElementById('buscador-global-fiados') as HTMLInputElement | null;
    if (b && b.offsetParent !== null) { b.focus(); b.select(); return true; }
    const btnNuevo = document.getElementById('btn-nuevo-cliente') as HTMLElement | null;
    if (btnNuevo && btnNuevo.offsetParent !== null) { btnNuevo.focus(); return true; }
  }

  // 3. INVENTARIO
  if (activeView === 'inventario') {
    // Pestaña Compras (no tiene buscador): "Nueva lista"
    const compras = document.getElementById('btn-nueva-compra') as HTMLElement | null;
    if (compras && compras.offsetParent !== null) { compras.focus(); return true; }
    const b = document.getElementById('buscador-global-inventario') as HTMLInputElement | null;
    if (b && b.offsetParent !== null) { b.focus(); b.select(); return true; }
    const btnNuevo = document.getElementById('btn-nuevo-producto-inventario') as HTMLElement | null;
    if (btnNuevo && btnNuevo.offsetParent !== null) { btnNuevo.focus(); return true; }
  }

  // 4. MERMAS
  if (activeView === 'mermas') {
    const b = document.getElementById('buscador-global-mermas') as HTMLInputElement | null;
    if (b && b.offsetParent !== null) { b.focus(); b.select(); return true; }
    const btnNueva = document.getElementById('btn-nueva-merma') as HTMLElement | null;
    if (btnNueva && btnNueva.offsetParent !== null) { btnNueva.focus(); return true; }
  }

  // 5. FINANZAS / TESORERÍA
  if (activeView === 'finanzas') {
    // Si la caja está abierta, hay buscador
    const b = document.getElementById('buscador-finanzas') as HTMLInputElement | null;
    if (b && b.offsetParent !== null) { b.focus(); b.select(); return true; }

    // Si la caja está cerrada, enfocar el botón principal APERTURAR CAJA
    const btnAperturar = document.getElementById('btn-aperturar-caja') as HTMLElement | null;
    if (btnAperturar && btnAperturar.offsetParent !== null) { btnAperturar.focus(); return true; }

    // O el botón de ver historial
    const btnHistorial = document.getElementById('btn-ver-historial') as HTMLElement | null;
    if (btnHistorial && btnHistorial.offsetParent !== null) { btnHistorial.focus(); return true; }

    // O los filtros de fecha si está en vista Historial
    const filtroDesde = document.getElementById('filtro-fecha-desde-finanzas') as HTMLInputElement | null;
    if (filtroDesde && filtroDesde.offsetParent !== null) { filtroDesde.focus(); filtroDesde.select(); return true; }
  }

  // 6. UTILIDADES
  if (activeView === 'utilidades') {
    const b = (document.getElementById('buscador-global-utilidades') || document.getElementById('buscador-utilidades')) as HTMLInputElement | null;
    if (b && b.offsetParent !== null) { b.focus(); b.select(); return true; }

    const filtroCat = (document.getElementById('filtro-categoria-utilidades') || document.getElementById('filtro-cat-utilidades')) as HTMLElement | null;
    if (filtroCat && filtroCat.offsetParent !== null) { filtroCat.focus(); return true; }

    const filtroRot = document.getElementById('filtro-rotacion-utilidades') as HTMLElement | null;
    if (filtroRot && filtroRot.offsetParent !== null) { filtroRot.focus(); return true; }

    const filtroFecha = document.getElementById('filtro-fecha-desde-utilidades') as HTMLElement | null;
    if (filtroFecha && filtroFecha.offsetParent !== null) { filtroFecha.focus(); return true; }

    const primeraFila = document.querySelector('#tabla-analisis-productos tr[data-row="true"]') as HTMLElement | null;
    if (primeraFila && primeraFila.offsetParent !== null) { primeraFila.focus(); return true; }
  }

  // 7. PROVEEDORES
  if (activeView === 'proveedores') {
    const b = document.getElementById('buscador-proveedores') as HTMLInputElement | null;
    if (b && b.offsetParent !== null) { b.focus(); b.select(); return true; }
    const btnNuevo = document.getElementById('btn-nuevo-proveedor') as HTMLElement | null;
    if (btnNuevo && btnNuevo.offsetParent !== null) { btnNuevo.focus(); return true; }
  }

  // 8. CONFIGURACIONES / AJUSTES (soporta 'configuracion', 'configuraciones' y 'ajustes')
  if (activeView === 'configuracion' || activeView === 'configuraciones' || activeView === 'ajustes') {
    // Pestaña Empresa
    const inputEmpresa = document.getElementById('input-empresa-nombre') as HTMLInputElement | null;
    if (inputEmpresa && inputEmpresa.offsetParent !== null) { inputEmpresa.focus(); inputEmpresa.select(); return true; }

    // Pestaña Usuarios
    const inputUsuarios = document.getElementById('buscador-usuarios-ajustes') as HTMLInputElement | null;
    if (inputUsuarios && inputUsuarios.offsetParent !== null) { inputUsuarios.focus(); inputUsuarios.select(); return true; }

    const btnCrearUser = document.getElementById('btn-crear-usuario-ajustes') as HTMLElement | null;
    if (btnCrearUser && btnCrearUser.offsetParent !== null) { btnCrearUser.focus(); return true; }

    // Pestaña Apariencia: botón del tema activo o el primer botón de tema
    const temaActivo = localStorage.getItem('gestorpro_theme') || 'classic';
    const btnTema = (document.getElementById(`btn-tema-${temaActivo}`) || document.querySelector('#panel-temas-ajustes button')) as HTMLElement | null;
    if (btnTema && btnTema.offsetParent !== null) { btnTema.focus(); return true; }

    // Pestañas superiores de Ajustes
    const btnTab = (document.getElementById('btn-tab-empresa') || document.getElementById('btn-tab-usuarios') || document.getElementById('btn-tab-apariencia')) as HTMLElement | null;
    if (btnTab && btnTab.offsetParent !== null) { btnTab.focus(); return true; }
  }

  // 9. FALLBACK UNIVERSAL ROBUSTO:
  // Cualquier elemento interactivo visible dentro de la vista principal, NUNCA dentro del sidebar
  const focusables = Array.from(document.querySelectorAll<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
  )).filter(el => {
    if (el.closest('#evicamp-sidebar')) return false;
    if (el.closest('.hidden')) return false;
    return el.offsetParent !== null;
  });

  if (focusables.length > 0) {
    focusables[0].focus();
    if (focusables[0] instanceof HTMLInputElement) focusables[0].select();
    return true;
  }

  return false;
};

export const programarRestauracionFoco = (view?: string) => {
  restaurarFocoSesion(view);
  setTimeout(() => restaurarFocoSesion(view), 20);
  setTimeout(() => restaurarFocoSesion(view), 60);
  setTimeout(() => restaurarFocoSesion(view), 120);
  setTimeout(() => restaurarFocoSesion(view), 220);
};
