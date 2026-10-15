// Puente seguro entre el sistema (página web) y la app de escritorio.
// La página solo ve estas funciones, nunca Node ni el sistema de archivos.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('siuhubEscritorio', {
  version: '1.0.0',
  imprimir: (html, titulo) => ipcRenderer.invoke('imprimir', { html, titulo }),
  reintentar: () => ipcRenderer.invoke('reintentar'),
});
