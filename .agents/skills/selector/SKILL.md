---
name: selector
description: Patrón estándar de navegación por teclado (Selector de Grilla) para tablas y listas de datos en Evicamp.
---

# Patrón "Selector" de Tablas (Grid Navigation)

Esta habilidad define cómo debe funcionar el "Selector" (navegación por teclado) dentro de las tablas de datos (como la tabla de clientes, fiados o productos) en Evicamp.

## 1. El Objetivo
Permitir al usuario navegar fluidamente por las filas de una tabla usando las flechas de teclado, y saltar horizontalmente hacia los botones de acción dentro de la misma fila, creando una experiencia parecida a un Excel o un selector de listas.

## 2. Requisitos Previos
Cada fila de la tabla DEBE ser interactiva, normalmente implementada a través de `clicConTeclado` (que añade `role="button"` y `tabIndex={0}`).

## 3. Implementación en Código (handleGlobalKeyDown)
Para habilitar el selector, se debe implementar un listener de `keydown` global (`handleGlobalKeyDown`) en el componente contenedor (o la propia tabla).

### Lógica del Selector de Filas:

```tsx
if (active?.closest('div[role="button"]') || active?.closest('tr[role="button"]')) {
  // Ajustar el selector según si la tabla usa <tr> o <div>
  const rowSelector = 'div[role="button"]'; // Cambiar a 'tr[role="button"]' según corresponda
  
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const currentRow = active.closest(rowSelector) as HTMLElement;
    const rows = Array.from(document.querySelectorAll(rowSelector)) as HTMLElement[];
    const rowIndex = rows.indexOf(currentRow);
    
    if (e.key === 'ArrowDown') {
      // Bajar a la siguiente fila
      const nextRow = rows[rowIndex + 1];
      if (nextRow) nextRow.focus();
    } 
    else if (e.key === 'ArrowUp') {
      // Subir a la fila anterior. Si estamos en la primera, salir de la tabla (ej. al buscador)
      const prevRow = rows[rowIndex - 1];
      if (prevRow) {
        prevRow.focus();
      } else {
        document.getElementById('buscador-global')?.focus(); // Ajustar ID destino
      }
    } 
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      // Navegación horizontal DENTRO de la fila (hacia botones de acción como Editar, Eliminar)
      const focusables = [currentRow, ...Array.from(currentRow.querySelectorAll('button:not([disabled])'))] as HTMLElement[];
      const focusIndex = focusables.indexOf(active as HTMLElement);
      
      if (e.key === 'ArrowRight') {
        const nextTarget = focusables[focusIndex + 1];
        if (nextTarget) nextTarget.focus();
      } else if (e.key === 'ArrowLeft') {
        const prevTarget = focusables[focusIndex - 1];
        if (prevTarget) prevTarget.focus();
      }
    }
  }
}
```

## 4. Puntos Importantes
- Siempre comprobar si hay modales abiertos (`document.querySelector('[role="dialog"]')`) y abortar la navegación de fondo si es así.
- Siempre adaptar el `rowSelector` al HTML utilizado (algunas tablas usan `<tr>` y otras usan `<div className="grid...">`).
- La Flecha Arriba en la Fila 0 DEBE saltar de regreso a la interfaz superior (ej. buscador o filtros).

### Auto-Focus Magnet (El punto de partida)
Para que el usuario pueda empezar a navegar inmediatamente al entrar a la sesión, se debe implementar un "magnet" que auto-enfoque el buscador global si no hay nada más enfocado:

```tsx
// Dentro del mismo useEffect
const enforceFocus = () => {
  if (document.querySelector('[role="dialog"]')) return;
  const activeTag = document.activeElement?.tagName;
  // Si el usuario estÃ¡ enfocado en algo interactivo, no lo secuestramos (excepto el body/void)
  if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "BUTTON" || activeTag === "A" || activeTag === "SELECT") return;

  document.getElementById("buscador-global")?.focus(); // Ajustar ID destino
};

const forceMountFocus = () => {
  if (!document.querySelector('[role="dialog"]')) {
     document.getElementById("buscador-global")?.focus();
  }
};

const handleGlobalClick = () => setTimeout(enforceFocus, 50);
const handleWindowFocus = () => setTimeout(enforceFocus, 50);

window.addEventListener("focus", handleWindowFocus);
document.addEventListener("click", handleGlobalClick);

// Forzar el foco cuando la vista se monta por primera vez
setTimeout(forceMountFocus, 100);

// Asegurarse de limpiar los listeners en el cleanup:
// window.removeEventListener('focus', handleWindowFocus);
```


