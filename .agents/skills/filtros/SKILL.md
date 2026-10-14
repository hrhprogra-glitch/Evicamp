---
name: filtros
description: Patrón estándar de navegación por teclado para filtros (select) y botones (como nuevo cliente) en Evicamp.
---

# Navegación Espacial de Filtros y Botones

Esta habilidad define el estándar de comportamiento para elementos `<select>` (filtros) y botones de acción superior (como "Nuevo Cliente" o "Limpiar Filtros") cuando se navegan exclusivamente con teclado en el proyecto Evicamp.

## 1. El Problema a Evitar
Los elementos `<select>` nativos suelen atrapar al usuario en un "bucle" cuando usan las flechas Arriba/Abajo, impidiendo que el usuario pueda saltar libremente hacia la tabla de datos que está debajo o los botones que están arriba.

## 2. La Solución (Patrón Evicamp)
- Las flechas **Arriba ⬆️ y Abajo ⬇️** actúan PÚRAMENTE como vehículos espaciales para "saltar" fuera del elemento, **sin modificar su valor**.
- Para cambiar la selección del filtro, el usuario presiona **Enter** (despliega nativamente), usa Arriba/Abajo dentro del menú nativo, y presiona **Enter** para confirmar.

## 3. Implementación en Código

Para aplicar este patrón a cualquier `<select>`:

1. **Evitar que cambie el valor al saltar:** Todo salto debe llevar `e.preventDefault(); e.stopPropagation();`.
2. **Definir explícitamente el destino del salto:**

```tsx
<select 
  id="filtro-ejemplo"
  value={valorFiltro} 
  onChange={(e) => setValorFiltro(e.target.value)}
  onKeyDown={(e) => {
    // Salto hacia arriba (ej. a un botón Volver o "X")
    if (e.key === "ArrowUp") { 
      e.preventDefault(); 
      e.stopPropagation(); 
      document.getElementById("btn-cerrar")?.focus(); 
    }
    // Salto hacia abajo (ej. a la tabla o grid)
    if (e.key === "ArrowDown") { 
      e.preventDefault(); 
      e.stopPropagation(); 
      (document.querySelector('tr[role="button"]') as HTMLElement)?.focus(); 
    }
    // Navegación horizontal a otros filtros
    if (e.key === "ArrowRight") { 
      e.preventDefault(); 
      e.stopPropagation(); 
      document.getElementById("siguiente-filtro")?.focus(); 
    }
    if (e.key === "ArrowLeft") { 
      e.preventDefault(); 
      e.stopPropagation(); 
      document.getElementById("buscador")?.focus(); 
    }
  }}
  className="w-full border-2 border-[var(--color-border)] px-4 py-3 text-xs font-black uppercase text-[var(--color-ink)] outline-none cursor-pointer bg-white rounded-none"
>
  <option value="OPCION_1">Opción 1</option>
  <option value="OPCION_2">Opción 2</option>
</select>
```

## 4. Patrón para Botones Superior (ej. "Nuevo Cliente")

Los botones en la barra de herramientas que se intersecan con los filtros deben tener la misma filosofía de saltos rígidos, normalmente implementada en el listener global (`handleGlobalKeyDown`) o con su propio `onKeyDown`.

**Mecánica base para el botón Nuevo Cliente:**
- **Flecha Izquierda:** Va al último filtro (o al botón Limpiar Filtros si está visible).
- **Flecha Abajo:** Cae directo al primer elemento de la tabla de resultados.

```tsx
} else if (active?.id === "btn-nuevo-cliente") {
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    const btnLimpiar = document.getElementById("btn-limpiar-filtros");
    if (btnLimpiar) btnLimpiar.focus(); 
    else document.getElementById("filtro-anterior")?.focus();
    return;
  }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    const firstRow = document.querySelector('tr[role="button"]') as HTMLElement;
    if (firstRow) firstRow.focus();
    return;
  }
}
```

## 5. Patrón para Calendarios / Inputs de Fecha (`<input type="date">`)

Cuando se interactúa con un filtro o input de calendario con teclado:
1. **Apertura con Enter o Espacio o Clic:**
   Al enfocar el input y presionar Enter o Espacio (o hacer clic), se debe abrir el selector nativo invocando `showPicker()`.
2. **Selección y Retorno de Foco:**
   Al elegir la fecha y presionar Enter (evento `change`), el selector se cierra y el foco **debe regresar de inmediato a la selección del calendario** (`input.focus()`), permitiendo que el usuario continúe navegando fluidamente con las flechas espaciales (<kbd>←</kbd>, <kbd>→</kbd>, <kbd>↓</kbd>, <kbd>↑</kbd>).
3. **Protección con `lastChangeRef`:**
   Para evitar que el Enter de confirmación en el selector nativo vuelva a reabrir el calendario en bucle, se usa una marca de tiempo (`lastChangeRef`). Si el cambio ocurrió hace menos de 500ms, Enter solo mantiene/devuelve el foco en el input sin llamar a `showPicker()`.

```tsx
const lastDateChangeRef = useRef(0);

<input 
  id="filtro-fecha"
  type="date"
  value={filtroFecha}
  onChange={(e) => {
    lastDateChangeRef.current = Date.now();
    setFiltroFecha(e.target.value);
    setTimeout(() => {
      document.getElementById('filtro-fecha')?.focus();
    }, 50);
  }}
  onClick={(e) => {
    try { (e.currentTarget as HTMLInputElement).showPicker?.(); } catch {}
  }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      if (Date.now() - lastDateChangeRef.current < 500) {
        e.currentTarget.focus();
        return;
      }
      try {
        (e.currentTarget as HTMLInputElement).showPicker?.();
      } catch {}
      return;
    }
    // Navegación espacial con flechas
    if (e.key === 'ArrowUp') { e.preventDefault(); document.getElementById('btn-arriba')?.focus(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); focusPrimerRegistro(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); document.getElementById('filtro-anterior')?.focus(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); document.getElementById('siguiente-elemento')?.focus(); }
  }}
/>
```

*Este documento sirve como referencia de base. Asegúrate de activarlo o leerlo cuando el usuario solicite implementar los "filtros" o te diga que te bases en lo que se hizo con `/filtros`.*

