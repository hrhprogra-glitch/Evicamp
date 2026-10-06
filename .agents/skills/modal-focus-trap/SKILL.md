---
name: modal-focus-trap
description: Patrón estándar para crear una jaula de foco (Focus Trap) en modales de Evicamp y prevenir que la tecla Tab escape y active atajos globales (como el SideBar).
---

# Modal Focus Trap (Jaula de Foco)

## Contexto
En Evicamp, el archivo `App.tsx` tiene un atajo global que intercepta la tecla `Tab` en toda la aplicación para abrir o cerrar el SideBar. 
Si un modal flotante no detiene la propagación del `Tab` (`e.stopPropagation()`), el evento sube hasta la ventana principal y el SideBar se abre detrás del modal, causando un error visual.
Además, sin un ciclo cerrado, el cursor puede escapar del modal perdiendo el foco.

## Patrón de Implementación

Cada vez que crees o revises un Modal flotante (ej. ModalProducto, ModalCliente, ModalFiado), debes inyectar este bloque al inicio de la lógica del teclado:

```tsx
    const handleFormKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement;

      // ================= FOCUS TRAP PARA TAB =================
      if (e.key === 'Tab') {
        // 1. DETENER PROPAGACIÓN (Evita que App.tsx abra el Sidebar)
        e.stopPropagation(); 
        
        // 2. ENCONTRAR ELEMENTOS DEL MODAL
        const allFocusables = Array.from(document.querySelectorAll('input:not([type="file"]), select, button:not([disabled])')) as HTMLElement[];
        const modalFocusables = allFocusables.filter(el => 
          el.closest('.fixed.inset-0.z-50') && // Filtro estricto al contenedor del modal
          el.tabIndex !== -1 && 
          !el.classList.contains('hidden') &&
          el.offsetParent !== null
        );

        // 3. CREAR EL CICLO INFINITO
        if (modalFocusables.length > 0) {
          const first = modalFocusables[0];
          const last = modalFocusables[modalFocusables.length - 1];
          
          if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus(); // Shift+Tab en el primero -> salta al último
          } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus(); // Tab en el último -> salta al primero
          }
        }
        return; // Salir para no activar lógica extra
      }
      // =======================================================
```

## Importante: Fase de Captura
Para que esto funcione con máxima prioridad, el Event Listener DEBE declararse en la fase de captura (`{ capture: true }`):

```tsx
  useEffect(() => {
    // ...
    window.addEventListener('keydown', handleFormKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleFormKeyDown, { capture: true });
  }, [isOpen]); // Dependencias según el componente
```
