// src/sections/Conteos/motivos.ts
// Motivos de la sección Conteos: los usa la ventana "Nuevo ajuste" (components/ModalAjuste.tsx)
// y la de corregir un conteo (components/ModalEditarConteo.tsx).
export const MOTIVOS_FALTA = ['ROBO', 'PÉRDIDA', 'DAÑADO', 'VENCIDO', 'ERROR DE CONTEO', 'ERROR DE INGRESO', 'USO INTERNO', 'OTRO'];
export const MOTIVOS_SOBRA = ['NO INGRESADO', 'ERROR DE INGRESO', 'ERROR DE CONTEO', 'DEVOLUCIÓN', 'OTRO'];
// "Salió del stock": los mismos motivos de un faltante, menos los errores de conteo o de ingreso
export const MOTIVOS_SALIDA = MOTIVOS_FALTA.filter((m) => !m.startsWith('ERROR'));
