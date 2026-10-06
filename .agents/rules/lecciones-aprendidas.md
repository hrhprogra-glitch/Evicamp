# Memoria de Errores y Aciertos (Lecciones Aprendidas)

Este archivo actúa como un registro de memoria para Antigravity para evitar repetir errores arquitectónicos en Evicamp, y mantener los aciertos que hacen que el sistema funcione a la perfección.

## ❌ Errores a NO REPETIR (Lo que hicimos mal)

1. **Permitir que la tecla `Tab` burbujee en los Modales (Fuga de Foco):**
   - **El Error:** Se nos olvidó que `App.tsx` tiene un atajo global que escucha la tecla `Tab` para abrir el SideBar. Al no detener la propagación del evento dentro de los modales, el usuario terminaba abriendo el menú lateral por accidente al navegar rápido por los formularios.
   - **La Solución (No olvidar):** Todo modal **debe** tener un Focus Trap estricto con `e.stopPropagation()` implementado en el EventListener durante la fase de *captura* (`{ capture: true }`). Consulta la skill `modal-focus-trap`.

2. **Bloquear la navegación vertical indiscriminadamente:**
   - **El Error:** Al intentar evitar que la flecha `Arriba` saltara accidentalmente de las opciones a la "X", bloqueamos TODAS las teclas verticales en el Paso 1 de algunos modales. Esto provocó que, si el usuario estaba en la "X", ya no pudiera bajar de regreso al contenido con la flecha `Abajo`.
   - **La Solución:** Las condiciones de bloqueo deben incluir excepciones específicas para botones clave (como `btn-cerrar-modal`). Ej: `if (e.key === 'ArrowDown' && active.id === 'btn-cerrar-modal') { bajarALaPrimeraTarjeta() }`.

3. **Confiar en `document.activeElement.placeholder` sin validación de Tipos (TypeScript):**
   - **El Error:** Acceder directamente a `active.placeholder` cuando `active` es casteado como genérico `HTMLElement`. Esto rompe la compilación porque TS sabe que no todos los elementos HTML tienen placeholder.
   - **La Solución:** Usar siempre `active?.getAttribute('placeholder')` que es 100% seguro contra fallas de tipos.

## ✅ Aciertos y Patrones de Oro (Lo que hicimos bien)

1. **Selector Magnético de Evicamp (Auto-Focus):**
   - **La Victoria:** Hemos logrado que cada vez que el usuario entra a una sección o abre un modal, el buscador o el input principal se auto-enfoque al instante, permitiendo el uso de lectores de códigos de barras (escáneres) sin tener que usar el mouse.
   - **Mandato:** Todo componente nuevo con buscador DEBE implementar este patrón magnético.

2. **Navegación 100% por Teclado (Patrones de Grid y Listas):**
   - **La Victoria:** Hemos diseñado navegaciones con Flechas (`ArrowUp`, `ArrowDown`, `ArrowRight`, `ArrowLeft`) que se sienten como un sistema de punto de venta premium.
   - **Mandato:** Todo grid de productos, lista de fiados, o historial debe poder recorrerse sin tocar el ratón. Consulta las skills `selector` y `filtros`.

3. **Arquitectura Neobrutalista y Minimalista:**
   - **La Victoria:** La eliminación de redundancias (como quitar el botón inferior de "Cerrar Detalles" cuando ya existe una "X" arriba) hace que la interfaz de Evicamp sea más limpia y directa.
   - **Mandato:** Menos es más. Bordes gruesos, contrastes altos, y no duplicar botones de escape a menos que el scroll sea muy largo.

### Navegaci�n con Flechas en Inputs Nativos
- **Problema:** En React, cuando se implementa navegaci�n personalizada con flechas (ArrowUp, ArrowDown) mediante keydown, inputs como <input type="number"> o <input type="date"> interceptan las flechas nativamente para incrementar/decrementar sus valores.
- **Soluci�n:** Si se desea que las flechas sirvan estrictamente para navegar entre elementos (como en ModalAbono.tsx o ModalFiado.tsx), se debe usar e.preventDefault() para anular el incremento nativo. Para inputs de fecha, se puede interceptar la tecla Enter y usar ctive.showPicker() para abrir el calendario nativo y no perder usabilidad.
